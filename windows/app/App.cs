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

        [STAThread]
        static void Main(string[] args)
        {
            // FreeCorrector.exe --probe <window handle>: see Watcher.Probe.
            // FreeCorrector.exe --settings: opens the settings window too.
            var probe = args.Length == 2 && args[0] == "--probe" ? new IntPtr(long.Parse(args[1])) : IntPtr.Zero;
            using var mutex = new Mutex(true, "FreeCorrector.Windows", out var first);
            if (!first && probe == IntPtr.Zero) return;
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
            menu.Items.Add(L.T("Quitter", "Quit"), null, (_, _) => app.Shutdown());

            var tray = new Forms.NotifyIcon
            {
                Text = "FreeCorrector",
                Icon = LoadIcon(Path.Combine(AppContext.BaseDirectory, "icon-32.png")),
                ContextMenuStrip = menu,
                Visible = true,
            };
            tray.DoubleClick += (_, _) => SettingsWindow.Show(engine);
            return tray;
        }

        static System.Drawing.Icon LoadIcon(string png)
        {
            if (!File.Exists(png)) return System.Drawing.SystemIcons.Application;
            using var bitmap = new System.Drawing.Bitmap(png);
            return System.Drawing.Icon.FromHandle(bitmap.GetHicon());
        }
    }
}
