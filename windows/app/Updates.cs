using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Threading;
using Microsoft.Win32;

namespace FreeCorrector
{
    // The app downloaded from lapigeonnerie.fr (the Store updates its own apps):
    // once a day, asks the site for the latest version and says so when there
    // is a newer one. The request carries the app's version and nothing else
    // (no identifier, never any text). It can be turned off, at install time
    // and in the tray menu; the privacy page says so.
    static class Updates
    {
        const string Key = @"Software\LaPigeonnerie\FreeCorrector";
        static readonly TimeSpan Every = TimeSpan.FromHours(23);
        // FREECORRECTOR_UPDATE_URL: another server (tests).
        static readonly string LatestUrl = Environment.GetEnvironmentVariable("FREECORRECTOR_UPDATE_URL")
            ?? "https://lapigeonnerie.fr/freecorrector/windows/latest";
        public static readonly string PageUrl = L.T("https://lapigeonnerie.fr/freecorrector/windows", "https://lapigeonnerie.fr/freecorrector/en/windows");

        static readonly HttpClient http = new() { Timeout = TimeSpan.FromSeconds(20) };
        static DispatcherTimer? timer;

        public static bool Available => !Startup.Packaged;

        // The newer version found, if any; Found tells the tray menu.
        public static string? Newer { get; private set; }
        public static event Action? Found;

        // The installer writes it (its "check for updates" box); missing: on.
        public static bool On
        {
            get => Read("CheckUpdates") is not int value || value != 0;
            set => Write("CheckUpdates", value ? 1 : 0);
        }

        // The version the user was already told about: told once, not at every start.
        public static bool Told
        {
            get => Newer != null && Read("ToldVersion") as string == Newer;
            set { if (Newer != null) Write("ToldVersion", Newer); }
        }

        public static void Start()
        {
            if (!Available) return;
            http.DefaultRequestHeaders.UserAgent.ParseAdd($"FreeCorrector/{Program.Version} (Windows)");
            // A first look a minute after starting (not while Windows itself
            // starts), then every hour: a day after the last answer, it asks again.
            timer = new DispatcherTimer { Interval = TimeSpan.FromMinutes(1) };
            timer.Tick += async (_, _) =>
            {
                timer.Interval = TimeSpan.FromHours(1);
                await CheckAsync(false);
            };
            timer.Start();
        }

        public static async Task CheckAsync(bool now)
        {
            if (!Available || !On) return;
            var last = Read("LastCheck") is string s && long.TryParse(s, out var t) ? DateTimeOffset.FromUnixTimeSeconds(t) : DateTimeOffset.MinValue;
            if (!now && DateTimeOffset.UtcNow - last < Every) return;
            try
            {
                using var answer = JsonDocument.Parse(await http.GetStringAsync(LatestUrl));
                Write("LastCheck", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString());
                var latest = answer.RootElement.GetProperty("version").GetString();
                if (latest != null && Version.TryParse(latest, out var theirs) && Version.TryParse(Program.Version, out var ours) && theirs > ours)
                {
                    Log.Write($"update: {latest} available");
                    if (Newer == latest) return;
                    Newer = latest;
                    Found?.Invoke();
                }
            }
            // Offline, a proxy, the site down: the next hour.
            catch (Exception e) when (e is HttpRequestException or TaskCanceledException or JsonException or InvalidOperationException or KeyNotFoundException)
            {
                Log.Write("update check: " + e.Message);
            }
        }

        static object? Read(string name)
        {
            using var key = Registry.CurrentUser.OpenSubKey(Key);
            return key?.GetValue(name);
        }

        static void Write(string name, object value)
        {
            using var key = Registry.CurrentUser.CreateSubKey(Key);
            key.SetValue(name, value);
        }
    }
}
