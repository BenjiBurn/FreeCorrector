using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;

namespace FreeCorrector
{
    // The extension's engines (Grammalecte for French, Harper for English) in a
    // hidden WebView2 page: engine/engine.html and engine/bridge.js. WebView2
    // belongs to the UI thread: every call is made from there.
    sealed class Engine
    {
        const string Host = "engine.freecorrector";
        static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        // The questions not answered yet, kept to be asked again if the engines restart.
        readonly Dictionary<int, (string Message, TaskCompletionSource<JsonElement> Answer)> waiting = new();
        TaskCompletionSource ready = new();
        IntPtr parent;
        CoreWebView2Controller? controller;
        CoreWebView2? web;
        DateTime restartedAt = DateTime.MinValue;
        int nextId;

        public CoreWebView2Environment Environment { get; private set; } = null!;

        // The settings window changed something.
        public event Action? SettingsChanged;

        public async Task StartAsync(IntPtr parent)
        {
            this.parent = parent;
            Environment = await CreateEnvironmentAsync();
            await LoadAsync();
            Log.Write("engines ready, WebView2 " + Environment.BrowserVersionString);
        }

        // --probe gets its own folder: two processes sharing one also share
        // WebView2's processes, and the probe's exit would stop the app's engines.
        static Task<CoreWebView2Environment> CreateEnvironmentAsync() =>
            CoreWebView2Environment.CreateAsync(null, Path.Combine(Log.Folder, Program.Probing ? "WebView2-probe" : "WebView2"));

        async Task LoadAsync()
        {
            ready = new();
            controller = await Environment.CreateCoreWebView2ControllerAsync(parent);
            controller.IsVisible = false;
            web = controller.CoreWebView2;
            Secure(web);
            web.WebMessageReceived += OnMessage;
            web.ProcessFailed += OnProcessFailed;
            web.Navigate($"https://{Host}/engine.html");
            await ready.Task;
            foreach (var (message, _) in waiting.Values) web.PostWebMessageAsJson(message);
        }

        // WebView2's processes can stop (a crash, a WebView2 update…): the
        // engines restart and the questions in flight are asked again. Once only
        // within half a minute, so a page that keeps failing does not loop.
        async void OnProcessFailed(object? sender, CoreWebView2ProcessFailedEventArgs e)
        {
            var kind = e.ProcessFailedKind;
            Log.Write("engine process failed: " + kind);
            if (kind != CoreWebView2ProcessFailedKind.BrowserProcessExited && kind != CoreWebView2ProcessFailedKind.RenderProcessExited) return;
            if (web == null || sender != web) return;
            web.WebMessageReceived -= OnMessage;
            web.ProcessFailed -= OnProcessFailed;
            web = null;
            try { controller?.Close(); } catch (Exception) { }
            controller = null;
            if (DateTime.UtcNow - restartedAt < TimeSpan.FromSeconds(30)) { Log.Write("engines failed again: not restarted"); return; }
            restartedAt = DateTime.UtcNow;
            try
            {
                await Task.Delay(1000);
                if (kind == CoreWebView2ProcessFailedKind.BrowserProcessExited) Environment = await CreateEnvironmentAsync();
                await LoadAsync();
                Log.Write("engines restarted");
            }
            catch (Exception ex) { Log.Write("engine restart: " + ex.Message); }
        }

        public static string Url(string path) => $"https://{Host}/{path}";

        // The app's pages, for the engines and the settings window: the app's own
        // files and nothing else, so that everything stays on the computer.
        public void Secure(CoreWebView2 view)
        {
            view.Settings.AreDevToolsEnabled = false;
            view.Settings.AreDefaultContextMenusEnabled = false;
            view.Settings.IsStatusBarEnabled = false;
            view.Settings.IsZoomControlEnabled = false;
            view.SetVirtualHostNameToFolderMapping(Host, Path.Combine(AppContext.BaseDirectory, "engine"), CoreWebView2HostResourceAccessKind.Deny);
            view.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
            view.WebResourceRequested += (_, e) =>
            {
                if (!new Uri(e.Request.Uri).Host.Equals(Host, StringComparison.OrdinalIgnoreCase))
                    e.Response = Environment.CreateWebResourceResponse(null, 403, "Blocked", "");
            };
        }

        void OnMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("type", out var type))
            {
                if (type.GetString() == "ready") ready.TrySetResult();
                else if (type.GetString() == "settings") SettingsChanged?.Invoke();
                return;
            }
            if (root.TryGetProperty("id", out var id) && waiting.Remove(id.GetInt32(), out var question))
                question.Answer.SetResult(root.Clone());
        }

        // While the engines restart, the question waits for them.
        Task<JsonElement> Ask(string type, object payload)
        {
            var id = ++nextId;
            var answer = new TaskCompletionSource<JsonElement>();
            var message = JsonSerializer.SerializeToNode(payload, Json)!.AsObject();
            message["id"] = id;
            message["type"] = type;
            waiting[id] = (message.ToJsonString(), answer);
            if (web != null && ready.Task.IsCompleted) web.PostWebMessageAsJson(waiting[id].Message);
            return answer.Task;
        }

        // The matches, or null when the engines failed (logged).
        public async Task<List<Match>?> CheckAsync(string text)
        {
            var answer = await Ask("check", new { text });
            if (answer.TryGetProperty("matches", out var matches)) return matches.Deserialize<List<Match>>(Json);
            Log.Write("engine error: " + (answer.TryGetProperty("error", out var error) ? error.GetString() : answer.ToString()));
            return null;
        }

        public Task AddWordAsync(string word) => Ask("addWord", new { word });

        public Task DisableRuleAsync(Match match) => Ask("disableRule", new { match });

        public async Task<JsonElement> GetSettingsAsync() => (await Ask("getSettings", new { })).GetProperty("settings");

        public Task SetSettingsAsync(object patch) => Ask("setSettings", new { patch });
    }
}
