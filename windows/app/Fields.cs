using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows;
using UIA = Interop.UIAutomationClient;

namespace FreeCorrector
{
    // A text field of another application, as the watcher sees it.
    interface IField
    {
        // The text, at most `max` characters.
        string Text(int max);
        // The field on screen, in pixels.
        Rect Bounds();
        // Where a match is, or null when the text there is not the match's word.
        IAnchor? Locate(Match match, string text);
        // The caret is before the end of the anchor.
        bool CaretBefore(IAnchor anchor);
    }

    interface IAnchor
    {
        // The text at the anchor is still the match's word.
        bool Holds(Match match);
        // Screen pixels, one box per line.
        Rect[] Boxes();
        // Selects the anchor's text in the application.
        void Select();
    }

    // Most fields: UI Automation's text pattern (Word, Outlook, WordPad,
    // Chromium and WebView2 applications…).
    sealed class UiaField : IField
    {
        const UIA.TextPatternRangeEndpoint Start = UIA.TextPatternRangeEndpoint.TextPatternRangeEndpoint_Start;
        const UIA.TextPatternRangeEndpoint End = UIA.TextPatternRangeEndpoint.TextPatternRangeEndpoint_End;
        const UIA.TextUnit Character = UIA.TextUnit.TextUnit_Character;

        readonly UIA.IUIAutomationElement element;
        readonly UIA.IUIAutomationTextPattern pattern;

        public UiaField(UIA.IUIAutomationElement element, UIA.IUIAutomationTextPattern pattern)
        {
            this.element = element;
            this.pattern = pattern;
        }

        public string Text(int max) => pattern.DocumentRange.GetText(max);

        public Rect Bounds()
        {
            var r = element.CurrentBoundingRectangle;
            return new Rect(r.left, r.top, Math.Max(0, r.right - r.left), Math.Max(0, r.bottom - r.top));
        }

        // Applications do not all count characters the same way (some count a
        // line break of two characters as one): the text of the range is
        // checked and a few other starts are tried.
        public IAnchor? Locate(Match m, string text)
        {
            var crlf = 0;
            for (var i = text.IndexOf("\r\n", StringComparison.Ordinal); i >= 0 && i < m.Offset; i = text.IndexOf("\r\n", i + 2, StringComparison.Ordinal)) crlf++;
            foreach (var start in crlf > 0 ? new[] { m.Offset, m.Offset - crlf } : new[] { m.Offset })
            {
                var range = RangeAt(start, m.Length);
                if (range != null && range.GetText(m.Length + 1) == m.Word) return new Anchor(range);
            }
            // Last resort: the word, searched from a little before.
            var from = RangeAt(Math.Max(0, m.Offset - crlf - 20), 0);
            if (from == null) return null;
            from.MoveEndpointByRange(End, pattern.DocumentRange, End);
            var found = from.FindText(m.Word, 0, 0);
            return found == null ? null : new Anchor(found);
        }

        UIA.IUIAutomationTextRange? RangeAt(int start, int length)
        {
            if (start < 0) return null;
            var range = pattern.DocumentRange.Clone();
            if (range.MoveEndpointByUnit(Start, Character, start) != start) return null;
            range.MoveEndpointByRange(End, range, Start);
            range.MoveEndpointByUnit(End, Character, length);
            return range;
        }

        public bool CaretBefore(IAnchor anchor)
        {
            var selection = pattern.GetSelection();
            if (selection == null || selection.Length == 0) return false;
            return selection.GetElement(0).CompareEndpoints(Start, ((Anchor)anchor).Range, End) < 0;
        }

        sealed class Anchor : IAnchor
        {
            const int BeforeParagraphSpacingId = 40042, AfterParagraphSpacingId = 40041;
            const UIA.TextUnit Paragraph = UIA.TextUnit.TextUnit_Paragraph;

            public readonly UIA.IUIAutomationTextRange Range;
            // Per box, how much of its height the text takes, for the heights it was measured with.
            double[] textShare = Array.Empty<double>();
            string measuredFor = "";

            public Anchor(UIA.IUIAutomationTextRange range) => Range = range;

