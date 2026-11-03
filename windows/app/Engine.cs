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

        readonly Dictionary<int, TaskCompletionSource<JsonElement>> waiting = new();
        readonly TaskCompletionSource ready = new();
        CoreWebView2? web;
        int nextId;

        public async Task StartAsync(IntPtr parent)
        {
            var env = await CoreWebView2Environment.CreateAsync(null, Path.Combine(Log.Folder, "WebView2"));
            var controller = await env.CreateCoreWebView2ControllerAsync(parent);
            controller.IsVisible = false;
            web = controller.CoreWebView2;
            web.Settings.AreDevToolsEnabled = false;
            web.Settings.AreDefaultContextMenusEnabled = false;
            web.Settings.IsStatusBarEnabled = false;
            web.SetVirtualHostNameToFolderMapping(Host, Path.Combine(AppContext.BaseDirectory, "engine"), CoreWebView2HostResourceAccessKind.Deny);
            // 100% local: the page only ever gets the app's own files (its
            // Content-Security-Policy says the same).
            web.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
            web.WebResourceRequested += (_, e) =>
            {
                if (!e.Request.Uri.StartsWith($"https://{Host}/", StringComparison.OrdinalIgnoreCase))
                    e.Response = env.CreateWebResourceResponse(null, 403, "Blocked", "");
            };
            web.WebMessageReceived += OnMessage;
            web.Navigate($"https://{Host}/engine.html");
            await ready.Task;
            Log.Write("engines ready, WebView2 " + env.BrowserVersionString);
        }

        void OnMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("type", out var type) && type.GetString() == "ready")
            {
                ready.TrySetResult();
                return;
            }
            if (root.TryGetProperty("id", out var id) && waiting.Remove(id.GetInt32(), out var answer))
                answer.SetResult(root.Clone());
        }

        Task<JsonElement> Ask(string type, object payload)
        {
            var id = ++nextId;
            var answer = new TaskCompletionSource<JsonElement>();
            waiting[id] = answer;
            var message = JsonSerializer.SerializeToNode(payload, Json)!.AsObject();
            message["id"] = id;
            message["type"] = type;
            web!.PostWebMessageAsJson(message.ToJsonString());
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
