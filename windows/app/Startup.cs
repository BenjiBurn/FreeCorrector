using System;
using Microsoft.Win32;

namespace FreeCorrector
{
    // "Start with Windows": the user's Run key, pointing at this executable.
    static class Startup
    {
        const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        const string Name = "FreeCorrector";

        static string Command => $"\"{Environment.ProcessPath}\"";

        public static bool IsOn
        {
            get
            {
                using var key = Registry.CurrentUser.OpenSubKey(RunKey);
                return key?.GetValue(Name) is string value && value == Command;
            }
        }

        public static void Set(bool on)
        {
            using var key = Registry.CurrentUser.CreateSubKey(RunKey);
            if (on) key.SetValue(Name, Command);
            else key.DeleteValue(Name, false);
        }
    }
}
