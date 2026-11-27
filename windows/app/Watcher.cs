using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using UIA = Interop.UIAutomationClient;

namespace FreeCorrector
{
    // Follows the focused text field of any application through Windows'
    // native UI Automation (the accessibility interface screen readers use),
    // on its own thread: UI Automation must not run on the thread of our
    // windows. Publishes the marks to draw, in screen pixels.
    sealed class Watcher
    {
        const int MaxChars = 20000;
        const int MaxMarks = 80;
        const int TextPatternId = 10014, ValuePatternId = 10002, IsTextPatternAvailableId = 30040, ClassNameId = 30012;
        const int EditType = 50004, DocumentType = 50030;
        const string FinalPunctRule = "FC_FINAL_PUNCT";
        // Browsers and Thunderbird have the extension; terminals, the shell and
        // code editors are not prose.
        static readonly HashSet<string> Skipped = new(StringComparer.OrdinalIgnoreCase)
        {
            "msedge", "chrome", "firefox", "brave", "opera", "vivaldi", "thunderbird",
            "Code", "devenv", "WindowsTerminal", "cmd", "conhost", "powershell", "pwsh",
            "explorer", "SearchApp", "SearchUI", "SearchHost", "StartMenuExperienceHost", "ShellExperienceHost",
            "FreeCorrector",
        };

        readonly Func<string, Task<List<Match>?>> check;
        readonly Action<List<Mark>> publish;
        readonly ConcurrentQueue<Action> jobs = new();
        readonly Dictionary<int, string> processNames = new();
        readonly int ownPid = Environment.ProcessId;
        readonly object gate = new();
        volatile bool running = true;
        public volatile bool Enabled = true;

        UIA.IUIAutomation uia = null!;
        UIA.IUIAutomationElement? element;
        IField? field;
        volatile string? text;
        // The text of the field, as last read (the report page needs the sentence).
        public string? Text => text;
        DateTime changedAt;
        string? asked;
        bool fresh;
        // Where the last edit ended in the text (-1: none seen yet).
        int editEnd = -1;
        (string Text, List<Match> Found)? answer;
        List<Match> matches = new();
        List<IAnchor?> anchors = new();
        string? lastSignature = "";

        // `check` runs the engines on a normalized text (it is called from this
        // thread and may complete on any thread).
        public Watcher(Func<string, Task<List<Match>?>> check, Action<List<Mark>> publish)
        {
            this.check = check;
            this.publish = publish;
        }

        public void Start()
        {
            var thread = new Thread(Loop) { IsBackground = true, Name = "watcher" };
            thread.SetApartmentState(ApartmentState.MTA);
            thread.Start();
        }

        public void Stop() => running = false;

        public void Replace(Match match, string replacement) => jobs.Enqueue(() => DoReplace(match, replacement));

        public void Ignore(Match match) => jobs.Enqueue(() => Remove(match));

        // After a settings change (dictionary, rules, picky mode).
        public void Recheck() => jobs.Enqueue(() => { fresh = false; asked = null; changedAt = DateTime.MinValue; });

        void Loop()
        {
            uia = new UIA.CUIAutomation();
            while (running)
            {
                Thread.Sleep(150);
                try
                {
                    while (jobs.TryDequeue(out var job)) job();
                    if (Enabled) Tick();
                    else if (element != null) Reset(null);
                }
                catch (COMException e) { Log.Write("UIA: " + e.Message); Reset(null); }
                catch (Exception e) { Log.Write("watcher: " + e); Reset(null); }
            }
        }

        void Reset(UIA.IUIAutomationElement? el)
        {
            element = el;
            field = null;
            text = null;
            asked = null;
            fresh = false;
            editEnd = -1;
            matches = new();
            anchors = new();
            Publish(new());
        }