            public bool Holds(Match match) => Range.GetText(match.Length + 1) == match.Word;

            public Rect[] Boxes()
            {
                var boxes = Rects(Range);
                var heights = string.Join(";", boxes.ConvertAll(b => b.Height));
                if (heights != measuredFor)
                {
                    measuredFor = heights;
                    textShare = TextShare(boxes);
                }
                for (var i = 0; i < boxes.Count; i++)
                    if (textShare[i] < 1) boxes[i] = new Rect(boxes[i].X, boxes[i].Y, boxes[i].Width, boxes[i].Height * textShare[i]);
                return boxes.ToArray();
            }

            static List<Rect> Rects(UIA.IUIAutomationTextRange range)
            {
                var a = range.GetBoundingRectangles() as double[];
                var boxes = new List<Rect>();
                for (var k = 0; a != null && k + 3 < a.Length; k += 4)
                    if (a[k + 2] > 0 && a[k + 3] > 0) boxes.Add(new Rect(a[k], a[k + 1], a[k + 2], a[k + 3]));
                return boxes;
            }

            // Rich edit controls (WordPad, Word…) count the space after a paragraph
            // in the height of its last line: drawn at the bottom of that box, the
            // underline would fall between the lines. The text's own height is the
            // one of the other lines, of the paragraph or of the ones around it.
            double[] TextShare(List<Rect> boxes)
            {
                var share = new double[boxes.Count];
                Array.Fill(share, 1.0);
                try
                {
                    var paragraph = Range.Clone();
                    paragraph.ExpandToEnclosingUnit(Paragraph);
                    var lines = Rects(paragraph);
                    var around = paragraph.Clone();
                    around.MoveEndpointByUnit(Start, Paragraph, -1);
                    around.MoveEndpointByUnit(End, Paragraph, 1);
                    var near = Rects(around);
                    double before = Points(paragraph.GetAttributeValue(BeforeParagraphSpacingId)), after = Points(paragraph.GetAttributeValue(AfterParagraphSpacingId));
                    for (var i = 0; i < boxes.Count; i++)
                    {
                        var line = lines.FindIndex(l => Math.Abs(l.Top - boxes[i].Top) < 3);
                        // Only the last line has the space after.
                        if (line < 0 || line != lines.Count - 1) continue;
                        var h = boxes[i].Height;
                        var others = lines.Count > 1 ? lines.GetRange(0, lines.Count - 1) : near;
                        var text = double.MaxValue;
                        foreach (var o in others)
                            if (o.Height >= h * 0.55 && o.Height < text) text = o.Height;
                        if (text >= h * 0.95) continue;
                        // A one-line paragraph may also have the space before, at the top.
                        var extra = h - text;
                        if (line == 0 && before > 0) extra *= after > 0 ? after / (before + after) : 0;
                        share[i] = (h - extra) / h;
                    }
                }
                catch (COMException) { }
                return share;
            }

            // A spacing in points, or 0 when the application does not tell.
            static double Points(object value) => value is double d && d > 0 ? d : value is float f && f > 0 ? f : 0;

            public void Select() => Range.Select();
        }
    }

    // Classic Win32 edit controls (Notepad on Windows 10, many dialogs): no
    // text pattern, but the edit control's own messages work from another
    // process. Character offsets are the control's own: "\r\n" counts two.
    sealed class EditField : IField
    {
        const int WM_GETTEXT = 0x0D, WM_GETTEXTLENGTH = 0x0E, EM_GETSEL = 0xB0, EM_SETSEL = 0xB1;
        const int EM_GETLINECOUNT = 0xBA, EM_LINEINDEX = 0xBB, EM_POSFROMCHAR = 0xD6;
        const int ES_PASSWORD = 0x20, ES_READONLY = 0x800, GWL_STYLE = -16;
        const uint SMTO_ABORTIFHUNG = 0x2;

