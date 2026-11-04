using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

namespace FreeCorrector
{
    static class Native
    {
        public const int WS_EX_TRANSPARENT = 0x20, WS_EX_TOOLWINDOW = 0x80, WS_EX_LAYERED = 0x80000, WS_EX_NOACTIVATE = 0x8000000;
        const int GWL_EXSTYLE = -20;
        const uint SWP_NOSIZE = 0x1, SWP_NOZORDER = 0x4, SWP_NOACTIVATE = 0x10;

        [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
        [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
        [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT { public ushort wVk, wScan; public uint dwFlags, time; public IntPtr dwExtraInfo; }
        [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT { public int dx, dy; public uint mouseData, dwFlags, time; public IntPtr dwExtraInfo; }
        [StructLayout(LayoutKind.Explicit)] struct InputUnion { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
        [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public InputUnion u; }

        [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr hwnd, int index);
        [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW")] static extern IntPtr SetWindowLongPtr(IntPtr hwnd, int index, IntPtr value);
        [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
        [DllImport("user32.dll")] static extern int GetSystemMetrics(int index);
        [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
        [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out int pid);
        // -1: any process may come to the front (the running app, asked to show its settings).
        [DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(int pid);
        [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT r);
        [DllImport("user32.dll")] static extern uint SendInput(uint count, INPUT[] inputs, int size);

        public static void AddExStyle(IntPtr hwnd, int style)
        {
            var current = GetWindowLongPtr(hwnd, GWL_EXSTYLE).ToInt64();
            SetWindowLongPtr(hwnd, GWL_EXSTYLE, new IntPtr(current | (uint)style));
        }

        // All monitors, in pixels (SM_XVIRTUALSCREEN … SM_CYVIRTUALSCREEN).
        public static void CoverVirtualScreen(IntPtr hwnd) =>
            SetWindowPos(hwnd, IntPtr.Zero, GetSystemMetrics(76), GetSystemMetrics(77), GetSystemMetrics(78), GetSystemMetrics(79), SWP_NOZORDER | SWP_NOACTIVATE);

        public static void MoveTo(IntPtr hwnd, int x, int y) =>
            SetWindowPos(hwnd, IntPtr.Zero, x, y, 0, 0, SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE);

        // Types text into the focused application; an empty text deletes the selection.
        public static void Type(string text)
        {
            const uint KEYEVENTF_KEYUP = 0x2, KEYEVENTF_UNICODE = 0x4;
            var inputs = new List<INPUT>();
            void Key(ushort vk, ushort scan, uint flags) => inputs.Add(new INPUT { type = 1, u = new InputUnion { ki = new KEYBDINPUT { wVk = vk, wScan = scan, dwFlags = flags } } });
            if (text.Length == 0)
            {
                Key(0x2E, 0, 0); // Delete
                Key(0x2E, 0, KEYEVENTF_KEYUP);
            }
            foreach (var c in text)
            {
                Key(0, c, KEYEVENTF_UNICODE);
                Key(0, c, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP);
            }
            SendInput((uint)inputs.Count, inputs.ToArray(), Marshal.SizeOf<INPUT>());
        }
    }
}