        // WinUI 3 applications with a WebView2 (WhatsApp): UI Automation's focus
        // stops at the XAML island's pane; the page, with the field, is a window
        // of its own, of the msedgewebview2 process, over that pane. The field
        // is the element of that window that has the keyboard focus. Looked up
        // again every 600 ms at most (the user may move to another field).
        static readonly HashSet<string> WebViewHosts = new() { "Microsoft.UI.Content.DesktopChildSiteBridge", "Microsoft.UI.Xaml.Controls.WebView2" };
        const int HasKeyboardFocusId = 30008;
        UIA.IUIAutomationElement? webViewHost, webViewFocus;
        DateTime webViewAt;

        UIA.IUIAutomationElement InnerFocus(UIA.IUIAutomationElement focused)
        {
            if (!WebViewHosts.Contains(focused.CurrentClassName)) { webViewHost = null; return focused; }
            if (webViewHost != null && webViewFocus != null && uia.CompareElements(focused, webViewHost) != 0 &&
                (DateTime.UtcNow - webViewAt).TotalMilliseconds < 600) return webViewFocus;
            webViewHost = focused;
            webViewAt = DateTime.UtcNow;
            webViewFocus = WebViewFocus(focused) ?? focused;
            return webViewFocus;
        }

        UIA.IUIAutomationElement? WebViewFocus(UIA.IUIAutomationElement host)
        {
            var r = host.CurrentBoundingRectangle;
            foreach (var hwnd in Native.VisibleWindows("Chrome_WidgetWin_1"))
            {
                Native.GetWindowThreadProcessId(hwnd, out var pid);
                if (!string.Equals(ProcessName(pid), "msedgewebview2", StringComparison.OrdinalIgnoreCase)) continue;
                Native.GetWindowRect(hwnd, out var w);
                // Inside the host's pane (a few pixels of rounding allowed).
                if (w.Left < r.left - 4 || w.Top < r.top - 4 || w.Right > r.right + 4 || w.Bottom > r.bottom + 4) continue;
                var found = uia.ElementFromHandle(hwnd)?.FindFirst(UIA.TreeScope.TreeScope_Descendants, uia.CreatePropertyCondition(HasKeyboardFocusId, true));
                if (found != null) return found;
            }
            return null;
        }

        void Tick()
        {
            var focused = uia.GetFocusedElement();
            if (focused == null) { if (element != null) Reset(null); return; }
            focused = InnerFocus(focused);
            var pid = focused.CurrentProcessId;
            // The card never takes the focus; the settings window does, and is not
            // to be underlined (nor covered by the marks of the field before). Its
            // fields belong to a WebView2 process: the window in front tells.
            Native.GetWindowThreadProcessId(Native.GetForegroundWindow(), out var front);
            if (pid == ownPid || front == ownPid) { if (element != null) Reset(null); return; }
            if (element == null || uia.CompareElements(focused, element) == 0)
            {
                Reset(focused);
                field = Usable(focused, pid);
                if (field != null) Log.Write($"field: {ProcessName(pid)} / type {focused.CurrentControlType} / {focused.CurrentFrameworkId} / {field.GetType().Name}");
            }
            if (field == null) return;

            var raw = Whole(field.Text(MaxChars));
            if (raw != text)
            {
                editEnd = text != null ? Shift(text, raw) : -1;
                text = raw;
                changedAt = DateTime.UtcNow;
                fresh = false;
            }
            // A check once the user pauses.
            if (!fresh && asked != raw && (DateTime.UtcNow - changedAt).TotalMilliseconds > 350)
            {
                asked = raw;
                check(Normalize(raw)).ContinueWith(t =>
                {
                    if (t.Status == TaskStatus.RanToCompletion && t.Result != null)
                        lock (gate) answer = (raw, t.Result);
                }, TaskScheduler.Default);
            }
            lock (gate)
            {
                if (answer is { } a)
                {
                    answer = null;
                    // An answer for a text that has changed since is dropped.
                    if (a.Text == text)
                    {
                        matches = a.Found.Take(MaxMarks).ToList();
                        anchors = matches.Select(m => field.Locate(m, text)).ToList();
                        fresh = true;
                        Log.Write($"check: {text.Length} characters, {matches.Count} matches, {anchors.Count(r => r == null)} not placed");
                    }
                }
            }

            // The boxes follow scrolling, resizing and window moves.
            var bounds = field.Bounds();
            var marks = new List<Mark>();
            for (var i = 0; i < matches.Count; i++)
            {
                if (anchors[i] is not { } anchor) continue;
                // No final period asked for while the user is still writing the sentence.
                if (matches[i].RuleId == FinalPunctRule && !field.CaretBefore(anchor)) continue;
                // Nor a word the user is still typing: a pause in the middle of
                // "toujours" gets "touj" checked, and Word hands its text over late,
                // so the mark could stay under the finished word.
                var end = matches[i].Offset + matches[i].Length;
                if (end == editEnd && IsWordChar(text!, end - 1)) continue;
                var boxes = anchor.Boxes().Where(b => b.IntersectsWith(bounds)).ToArray();
                if (boxes.Length > 0) marks.Add(new Mark(matches[i], boxes));
            }
            Publish(marks);
        }

