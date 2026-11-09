using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Threading;
using Microsoft.Win32;

namespace FreeCorrector
{
    // The app downloaded from lapigeonnerie.fr (the Store updates its own apps):
    // once a day, asks the site for the latest version and says so when there
    // is a newer one, which one click installs (InstallAsync). The request
    // carries the app's version and nothing else (no identifier, never any
    // text). It can be turned off, at install time and in the tray menu; the
    // privacy page says so.
    static class Updates
    {
        const string Key = @"Software\LaPigeonnerie\FreeCorrector";
        static readonly TimeSpan Every = TimeSpan.FromHours(23);
        // FREECORRECTOR_UPDATE_URL: another server (tests).
        static readonly string LatestUrl = Environment.GetEnvironmentVariable("FREECORRECTOR_UPDATE_URL")
            ?? "https://lapigeonnerie.fr/freecorrector/windows/latest";
        public static readonly string PageUrl = L.T("https://lapigeonnerie.fr/freecorrector/windows", "https://lapigeonnerie.fr/freecorrector/en/windows");

        // The installers: GitHub releases of the repository (windows/deploy-site.ps1),
        // never the site, which only says which version is the latest.
        // FREECORRECTOR_RELEASES_URL: another server (tests).
        static readonly string? releasesTest = Environment.GetEnvironmentVariable("FREECORRECTOR_RELEASES_URL");
        static readonly string ReleaseUrl = releasesTest ?? "https://api.github.com/repos/BenjiBurn/FreeCorrector/releases/tags/windows-v";
        const string DownloadPrefix = "https://github.com/BenjiBurn/FreeCorrector/releases/download/";
        static readonly string UpdateFolder = Path.Combine(Path.GetTempPath(), "FreeCorrector-update");

        static readonly HttpClient http = new() { Timeout = TimeSpan.FromSeconds(20) };
        static readonly HttpClient download = new() { Timeout = TimeSpan.FromMinutes(15) };
        static DispatcherTimer? timer;

        public static bool Installing { get; private set; }

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
            download.DefaultRequestHeaders.UserAgent.ParseAdd($"FreeCorrector/{Program.Version} (Windows)");
            // The installer of the last update, now installed.
            try { if (Directory.Exists(UpdateFolder)) Directory.Delete(UpdateFolder, true); }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException) { }
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

        // One click on the notification or in the menu: the installer of the newer
        // version, from its GitHub release, checked against the SHA-256 that
        // GitHub gives (not the site: a hacked site could not make the app run
        // anything else), then run without any window. Downloaded by the app and
        // not by a browser, it carries no "from the Internet" mark: Windows does
        // not warn. The installer closes this app (FreeCorrector.exe --quit),
        // replaces it and starts the new version, with the options chosen at the
        // first installation. Throws when something fails: the caller offers the
        // download page instead.
        public static async Task InstallAsync()
        {
            if (Newer is not { } version || Installing) return;
            Installing = true;
            try
            {
                var name = $"freecorrector-{version}-windows-x64-setup.exe";
                using var release = JsonDocument.Parse(await http.GetStringAsync(ReleaseUrl + version));
                string? url = null, digest = null;
                foreach (var asset in release.RootElement.GetProperty("assets").EnumerateArray())
                {
                    if (asset.GetProperty("name").GetString() != name) continue;
                    url = asset.GetProperty("browser_download_url").GetString();
                    digest = asset.TryGetProperty("digest", out var d) ? d.GetString() : null;
                }
                if (url == null || (releasesTest == null && !url.StartsWith(DownloadPrefix, StringComparison.Ordinal)))
                    throw new InvalidDataException($"{name}: not in the release");
                if (digest == null || !digest.StartsWith("sha256:", StringComparison.Ordinal))
                    throw new InvalidDataException($"{name}: no SHA-256 from GitHub");

                Directory.CreateDirectory(UpdateFolder);
                var file = Path.Combine(UpdateFolder, name);
                await using (var source = await download.GetStreamAsync(url))
                await using (var target = File.Create(file))
                    await source.CopyToAsync(target);
                string sha;
                await using (var written = File.OpenRead(file))
                    sha = Convert.ToHexString(await SHA256.HashDataAsync(written)).ToLowerInvariant();
                if ("sha256:" + sha != digest)
                {
                    File.Delete(file);
                    throw new InvalidDataException($"{name}: SHA-256 {sha}, GitHub says {digest}");
                }
                Log.Write($"update: installing {version}");
                Process.Start(new ProcessStartInfo(file, "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART") { UseShellExecute = false });
            }
            finally
            {
                Installing = false;
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
