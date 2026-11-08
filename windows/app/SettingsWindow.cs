using System;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Media.Imaging;
using Microsoft.Web.WebView2.Wpf;

namespace FreeCorrector
{
    // The extension's options page (dictionary, rules, language, picky mode),
    // in a window. It shares the engines' storage: what it changes applies at once.
    sealed class SettingsWindow : Window
    {
        static SettingsWindow? open;

        public static void Show(Engine engine)
        {
            if (open == null)
            {
                open = new SettingsWindow(engine);
                // The engines stay awake meanwhile: the window's changes reach the app through them.
                engine.Hold();
                open.Closed += (_, _) => { open = null; engine.Release(); };
                open.Show();
            }
            if (open.WindowState == WindowState.Minimized) open.WindowState = WindowState.Normal;
            // In front even when Windows refuses the focus to a background app.
            open.Topmost = true;
            open.Topmost = false;
            open.Activate();
        }

        SettingsWindow(Engine engine)
        {
            Title = L.T("Réglages · FreeCorrector", "Settings · FreeCorrector");
            Width = 760;
            Height = 820;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            var icon = Path.Combine(AppContext.BaseDirectory, "icon-32.png");
            if (File.Exists(icon)) Icon = new BitmapImage(new Uri(icon));
            var view = new WebView2 { DefaultBackgroundColor = Theme.Dark ? System.Drawing.Color.FromArgb(0x1f, 0x23, 0x29) : System.Drawing.Color.White };
            Content = view;
            // Its WebView2 processes go at once, and the engines can sleep (Engine.Release).
            Closed += (_, _) => view.Dispose();
            Loaded += async (_, _) =>
            {
                await view.EnsureCoreWebView2Async(await engine.EnvironmentAsync());
                var web = view.CoreWebView2;
                engine.Secure(web);
                // Links (the donation page…) open in the user's browser.
                web.NewWindowRequested += (_, e) => { e.Handled = true; OpenInBrowser(e.Uri); };
                web.NavigationStarting += (_, e) =>
                {
                    if (e.Uri.StartsWith(Engine.Url(""), StringComparison.OrdinalIgnoreCase)) return;
                    e.Cancel = true;
                    OpenInBrowser(e.Uri);
                };
                web.Navigate(Engine.Url($"options/settings.html?v={Program.Version}&lang={(L.French ? "fr" : "en")}"));
            };
        }

        static void OpenInBrowser(string uri)
        {
            if (uri.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                Process.Start(new ProcessStartInfo(uri) { UseShellExecute = true });
        }
    }
}