        // While the user types: the marks before and after the edit stay (moved
        // by the length typed), the ones it touches go until the next check.
        // Returns where the edit ends in the new text.
        int Shift(string before, string now)
        {
            var max = Math.Min(before.Length, now.Length);
            var prefix = 0;
            while (prefix < max && before[prefix] == now[prefix]) prefix++;
            var suffix = 0;
            while (suffix < max - prefix && before[before.Length - 1 - suffix] == now[now.Length - 1 - suffix]) suffix++;
            var editEnd = before.Length - suffix;
            var delta = now.Length - before.Length;

            var keptMatches = new List<Match>();
            var keptAnchors = new List<IAnchor?>();
            for (var i = 0; i < matches.Count; i++)
            {
                var m = matches[i];
                var end = m.Offset + m.Length;
                if (end < prefix || (end == prefix && !IsWordChar(now, prefix)))
                {
                    // Before the edit: the same anchor, if the application kept it in place.
                    keptMatches.Add(m);
                    keptAnchors.Add(anchors[i] != null && anchors[i]!.Holds(m) ? anchors[i] : field!.Locate(m, now));
                }
                else if (m.Offset > editEnd || (m.Offset == editEnd && !IsWordChar(now, m.Offset + delta - 1)))
                {
                    m.Offset += delta;
                    keptMatches.Add(m);
                    keptAnchors.Add(field!.Locate(m, now));
                }
            }
            matches = keptMatches;
            anchors = keptAnchors;
            return now.Length - suffix;
        }

        static bool IsWordChar(string s, int i) => i >= 0 && i < s.Length && (char.IsLetterOrDigit(s[i]) || s[i] == '-' || s[i] == (char)0x2019 || s[i] == '\'');

        void Remove(Match match)
        {
            var i = matches.IndexOf(match);
            if (i < 0) return;
            matches.RemoveAt(i);
            anchors.RemoveAt(i);
            lastSignature = null;
        }

        void Publish(List<Mark> marks)
        {
            var signature = string.Join("|", marks.Select(m => m.Match.GetHashCode() + ":" + string.Join(";", m.Boxes)));
            if (signature == lastSignature) return;
            lastSignature = signature;
            publish(marks);
        }

        // The editable prose field behind an element, or null.
        IField? Usable(UIA.IUIAutomationElement el, int pid)
        {
            if (Skipped.Contains(ProcessName(pid))) return null;
            if (el.CurrentIsPassword != 0) return null;
            // Notepad++ and the other Scintilla editors: a pane to UI Automation.
            if (ScintillaField.For(el, pid) is { } scintilla) return scintilla;
            var type = el.CurrentControlType;
            if (type != EditType && type != DocumentType) return null;
            if (el.GetCurrentPattern(ValuePatternId) is UIA.IUIAutomationValuePattern value && value.CurrentIsReadOnly != 0) return null;
            if (el.GetCurrentPattern(TextPatternId) is UIA.IUIAutomationTextPattern pattern) return new UiaField(el, pattern);
            return EditField.For(el);
        }

