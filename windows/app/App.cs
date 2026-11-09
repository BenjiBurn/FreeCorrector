using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;
using Forms = System.Windows.Forms;

namespace FreeCorrector
{
    static class Program
    {
        public static readonly string Version = typeof(Program).Assembly.GetName().Version!.ToString(3);
        public static bool Probing { get; private set; }
        const string MutexName = "FreeCorrector.Windows";
        const string ShowSettingsEvent = "FreeCorrector.Windows.ShowSettings";
        const string QuitEvent = "FreeCorrector.Windows.Quit";

        [STAThread]
        static void Main(string[] args)
        {
            // FreeCorrector.exe --probe <window handle>: see Watcher.Probe.
            // FreeCorrector.exe --settings: opens the settings window too.
            // FreeCorrector.exe --quit: closes the running app (the installer, before replacing its files).
            if (args.Contains("--quit")) { Quit(); return; }
            var probe = args.Length == 2 && args[0] == "--probe" ? new IntPtr(long.Parse(args[1])) : IntPtr.Zero;
            Probing = probe != IntPtr.Zero;
            using var mutex = new Mutex(true, MutexName, out var first);
            if (!first && probe == IntPtr.Zero)
            {
                // Started again (from the Start menu…): the running app shows its settings.
                if (EventWaitHandle.TryOpenExisting(ShowSettingsEvent, out var show))
                {
                    Native.AllowSetForegroundWindow(-1);
                    show.Set();
                }
                return;
            }
            var app = new Application { ShutdownMode = ShutdownMode.OnExplicitShutdown };
            app.Startup += async (_, _) =>
            {
                try { await StartAsync(app, probe, args.Contains("--settings")); }
                catch (WebView2RuntimeNotFoundException)
                {
                    MessageBox.Show(L.T("FreeCorrector a besoin de Microsoft Edge WebView2, présent sur Windows 10 et 11 à jour.",
                                        "FreeCorrector needs Microsoft Edge WebView2, part of up-to-date Windows 10 and 11."), "FreeCorrector");
                    app.Shutdown(1);
                }
                catch (Exception e)
                {
                    Log.Write("start: " + e);
                    app.Shutdown(1);
                }
            };
            app.Run();
        }

        // Asks the running app to quit, and returns once it is gone (10 s at most).
        static void Quit()
        {
            if (!EventWaitHandle.TryOpenExisting(QuitEvent, out var quit)) return;
            using (quit) quit.Set();
            if (!Mutex.TryOpenExisting(MutexName, out var mutex)) return;
            using (mutex)
            {
                try
                {
                    if (mutex.WaitOne(TimeSpan.FromSeconds(10))) mutex.ReleaseMutex();
                }
                // Its process ended without releasing it, the normal case: ours now, let go of it.
                catch (AbandonedMutexException) { mutex.ReleaseMutex(); }
            }
        }

