using System;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Media.Imaging;
using Microsoft.Web.WebView2.Wpf;

namespace FreeCorrector
{
    // One of the extension's pages in a window, one window per page:
    // - the settings: the options page (dictionary, rules, language, picky mode).
    //   It shares the engines' storage: what it changes applies at once.
    // - the conjugator: every tense of a French verb (engine/conjugator/).
    sealed class PageWindow : Window
    {
        static PageWindow? settings, conjugator;

        public static void Settings(Engine engine)
        {
            if (settings == null)
            {
                // ?v=: the app's version, shown by the page (options-app.js).
                settings = new PageWindow(engine, L.T("Réglages · FreeCorrector", "Settings · FreeCorrector"), $"options/settings.html?v={Program.Version}", 760, 820);
                // The engines stay awake meanwhile: the window's changes reach the app through them.
                engine.Hold();
                settings.Closed += (_, _) => { settings = null; engine.Release(); };
                settings.Show();
            }
            Front(settings);
        }

        // `verb`: the verb to show ("faire", the page's ?v=), or none for the page's own choice.
        public static void Conjugator(Engine engine, string verb = "")
        {
            var page = "conjugator/conjugator.html" + (verb.Length > 0 ? "?v=" + Uri.EscapeDataString(verb) : "");
            if (conjugator == null)
            {
                conjugator = new PageWindow(engine, L.T("Conjugueur · FreeCorrector", "Conjugator · FreeCorrector"), page, 1100, 860);
                conjugator.Closed += (_, _) => conjugator = null;
                conjugator.Show();
            }
            else if (verb.Length > 0) conjugator.Open(page);
            Front(conjugator);
        }

        static void Front(Window window)
        {
            if (window.WindowState == WindowState.Minimized) window.WindowState = WindowState.Normal;
            // In front even when Windows refuses the focus to a background app.
            window.Topmost = true;
            window.Topmost = false;
            window.Activate();
        }

        readonly WebView2 view;

        PageWindow(Engine engine, string title, string page, int width, int height)
        {
            Title = title;
            Width = width;
            Height = height;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            var icon = Path.Combine(AppContext.BaseDirectory, "icon-32.png");
            if (File.Exists(icon)) Icon = new BitmapImage(new Uri(icon));
            view = new WebView2 { DefaultBackgroundColor = Theme.Dark ? System.Drawing.Color.FromArgb(0x1f, 0x23, 0x29) : System.Drawing.Color.White };
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
                Open(page);
            };
        }

        // The page in the app's language (?lang=, read by tools/settings-page.js's pages).
        void Open(string page)
        {
            if (view.CoreWebView2 == null) return;
            view.CoreWebView2.Navigate(Engine.Url($"{page}{(page.Contains('?') ? '&' : '?')}lang={(L.French ? "fr" : "en")}"));
        }

        static void OpenInBrowser(string uri)
        {
            if (uri.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                Process.Start(new ProcessStartInfo(uri) { UseShellExecute = true });
        }
    }
}
