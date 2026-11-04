using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text.Json.Serialization;
using System.Windows;
using System.Windows.Media;
using Microsoft.Win32;

namespace FreeCorrector
{
    // One finding of the engines, as engine/host.js returns it.
    sealed class Match
    {
        [JsonPropertyName("offset")] public int Offset { get; set; }
        [JsonPropertyName("length")] public int Length { get; set; }
        [JsonPropertyName("word")] public string Word { get; set; } = "";
        [JsonPropertyName("message")] public string Message { get; set; } = "";
        [JsonPropertyName("category")] public string Category { get; set; } = "";
        [JsonPropertyName("ruleId")] public string RuleId { get; set; } = "";
        [JsonPropertyName("replacements")] public List<string> Replacements { get; set; } = new();
    }

    // A match as shown: its boxes are in screen pixels, one per line.
    sealed record Mark(Match Match, Rect[] Boxes);

    // The interface follows Windows' language: French, or English for anything
    // else. FREECORRECTOR_LANG=fr or en chooses (the Store's screenshots).
    static class L
    {
        public static readonly bool French = (Environment.GetEnvironmentVariable("FREECORRECTOR_LANG") ?? CultureInfo.CurrentUICulture.TwoLetterISOLanguageName) == "fr";
        public static string T(string french, string english) => French ? french : english;
    }

    static class Theme
    {
        // Windows' app mode (Settings > Personalization > Colors).
        public static readonly bool Dark = Registry.GetValue(
            @"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize", "AppsUseLightTheme", 1) is int light && light == 0;

        public static Brush Category(string category) => Freeze(category switch
        {
            "spelling" => "#e5484d",
            "grammar" => "#f5a524",
            _ => "#3b82f6",
        });

        public static readonly Brush Background = Freeze(Dark ? "#1f2329" : "#ffffff");
        public static readonly Brush Border = Freeze(Dark ? "#3a404a" : "#d0d5dd");
        public static readonly Brush Text = Freeze(Dark ? "#e6e8eb" : "#1f2329");
        public static readonly Brush Muted = Freeze(Dark ? "#9aa3ad" : "#667085");
        public static readonly Brush Accent = Freeze("#2563eb");

        static Brush Freeze(string color)
        {
            var brush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(color));
            brush.Freeze();
            return brush;
        }
    }

    // %LOCALAPPDATA%\FreeCorrector\freecorrector.log: what was checked (never the text).
    static class Log
    {
        public static readonly string Folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FreeCorrector");
        static readonly string file = Path.Combine(Folder, "freecorrector.log");
        static readonly object gate = new();

        public static void Write(string line)
        {
            lock (gate)
            {
                try
                {
                    Directory.CreateDirectory(Folder);
                    if (File.Exists(file) && new FileInfo(file).Length > 1_000_000) File.Delete(file);
                    File.AppendAllText(file, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff ") + line + Environment.NewLine);
                }
                catch (IOException) { }
            }
        }
    }
}