        [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr SendMessageTimeout(IntPtr hwnd, int msg, IntPtr wParam, StringBuilder lParam, uint flags, uint timeout, out IntPtr result);
        [DllImport("user32.dll")] static extern IntPtr SendMessageTimeout(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);
        [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr hwnd, ref Native.POINT point);
        [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr hwnd, out Native.RECT rect);
        [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr hwnd, int index);

        readonly IntPtr hwnd;
        string text = "";

        EditField(IntPtr hwnd) => this.hwnd = hwnd;

        // An editable edit control, or null.
        public static EditField? For(UIA.IUIAutomationElement el)
        {
            if (el.CurrentClassName != "Edit") return null;
            var hwnd = el.CurrentNativeWindowHandle;
            if (hwnd == IntPtr.Zero) return null;
            var style = GetWindowLongPtr(hwnd, GWL_STYLE).ToInt64();
            return (style & (ES_READONLY | ES_PASSWORD)) != 0 ? null : new EditField(hwnd);
        }

        long Send(int msg, long wParam = 0, long lParam = 0) =>
            SendMessageTimeout(hwnd, msg, new IntPtr(wParam), new IntPtr(lParam), SMTO_ABORTIFHUNG, 200, out var result) == IntPtr.Zero ? -1 : result.ToInt64();

        public string Text(int max)
        {
            var length = (int)Math.Min(Send(WM_GETTEXTLENGTH), max);
            if (length <= 0) return text = "";
            var buffer = new StringBuilder(length + 1);
            SendMessageTimeout(hwnd, WM_GETTEXT, new IntPtr(length + 1), buffer, SMTO_ABORTIFHUNG, 200, out _);
            return text = buffer.ToString();
        }

        public Rect Bounds()
        {
            GetClientRect(hwnd, out var r);
            var p = new Native.POINT();
            ClientToScreen(hwnd, ref p);
            return new Rect(p.X, p.Y, r.Right, r.Bottom);
        }

        public IAnchor? Locate(Match m, string current) =>
            m.Offset + m.Length <= current.Length && string.CompareOrdinal(current, m.Offset, m.Word, 0, m.Length) == 0 ? new Anchor(this, m) : null;

        public bool CaretBefore(IAnchor anchor)
        {
            var a = (Anchor)anchor;
            // Without pointers (they would not reach the other process): the start is the low word.
            var selection = Send(EM_GETSEL);
            return selection >= 0 && (selection & 0xFFFF) < a.Match.Offset + a.Match.Length;
        }

        // Client coordinates of a character, or null when the control has none for it.
        Native.POINT? Position(int index)
        {
            var r = Send(EM_POSFROMCHAR, index);
            if (r == -1) return null;
            return new Native.POINT { X = (short)(r & 0xFFFF), Y = (short)((r >> 16) & 0xFFFF) };
        }

        // The height of a line: between the first two lines, or from the field's size.
        int LineHeight()
        {
            if (Send(EM_GETLINECOUNT) >= 2 && Position(0) is { } first && Position((int)Send(EM_LINEINDEX, 1)) is { } second && second.Y > first.Y)
                return second.Y - first.Y;
            GetClientRect(hwnd, out var r);
            return Math.Max(12, Math.Min(r.Bottom, 20));
        }

        sealed class Anchor : IAnchor
        {
            readonly EditField field;
            public readonly Match Match;

            public Anchor(EditField field, Match match)
            {
                this.field = field;
                Match = match;
            }

            public bool Holds(Match match) => field.Locate(match, field.text) != null;

            public Rect[] Boxes()
            {
                int start = Match.Offset, end = Match.Offset + Match.Length;
                if (field.Position(start) is not { } a) return Array.Empty<Rect>();
                // The word's end: the next character on the same line, or the last
                // character plus the width of the one before.
                double right;
                if (field.Position(end) is { } b && b.Y == a.Y && b.X > a.X) right = b.X;
                else if (Match.Length > 1 && field.Position(end - 1) is { } last && field.Position(end - 2) is { } before && last.Y == a.Y)
                    right = last.X + Math.Max(4, last.X - before.X);
                else right = a.X + 8 * Match.Length;
                var origin = new Native.POINT();
                ClientToScreen(field.hwnd, ref origin);
                return new[] { new Rect(origin.X + a.X, origin.Y + a.Y, right - a.X, field.LineHeight()) };
            }

            public void Select() => field.Send(EM_SETSEL, Match.Offset, Match.Offset + Match.Length);
        }
    }

