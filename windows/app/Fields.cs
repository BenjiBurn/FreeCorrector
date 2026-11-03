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
            public readonly UIA.IUIAutomationTextRange Range;
            public Anchor(UIA.IUIAutomationTextRange range) => Range = range;

            public bool Holds(Match match) => Range.GetText(match.Length + 1) == match.Word;

            public Rect[] Boxes()
            {
                var a = Range.GetBoundingRectangles() as double[];
                var boxes = new List<Rect>();
                for (var k = 0; a != null && k + 3 < a.Length; k += 4)
                    if (a[k + 2] > 0 && a[k + 3] > 0) boxes.Add(new Rect(a[k], a[k + 1], a[k + 2], a[k + 3]));
                return boxes.ToArray();
            }

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
}
