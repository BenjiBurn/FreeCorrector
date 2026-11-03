using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
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
        const int TextPatternId = 10014, ValuePatternId = 10002, IsTextPatternAvailableId = 30040;
        const int EditType = 50004, DocumentType = 50030;
        const string FinalPunctRule = "FC_FINAL_PUNCT";
        const UIA.TextPatternRangeEndpoint RangeStart = UIA.TextPatternRangeEndpoint.TextPatternRangeEndpoint_Start;
        const UIA.TextPatternRangeEndpoint RangeEnd = UIA.TextPatternRangeEndpoint.TextPatternRangeEndpoint_End;
        const UIA.TextUnit Character = UIA.TextUnit.TextUnit_Character;
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
        UIA.IUIAutomationTextPattern? pattern;
        string? text;
        DateTime changedAt;
        string? asked;
        bool fresh;
        (string Text, List<Match> Found)? answer;
        List<Match> matches = new();
        List<UIA.IUIAutomationTextRange?> ranges = new();
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
            pattern = null;
            text = null;
            asked = null;
            fresh = false;
            matches = new();
            ranges = new();
            Publish(new());
        }

        void Tick()
        {
            var focused = uia.GetFocusedElement();
            if (focused == null) { if (element != null) Reset(null); return; }
            var pid = focused.CurrentProcessId;
            // Our own windows (the suggestion card) never take the focus away.
            if (pid == ownPid) return;
            if (element == null || uia.CompareElements(focused, element) == 0)
            {
                Reset(focused);
                pattern = Usable(focused, pid);
                if (pattern != null) Log.Write($"field: {ProcessName(pid)} / type {focused.CurrentControlType} / {focused.CurrentFrameworkId}");
            }
            if (pattern == null) return;

            var raw = pattern.DocumentRange.GetText(MaxChars);
            if (raw != text)
            {
                if (text != null) Shift(text, raw);
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
                        ranges = matches.Select(m => RangeFor(m, text)).ToList();
                        fresh = true;
                        Log.Write($"check: {text.Length} characters, {matches.Count} matches, {ranges.Count(r => r == null)} not placed");
                    }
                }
            }

            // The boxes follow scrolling, resizing and window moves.
            var bounds = Bounds(element!);
            var marks = new List<Mark>();
            for (var i = 0; i < matches.Count; i++)
            {
                if (ranges[i] is not { } range) continue;
                // No final period asked for while the user is still writing the sentence.
                if (matches[i].RuleId == FinalPunctRule && !CaretBefore(range)) continue;
                var boxes = Boxes(range).Where(b => b.IntersectsWith(bounds)).ToArray();
                if (boxes.Length > 0) marks.Add(new Mark(matches[i], boxes));
            }
            Publish(marks);
        }

        // While the user types: the marks before and after the edit stay (moved
        // by the length typed), the ones it touches go until the next check.
        void Shift(string before, string now)
        {
            var max = Math.Min(before.Length, now.Length);
            var prefix = 0;
            while (prefix < max && before[prefix] == now[prefix]) prefix++;
            var suffix = 0;
            while (suffix < max - prefix && before[before.Length - 1 - suffix] == now[now.Length - 1 - suffix]) suffix++;
            var editEnd = before.Length - suffix;
            var delta = now.Length - before.Length;

            var keptMatches = new List<Match>();
            var keptRanges = new List<UIA.IUIAutomationTextRange?>();
            for (var i = 0; i < matches.Count; i++)
            {
                var m = matches[i];
                var end = m.Offset + m.Length;
                if (end < prefix || (end == prefix && !IsWordChar(now, prefix)))
                {
                    // Before the edit: the same range, if the application kept it in place.
                    var range = ranges[i] != null && ranges[i]!.GetText(m.Length + 1) == m.Word ? ranges[i] : RangeFor(m, now);
                    keptMatches.Add(m);
                    keptRanges.Add(range);
                }
                else if (m.Offset > editEnd || (m.Offset == editEnd && !IsWordChar(now, m.Offset + delta - 1)))
                {
                    m.Offset += delta;
                    keptMatches.Add(m);
                    keptRanges.Add(RangeFor(m, now));
                }
            }
            matches = keptMatches;
            ranges = keptRanges;
        }

        // The caret is before the end of the range (as content/field.js does it).
        bool CaretBefore(UIA.IUIAutomationTextRange range)
        {
            var selection = pattern!.GetSelection();
            if (selection == null || selection.Length == 0) return false;
            return selection.GetElement(0).CompareEndpoints(RangeStart, range, RangeEnd) < 0;
        }

        static bool IsWordChar(string s, int i) => i >= 0 && i < s.Length && (char.IsLetterOrDigit(s[i]) || s[i] == '-' || s[i] == (char)0x2019 || s[i] == '\'');

        void Remove(Match match)
        {
            var i = matches.IndexOf(match);
            if (i < 0) return;
            matches.RemoveAt(i);
            ranges.RemoveAt(i);
            lastSignature = null;
        }

        void Publish(List<Mark> marks)
        {
            var signature = string.Join("|", marks.Select(m => m.Match.GetHashCode() + ":" + string.Join(";", m.Boxes)));
            if (signature == lastSignature) return;
            lastSignature = signature;
            publish(marks);
        }

        // The text pattern of an editable prose field, or null.
        UIA.IUIAutomationTextPattern? Usable(UIA.IUIAutomationElement el, int pid)
        {
            if (Skipped.Contains(ProcessName(pid))) return null;
            if (el.CurrentIsPassword != 0) return null;
            var type = el.CurrentControlType;
            if (type != EditType && type != DocumentType) return null;
            if (el.GetCurrentPattern(ValuePatternId) is UIA.IUIAutomationValuePattern value && value.CurrentIsReadOnly != 0) return null;
            return el.GetCurrentPattern(TextPatternId) as UIA.IUIAutomationTextPattern;
        }

        static Rect Bounds(UIA.IUIAutomationElement el)
        {
            var r = el.CurrentBoundingRectangle;
            return new Rect(r.left, r.top, Math.Max(0, r.right - r.left), Math.Max(0, r.bottom - r.top));
        }

        static Rect[] Boxes(UIA.IUIAutomationTextRange range)
        {
            var a = range.GetBoundingRectangles() as double[];
            var boxes = new List<Rect>();
            for (var k = 0; a != null && k + 3 < a.Length; k += 4)
                if (a[k + 2] > 0 && a[k + 3] > 0) boxes.Add(new Rect(a[k], a[k + 1], a[k + 2], a[k + 3]));
            return boxes.ToArray();
        }

        string ProcessName(int pid)
        {
            if (processNames.TryGetValue(pid, out var name)) return name;
            try { name = Process.GetProcessById(pid).ProcessName; }
            catch (ArgumentException) { name = ""; }
            return processNames[pid] = name;
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

        // The range of a match. Applications do not all count characters the
        // same way (some count a line break of two characters as one), so the
        // text of the range is checked and a few other starts are tried.
        UIA.IUIAutomationTextRange? RangeFor(Match m, string raw)
        {
            var crlf = 0;
            for (var i = raw.IndexOf("\r\n", StringComparison.Ordinal); i >= 0 && i < m.Offset; i = raw.IndexOf("\r\n", i + 2, StringComparison.Ordinal)) crlf++;
            foreach (var start in crlf > 0 ? new[] { m.Offset, m.Offset - crlf } : new[] { m.Offset })
            {
                var range = RangeAt(start, m.Length);
                if (range != null && range.GetText(m.Length + 1) == m.Word) return range;
            }
            // Last resort: the word, searched from a little before.
            var from = RangeAt(Math.Max(0, m.Offset - crlf - 20), 0);
            if (from == null) return null;
            from.MoveEndpointByRange(RangeEnd, pattern!.DocumentRange, RangeEnd);
            return from.FindText(m.Word, 0, 0);
        }

        UIA.IUIAutomationTextRange? RangeAt(int start, int length)
        {
            if (start < 0) return null;
            var range = pattern!.DocumentRange.Clone();
            if (range.MoveEndpointByUnit(RangeStart, Character, start) != start) return null;
            range.MoveEndpointByRange(RangeEnd, range, RangeStart);
            range.MoveEndpointByUnit(RangeEnd, Character, length);
            return range;
        }

        // Selects the word in the application and types the replacement.
        void DoReplace(Match match, string replacement)
        {
            var i = matches.IndexOf(match);
            if (i < 0 || ranges[i] is not { } range) return;
            // The text may have changed under the mark since the last tick.
            if (range.GetText(match.Length + 1) != match.Word) return;
            range.Select();
            Thread.Sleep(60);
            Native.Type(replacement);
        }

        // For tests, without the focus: checks the first text field of a window
        // and logs where each match would be underlined.
        public void Probe(IntPtr hwnd)
        {
            uia = new UIA.CUIAutomation();
            var el = uia.ElementFromHandle(hwnd).FindFirst(UIA.TreeScope.TreeScope_Subtree, uia.CreatePropertyCondition(IsTextPatternAvailableId, true));
            if (el == null) { Log.Write("probe: no text field"); return; }
            pattern = Usable(el, el.CurrentProcessId);
            Log.Write($"probe: {ProcessName(el.CurrentProcessId)} / type {el.CurrentControlType}" + (pattern != null ? " -> checked" : " -> skipped"));
            if (pattern == null) return;
            var raw = pattern.DocumentRange.GetText(MaxChars);
            var found = check(Normalize(raw)).GetAwaiter().GetResult() ?? new();
            foreach (var m in found)
            {
                var range = RangeFor(m, raw);
                Log.Write($"probe: {m.Category} \"{m.Word}\" at {m.Offset} -> " + (range == null ? "not placed" : string.Join(" ", Boxes(range))));
            }
        }
    }
}