    // Scintilla, the editor of Notepad++ (and of SciTE, Notepad2, Notepad3…):
    // only an empty pane to UI Automation, but its own messages work from
    // another process. It hands out a pointer to its text, read straight from
    // the other process's memory. Its positions count bytes (UTF-8, or the code
    // page of an ANSI document): `map` turns our character offsets into them.
    sealed class ScintillaField : IField
    {
        const int SCI_GETLENGTH = 2006, SCI_GETCURRENTPOS = 2008, SCI_GETCODEPAGE = 2137, SCI_GETREADONLY = 2140, SCI_SETSEL = 2160;
        const int SCI_POINTXFROMPOSITION = 2164, SCI_POINTYFROMPOSITION = 2165, SCI_LINEFROMPOSITION = 2166, SCI_TEXTHEIGHT = 2279;
        const int SCI_GETRANGEPOINTER = 2643, SCI_GETLEXER = 4002;
        const uint SMTO_ABORTIFHUNG = 0x2, PROCESS_VM_READ = 0x10, PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
        // Prose only, not code: no lexer, the null one (Notepad++'s "Normal text"),
        // Markdown, and Notepad++'s user-defined languages (its Markdown is one).
        static readonly HashSet<long> ProseLexers = new() { 0, 1, 98, 152 };

        [DllImport("user32.dll")] static extern IntPtr SendMessageTimeout(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);
        [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr hwnd, ref Native.POINT point);
        [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr hwnd, out Native.RECT rect);
        [DllImport("kernel32.dll")] static extern uint GetACP();
        [DllImport("kernel32.dll", SetLastError = true)] static extern Microsoft.Win32.SafeHandles.SafeProcessHandle OpenProcess(uint access, bool inherit, int pid);
        [DllImport("kernel32.dll", SetLastError = true)] static extern bool ReadProcessMemory(Microsoft.Win32.SafeHandles.SafeProcessHandle process, IntPtr address, byte[] buffer, IntPtr size, out IntPtr read);

        static ScintillaField() => Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

        readonly IntPtr hwnd;
        readonly Microsoft.Win32.SafeHandles.SafeProcessHandle process;
        byte[] bytes = Array.Empty<byte>();
        long codePage = -1;
        string text = "";
        // The byte position of each character of `text`, and of its end.
        int[] map = { 0 };

        ScintillaField(IntPtr hwnd, Microsoft.Win32.SafeHandles.SafeProcessHandle process)
        {
            this.hwnd = hwnd;
            this.process = process;
        }

        public static ScintillaField? For(UIA.IUIAutomationElement el, int pid)
        {
            if (el.CurrentClassName != "Scintilla") return null;
            var hwnd = el.CurrentNativeWindowHandle;
            if (hwnd == IntPtr.Zero) return null;
            var process = OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
            if (process.IsInvalid) return null;
            return new ScintillaField(hwnd, process);
        }

        long Send(int msg, long wParam = 0, long lParam = 0) =>
            SendMessageTimeout(hwnd, msg, new IntPtr(wParam), new IntPtr(lParam), SMTO_ABORTIFHUNG, 200, out var result) == IntPtr.Zero ? -1 : result.ToInt64();

        // Empty for code and read-only documents (the same window shows every tab of Notepad++).
        public string Text(int max)
        {
            if (!ProseLexers.Contains(Send(SCI_GETLEXER)) || Send(SCI_GETREADONLY) != 0) return Keep(Array.Empty<byte>(), 0, max);
            var length = Send(SCI_GETLENGTH);
            if (length <= 0) return Keep(Array.Empty<byte>(), 0, max);
            // Enough bytes for `max` characters (4 at most each). The range pointer
            // leaves the rest of a long document where it is in memory.
            var count = (int)Math.Min(length, 4L * max);
            var pointer = Send(SCI_GETRANGEPOINTER, 0, count);
            var buffer = new byte[count];
            if (pointer <= 0 || !ReadProcessMemory(process, new IntPtr(pointer), buffer, new IntPtr(count), out var read) || read.ToInt64() != count)
                return Keep(Array.Empty<byte>(), 0, max);
            return Keep(buffer, Send(SCI_GETCODEPAGE), max);
        }

