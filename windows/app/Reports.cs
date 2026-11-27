using System;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Text.Json;

namespace FreeCorrector
{
    // "Report" in the card: the website's report page, as the extension opens it
    // (content/ui.js, fcReportUrl). The sentence, the word and the fix travel in
    // the fragment (#r=…), which the browser never sends to the server: nothing
    // leaves until the person clicks "Send" on that page.
    static class Reports
    {
        const string PageFr = "https://lapigeonnerie.fr/freecorrector/report";
        const string PageEn = "https://lapigeonnerie.fr/freecorrector/en/report";
        const string Ends = ".!?";

        public static string Url(string text, Match match)
        {
            // The sentence around the match, at most a few hundred characters.
            var offset = Math.Clamp(match.Offset, 0, text.Length);
            var start = offset;
            while (start > 0 && !Ends.Contains(text[start - 1]) && text[start - 1] != '\n' && offset - start < 300) start--;
            var end = Math.Min(text.Length, offset + match.Length);
            while (end < text.Length && text[end] != '\n' && end - offset < 300)
            {
                end++;
                if (Ends.Contains(text[end - 1]) && end > offset + match.Length) break;
            }
            var data = new
            {
                s = text[start..end].Trim(),
                w = match.Word,
                f = match.Replacements.FirstOrDefault() ?? "",
                m = match.Message.Length > 300 ? match.Message[..300] : match.Message,
                id = match.RuleId,
                l = match.Lang,
                a = "windows",
                v = Program.Version,
            };
            var b64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(data)))
                .Replace('+', '-').Replace('/', '_').TrimEnd('=');
            return $"{(L.French ? PageFr : PageEn)}#r={b64}";
        }

        public static void Open(string text, Match match)
        {
            try { Process.Start(new ProcessStartInfo(Url(text, match)) { UseShellExecute = true }); }
            catch (Exception e) { Log.Write("report: " + e.Message); }
        }
    }
}