        string ProcessName(int pid)
        {
            if (processNames.TryGetValue(pid, out var name)) return name;
            try { name = Process.GetProcessById(pid).ProcessName; }
            catch (ArgumentException) { name = ""; }
            return processNames[pid] = name;
        }

        // A text read up to MaxChars may stop in the middle of a word (a long
        // document: "échographie" read as "échogr", underlined as a mistake). It
        // then ends at the last paragraph, or failing that the last sentence or space.
        static string Whole(string raw)
        {
            if (raw.Length < MaxChars) return raw;
            var end = raw.LastIndexOfAny(new[] { '\r', '\n', '\v', (char)0x2029 });
            if (end < MaxChars / 2)
                for (var i = raw.Length - 2; i >= MaxChars / 2 && end < MaxChars / 2; i--)
                    if (".!?".Contains(raw[i]) && char.IsWhiteSpace(raw[i + 1])) end = i;
            if (end < MaxChars / 2) end = raw.LastIndexOfAny(new[] { ' ', '\t' });
            return end > 0 ? raw[..(end + 1)] : raw;
        }

        // Same length as the original, so offsets hold: line and paragraph
        // breaks of any kind become the engines' paragraph separator.
        static string Normalize(string s)
        {
            var chars = s.ToCharArray();
            for (var i = 0; i < chars.Length; i++)
            {
                var c = chars[i];
                if (c == (char)13 || c == (char)11 || c == (char)0x2028 || c == (char)0x2029) chars[i] = (char)10;
                else if (c == (char)0) chars[i] = ' ';
            }
            return new string(chars);
        }

        // Selects the word in the application and types the replacement.
        void DoReplace(Match match, string replacement)
        {
            var i = matches.IndexOf(match);
            if (i < 0 || anchors[i] is not { } anchor) return;
            // The text may have changed under the mark since the last tick.
            field?.Text(MaxChars);
            if (!anchor.Holds(match)) return;
            anchor.Select();
            Thread.Sleep(60);
            Native.Type(replacement);
        }

        // For tests, without the focus: checks the first text field of a window
        // and logs where each match would be underlined.
        public void Probe(IntPtr hwnd)
        {
            uia = new UIA.CUIAutomation();
            var window = uia.ElementFromHandle(hwnd);
            var el = window.FindFirst(UIA.TreeScope.TreeScope_Subtree, uia.CreatePropertyCondition(IsTextPatternAvailableId, true))
                ?? window.FindFirst(UIA.TreeScope.TreeScope_Subtree, uia.CreatePropertyCondition(ClassNameId, "Edit"))
                ?? window.FindFirst(UIA.TreeScope.TreeScope_Subtree, uia.CreatePropertyCondition(ClassNameId, "Scintilla"));
            if (el == null) { Log.Write("probe: no text field"); return; }
            field = Usable(el, el.CurrentProcessId);
            Log.Write($"probe: {ProcessName(el.CurrentProcessId)} / type {el.CurrentControlType} / " + (field?.GetType().Name ?? "skipped"));
            if (field == null) return;
            var raw = Whole(field.Text(MaxChars));
            var found = check(Normalize(raw)).GetAwaiter().GetResult() ?? new();
            foreach (var m in found)
            {
                var anchor = field.Locate(m, raw);
                Log.Write($"probe: {m.Category} \"{m.Word}\" at {m.Offset} -> " + (anchor == null ? "not placed" : string.Join(" ", anchor.Boxes())));
            }
        }
    }
}
