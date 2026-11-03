using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Interop;
using System.Windows.Media;
using Microsoft.Win32;

namespace FreeCorrector
{
    // The underlines: a transparent window over all the monitors that lets
    // every click through to the applications below.
    sealed class Overlay : Window
    {
        readonly Canvas canvas = new();

        public Overlay()
        {
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Background = Brushes.Transparent;
            Topmost = true;
            ShowInTaskbar = false;
            ShowActivated = false;
            Content = canvas;
            SourceInitialized += (_, _) =>
            {
                var hwnd = new WindowInteropHelper(this).Handle;
                Native.AddExStyle(hwnd, Native.WS_EX_TRANSPARENT | Native.WS_EX_LAYERED | Native.WS_EX_TOOLWINDOW | Native.WS_EX_NOACTIVATE);
                Native.CoverVirtualScreen(hwnd);
                // A monitor plugged in or out, another resolution.
                SystemEvents.DisplaySettingsChanged += (_, _) => Dispatcher.BeginInvoke(() => Native.CoverVirtualScreen(hwnd));
            };
        }

        public void Draw(List<Mark> marks)
        {
            canvas.Children.Clear();
            foreach (var mark in marks)
            {
                var brush = Theme.Category(mark.Match.Category);
                foreach (var box in mark.Boxes)
                {
                    // Screen pixels to this window's units (they differ when Windows scales).
                    var a = PointFromScreen(new Point(box.Left, box.Bottom));
                    var b = PointFromScreen(new Point(box.Right, box.Bottom));
                    var wave = new StreamGeometry();
                    using (var ctx = wave.Open())
                    {
                        var y = a.Y - 1;
                        ctx.BeginFigure(new Point(a.X, y), false, false);
                        var up = true;
                        for (var x = a.X + 2; x < b.X + 2; x += 2, up = !up)
                            ctx.LineTo(new Point(Math.Min(x, b.X), up ? y - 2 : y), true, true);
                    }
                    wave.Freeze();
                    canvas.Children.Add(new System.Windows.Shapes.Path { Data = wave, Stroke = brush, StrokeThickness = 1.4 });
                }
            }
        }
    }
}
