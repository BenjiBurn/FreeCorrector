using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Win32;
using Windows.ApplicationModel;

namespace FreeCorrector
{
    // "Start with Windows". Installed from the Store (MSIX), through the
    // package's startup task (windows/msix/AppxManifest.xml): Windows ignores
    // a packaged app's Run key. Otherwise, the user's Run key.
    static class Startup
    {
        const string TaskId = "FreeCorrectorStartup";
        const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        const string Name = "FreeCorrector";
        const int APPMODEL_ERROR_NO_PACKAGE = 15700;

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
        static extern int GetCurrentPackageFullName(ref int length, StringBuilder? fullName);

        public static readonly bool Packaged = IsPackaged();

        static bool IsPackaged()
        {
            var length = 0;
            return GetCurrentPackageFullName(ref length, null) != APPMODEL_ERROR_NO_PACKAGE;
        }

        static string Command => $"\"{Environment.ProcessPath}\"";

        public static async Task<bool> IsOnAsync()
        {
            if (Packaged) return On((await StartupTask.GetAsync(TaskId)).State);
            using var key = Registry.CurrentUser.OpenSubKey(RunKey);
            return key?.GetValue(Name) is string value && value == Command;
        }

        // Returns whether it is on now: Windows keeps it off when the user
        // turned it off in its own settings.
        public static async Task<bool> SetAsync(bool on)
        {
            if (Packaged)
            {
                var task = await StartupTask.GetAsync(TaskId);
                if (!on) { task.Disable(); return false; }
                return On(await task.RequestEnableAsync());
            }
            using var key = Registry.CurrentUser.CreateSubKey(RunKey);
            if (on) key.SetValue(Name, Command);
            else key.DeleteValue(Name, false);
            return on;
        }

        static bool On(StartupTaskState state) => state is StartupTaskState.Enabled or StartupTaskState.EnabledByPolicy;
    }
}