        // Decodes the bytes once (they are read again at each tick of the watcher),
        // byte by byte to know where each character starts.
        string Keep(byte[] now, long page, int max)
        {
            if (page == codePage && now.AsSpan().SequenceEqual(bytes)) return text;
            bytes = now;
            codePage = page;
            var decoder = (page == 65001 ? Encoding.UTF8 : Encoding.GetEncoding(page > 0 ? (int)page : (int)GetACP())).GetDecoder();
            var chars = new char[4];
            var builder = new StringBuilder(Math.Min(now.Length, max));
            var starts = new List<int>(Math.Min(now.Length, max) + 1);
            var start = 0;
            for (var i = 0; i < now.Length && builder.Length < max; i++)
            {
                var n = decoder.GetChars(now, i, 1, chars, 0, false);
                for (var k = 0; k < n; k++) { builder.Append(chars[k]); starts.Add(start); }
                if (n > 0) start = i + 1;
            }
            if (builder.Length > max) { builder.Length = max; starts.RemoveRange(max, starts.Count - max); }
            // The end of the last character (a sequence cut at the end of what was read stays out).
            starts.Add(start);
            map = starts.ToArray();
            return text = builder.ToString();
        }

        public Rect Bounds()
        {
            GetClientRect(hwnd, out var r);
            var p = new Native.POINT();
            ClientToScreen(hwnd, ref p);
            return new Rect(p.X, p.Y, r.Right, r.Bottom);
        }

        public IAnchor? Locate(Match m, string current)
        {
            if (current != text || m.Offset < 0 || m.Offset + m.Length >= map.Length) return null;
            return string.CompareOrdinal(text, m.Offset, m.Word, 0, m.Length) == 0 ? new Anchor(this, m.Offset, m.Length) : null;
        }

        public bool CaretBefore(IAnchor anchor)
        {
            var caret = Send(SCI_GETCURRENTPOS);
            return caret >= 0 && caret < ((Anchor)anchor).End;
        }

        Native.POINT Point(int position) =>
            new() { X = (int)Send(SCI_POINTXFROMPOSITION, 0, position), Y = (int)Send(SCI_POINTYFROMPOSITION, 0, position) };

        sealed class Anchor : IAnchor
        {
            readonly ScintillaField field;
            // In characters of the text it was found in.
            readonly int offset, length;
            public readonly int Start, End;

            public Anchor(ScintillaField field, int offset, int length)
            {
                this.field = field;
                this.offset = offset;
                this.length = length;
                Start = field.map[offset];
                End = field.map[offset + length];
            }

            public bool Holds(Match match) => field.Locate(match, field.text) is Anchor a && a.Start == Start && a.End == End;

            public Rect[] Boxes()
            {
                if (offset + length >= field.map.Length) return Array.Empty<Rect>();
                var origin = new Native.POINT();
                ClientToScreen(field.hwnd, ref origin);
                var height = (int)field.Send(SCI_TEXTHEIGHT, field.Send(SCI_LINEFROMPOSITION, Start));
                Rect Box(Native.POINT from, int right) => new(origin.X + from.X, origin.Y + from.Y, Math.Max(0, right - from.X), height);
                var a = field.Point(Start);
                var b = field.Point(End);
                if (b.Y == a.Y) return new[] { Box(a, b.X) };
                // A group of words that wraps: one box per line, each up to the
                // start of its last character (the space where the line breaks).
                var boxes = new List<Rect>();
                Native.POINT line = a, previous = a;
                for (var i = offset + 1; i <= offset + length; i++)
                {
                    var p = field.Point(field.map[i]);
                    if (p.Y != line.Y)
                    {
                        if (previous.X > line.X) boxes.Add(Box(line, previous.X));
                        line = p;
                    }
                    else if (i == offset + length) boxes.Add(Box(line, p.X));
                    previous = p;
                }
                return boxes.ToArray();
            }

            public void Select() => field.Send(SCI_SETSEL, Start, End);
        }
    }
}
