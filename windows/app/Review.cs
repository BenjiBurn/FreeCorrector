using System;
using System.ComponentModel;
using System.Diagnostics;
using Microsoft.Win32;

namespace FreeCorrector
{
    // "Leave a review", as the extension's popup does (src/popup/popup.js): after
    // AFTER fixes (counted on this PC only, in the registry), one notification
    // asks for a review on the Microsoft Store; ignored, it asks once more LATER
    // fixes later, then never. Until the review page has been opened, the tray
    // menu keeps a "Leave a review" item. Nothing is sent anywhere: the count
    // stays in the registry.
    // Only the Store's copy asks: the installer from the site is for PCs where
    // the Store is blocked, whose users could not leave a review there.
    static class Review
    {
        const string Key = @"Software\LaPigeonnerie\FreeCorrector";
        const string ProductId = "9P3GM2HR6BZB";
        // FREECORRECTOR_REVIEW_AFTER: a lower threshold, and on outside the Store too (tests).
        static readonly string? test = Environment.GetEnvironmentVariable("FREECORRECTOR_REVIEW_AFTER");
        static readonly int After = int.TryParse(test, out var n) ? n : 100;
        static bool Available => Startup.Packaged || test != null;
        const int Later = 150;

        // Raised once the threshold is reached: the tray adds its item, and
        // notifies when Notify is true (first time, and the one reminder).
        public static event Action<bool>? Due;

        static int Fixes
        {
            get => Read("FixCount") is int value ? value : 0;
            set => Write("FixCount", value);
        }

        // "done" once the page was opened; otherwise the count at which to notify next (0: never notified).
        static bool Done => Read("ReviewState") as string == "done";
        static int NextNotice
        {
            get => Read("ReviewNext") is int value ? value : After;
            set => Write("ReviewNext", value);
        }

        // At start: the item is there if the threshold was reached before.
        public static void Start()
        {
            if (Available && !Done && Fixes >= After) Due?.Invoke(false);
        }

        // A suggestion was applied (card click).
        public static void Count()
        {
            if (!Available) return;
            try
            {
                var fixes = Fixes + 1;
                Fixes = fixes;
                if (Done || fixes < After) return;
                var next = NextNotice;
                var notify = next > 0 && fixes >= next;
                // The first notice plans one reminder; the reminder plans none.
                if (notify) NextNotice = next == After ? fixes + Later : 0;
                if (notify || fixes == After) Due?.Invoke(notify);
            }
            catch (Exception e) { Log.Write("review count: " + e.Message); }
        }

        // The Store's review page; should the Store app be missing, the app's web page.
        public static void Open()
        {
            Write("ReviewState", "done");
            try { Launch($"ms-windows-store://review/?ProductId={ProductId}"); }
            catch (Exception e) when (e is Win32Exception or InvalidOperationException)
            {
                Log.Write("review: " + e.Message);
                Launch($"https://apps.microsoft.com/detail/{ProductId}?hl={L.T("fr-FR", "en-US")}");
            }
        }

        static void Launch(string url) => Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });

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