        static async Task StartAsync(Application app, IntPtr probe, bool settingsAtStart)
        {
            Log.Write($"FreeCorrector {Version} started");
            // WebView2 needs a window to belong to: one that is never shown.
            var host = new Window { Width = 0, Height = 0, WindowStyle = WindowStyle.None, ShowInTaskbar = false };
            var engine = new Engine();
            await engine.StartAsync(new WindowInteropHelper(host).EnsureHandle());
            Task<List<Match>?> Check(string text) => app.Dispatcher.InvokeAsync(() => engine.CheckAsync(text)).Task.Unwrap();

            if (probe != IntPtr.Zero)
            {
                var thread = new Thread(() =>
                {
                    try { new Watcher(Check, _ => { }).Probe(probe); }
                    catch (Exception e) { Log.Write("probe: " + e); }
                    app.Dispatcher.BeginInvoke(() => app.Shutdown());
                });
                thread.SetApartmentState(ApartmentState.MTA);
                thread.Start();
                return;
            }

            var overlay = new Overlay();
            overlay.Show();
            var card = new Card();
            var marks = new List<Mark>();
            Watcher watcher = null!;
            watcher = new Watcher(Check, list => app.Dispatcher.BeginInvoke(() =>
            {
                marks = list;
                overlay.Draw(list);
                if (card.IsVisible && !list.Any(card.Shows)) card.Hide();
            }));
            card.Replace = (match, replacement) => watcher.Replace(match, replacement);
            card.Ignore = match => watcher.Ignore(match);
            card.AddWord = async match => { await engine.AddWordAsync(match.Word); watcher.Recheck(); };
            card.DisableRule = async match => { await engine.DisableRuleAsync(match); watcher.Recheck(); };
            var settings = await engine.GetSettingsAsync();
            watcher.Enabled = settings.GetProperty("enabled").GetBoolean();
            watcher.Start();
            FollowMouse(card, () => marks);
            var tray = Tray(app, engine, watcher, settings);
            if (settingsAtStart) SettingsWindow.Show(engine);
            var showSettings = new EventWaitHandle(false, EventResetMode.AutoReset, ShowSettingsEvent);
            ThreadPool.RegisterWaitForSingleObject(showSettings, (_, _) => app.Dispatcher.BeginInvoke(() => SettingsWindow.Show(engine)), null, -1, false);
            var quit = new EventWaitHandle(false, EventResetMode.AutoReset, QuitEvent);
            ThreadPool.RegisterWaitForSingleObject(quit, (_, _) => app.Dispatcher.BeginInvoke(() => app.Shutdown()), null, -1, true);
            app.Exit += (_, _) =>
            {
                tray.Visible = false;
                tray.Dispose();
                watcher.Stop();
                Log.Write("stopped");
            };
        }

        // Hovering a mark for a moment opens its card; leaving both closes it.
        static void FollowMouse(Card card, Func<List<Mark>> marks)
        {
            Mark? hovered = null;
            var hoveredSince = DateTime.UtcNow;
            var lastInside = DateTime.UtcNow;
            var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(50) };
            timer.Tick += (_, _) =>
            {
                if (!Native.GetCursorPos(out var p)) return;
                var now = DateTime.UtcNow;
                if (card.IsVisible && Native.GetWindowRect(card.Handle, out var r) && p.X >= r.Left && p.X < r.Right && p.Y >= r.Top && p.Y < r.Bottom)
                {
                    lastInside = now;
                    return;
                }
                var hit = marks().FirstOrDefault(m => m.Boxes.Any(b => p.X >= b.Left && p.X <= b.Right && p.Y >= b.Top - 2 && p.Y <= b.Bottom + 4));
                if (hit != null)
                {
                    lastInside = now;
                    if (hovered?.Match != hit.Match) { hovered = hit; hoveredSince = now; }
                    else if ((now - hoveredSince).TotalMilliseconds > 300 && !card.Shows(hit)) card.ShowFor(hit);
                }
                else
                {
                    hovered = null;
                    if (card.IsVisible && (now - lastInside).TotalMilliseconds > 400) card.Hide();
                }
            };
            timer.Start();
        }

