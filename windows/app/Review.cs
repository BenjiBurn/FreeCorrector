using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Interop;
using Microsoft.Win32;
using Windows.Services.Store;

namespace FreeCorrector
{
    // "Leave a review", as the extension's popup does (src/popup/popup.js): after
    // AFTER fixes (counted on this PC only, in the registry), one notification
    // asks for a review on the Microsoft Store; ignored, it asks once more LATER
    // fixes later, then never. Until the review has been asked for, the tray
    // menu keeps a "Leave a review" item. The click opens Windows' own rating
    // dialog (stars and a comment, without leaving the app), else the Store's page. Nothing is sent anywhere: the count
    // stays in the registry.
    // Only the Store's copy asks: the installer from the site is for PCs where
    // the Store is blocked, whose users could not leave a review there.
    static class Review
    {
        const string Key = @"Software\LaPigeonnerie\FreeCorrector";
        const string ProductId = "9P3GM2HR6BZB";
        // FREECORRECTOR_REVIEW_AFTER: a lower threshold, and on outside the Store too (tests).
        static readonly string? test = Environment.GetEnvironmentVariable("FREECORRECTOR_REVIEW_AFTER");
        static readonly int After = int.TryParse(test, out var n) ? n : 30;
        static bool Available => Startup.Packaged || test != null;
        const int Later = 60;

        // Raised once the threshold is reached: the tray adds its item, and
        // notifies when Notify is true (first time, and the one reminder).
        public static event Action<bool>? Due;

        internal static int Fixes
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

        // Windows' rating dialog for the Store's copy; the Store's review page if
        // it fails (or outside the Store, in tests).
        public static async void Open()
        {
            Write("ReviewState", "done");
            try
            {
                if (Startup.Packaged && await RateInApp()) return;
            }
            catch (Exception e) { Log.Write("review dialog: " + e.Message); }
            OpenPage();
        }

        // StoreContext needs a window to own its dialog: the app has none on screen
        // when the notification is clicked, so an invisible one, centred, for the time of the dialog.
        static async Task<bool> RateInApp()
        {
            var owner = new Window
            {
                Width = 1, Height = 1, WindowStyle = WindowStyle.None, AllowsTransparency = true, Opacity = 0,
                ResizeMode = ResizeMode.NoResize, ShowInTaskbar = false, Topmost = true,
                WindowStartupLocation = WindowStartupLocation.CenterScreen,
            };
            owner.Show();
            try
            {
                var context = StoreContext.GetDefault();
                WinRT.Interop.InitializeWithWindow.Initialize(context, new WindowInteropHelper(owner).Handle);
                var result = await context.RequestRateAndReviewAppAsync();
                Log.Write("review dialog: " + result.Status);
                // Cancelled is an answer too; an error (no network, Store missing) falls back to the page.
                return result.Status is StoreRateAndReviewStatus.Succeeded or StoreRateAndReviewStatus.CanceledByUser;
            }
            finally { owner.Close(); }
        }

        // The Store's review page; should the Store app be missing, the app's web page.
        static void OpenPage()
        {
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