        static Forms.NotifyIcon Tray(Application app, Engine engine, Watcher watcher, JsonElement settings)
        {
            var menu = new Forms.ContextMenuStrip();
            menu.Items.Add(new Forms.ToolStripMenuItem($"FreeCorrector {Version} · " + L.T("Créé par BenjiBurn", "Created by BenjiBurn")) { Enabled = false });
            menu.Items.Add(new Forms.ToolStripSeparator());
            // The switches write the same settings as the settings window.
            var enabled = new Forms.ToolStripMenuItem(L.T("Correction activée", "Checking on")) { CheckOnClick = true };
            var picky = new Forms.ToolStripMenuItem(L.T("Mode exigeant", "Picky mode")) { CheckOnClick = true };
            void Show(JsonElement s)
            {
                enabled.Checked = s.GetProperty("enabled").GetBoolean();
                picky.Checked = s.GetProperty("picky").GetBoolean();
                watcher.Enabled = enabled.Checked;
            }
            Show(settings);
            enabled.Click += async (_, _) => { watcher.Enabled = enabled.Checked; await engine.SetSettingsAsync(new { enabled = enabled.Checked }); };
            picky.Click += async (_, _) => { await engine.SetSettingsAsync(new { picky = picky.Checked }); watcher.Recheck(); };
            engine.SettingsChanged += async () =>
            {
                var now = await engine.GetSettingsAsync();
                Log.Write($"settings changed: enabled {now.GetProperty("enabled")}, picky {now.GetProperty("picky")}");
                Show(now);
                watcher.Recheck();
            };
            menu.Items.Add(enabled);
            menu.Items.Add(picky);
            menu.Items.Add(L.T("Réglages…", "Settings…"), null, (_, _) => SettingsWindow.Show(engine));
            menu.Items.Add(new Forms.ToolStripSeparator());
            var startup = new Forms.ToolStripMenuItem(L.T("Lancer au démarrage de Windows", "Start with Windows")) { CheckOnClick = true };
            menu.Opening += async (_, _) => startup.Checked = await Startup.IsOnAsync();
            startup.Click += async (_, _) => startup.Checked = await Startup.SetAsync(startup.Checked);
            menu.Items.Add(startup);
            if (Updates.Available)
            {
                var checkUpdates = new Forms.ToolStripMenuItem(L.T("Rechercher les mises à jour", "Check for updates")) { CheckOnClick = true, Checked = Updates.On };
                checkUpdates.Click += async (_, _) =>
                {
                    Updates.On = checkUpdates.Checked;
                    if (Updates.On) await Updates.CheckAsync(true);
                };
                menu.Items.Add(checkUpdates);
            }
            menu.Items.Add(L.T("Quitter", "Quit"), null, (_, _) => app.Shutdown());

            var tray = new Forms.NotifyIcon
            {
                Text = "FreeCorrector",
                Icon = LoadIcon(Path.Combine(AppContext.BaseDirectory, "icon-32.png")),
                ContextMenuStrip = menu,
                Visible = true,
            };
            tray.DoubleClick += (_, _) => SettingsWindow.Show(engine);

            // A newer version on the site: at the top of the menu, and said once in a notification.
            Updates.Found += () =>
            {
                var item = new Forms.ToolStripMenuItem(L.T($"Télécharger FreeCorrector {Updates.Newer}", $"Download FreeCorrector {Updates.Newer}"))
                {
                    Font = new System.Drawing.Font(menu.Font, System.Drawing.FontStyle.Bold),
                };
                item.Click += (_, _) => OpenDownloadPage();
                if (menu.Items[0].Tag as string == "update") menu.Items.RemoveAt(0);
                item.Tag = "update";
                menu.Items.Insert(0, item);
                if (Updates.Told) return;
                Updates.Told = true;
                tray.ShowBalloonTip(15000, L.T("Nouvelle version de FreeCorrector", "New FreeCorrector version"),
                    L.T($"FreeCorrector {Updates.Newer} est disponible. Cliquez ici pour la télécharger.",
                        $"FreeCorrector {Updates.Newer} is available. Click here to download it."), Forms.ToolTipIcon.Info);
            };
            tray.BalloonTipClicked += (_, _) => OpenDownloadPage();
            Updates.Start();
            return tray;
        }

        static void OpenDownloadPage() =>
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(Updates.PageUrl) { UseShellExecute = true });

        static System.Drawing.Icon LoadIcon(string png)
        {
            if (!File.Exists(png)) return System.Drawing.SystemIcons.Application;
            using var bitmap = new System.Drawing.Bitmap(png);
            return System.Drawing.Icon.FromHandle(bitmap.GetHicon());
        }
    }
}
