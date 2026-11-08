using System;
using System.Collections.Generic;
using System.Diagnostics;
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
    //
    // Idle, the engines go to sleep: once the page has stopped them (engine/host.js,
    // a few minutes without a check), the app closes it, and WebView2's processes
    // exit with it (about 130 MB given back). The next question wakes them up.
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
        Task? starting;
        // WebView2's browser process of `Environment` still runs (it exits with the last page closed).
        bool browserAlive;
        // The page has stopped its engines for being idle.
        bool idle;
        // Windows showing the app's pages (the settings): no sleep while one is open,
        // its changes reach the app through the engines' page.
        int holds;
        DateTime restartedAt = DateTime.MinValue;
        int nextId;

        CoreWebView2Environment Environment = null!;

        // The settings window changed something.
        public event Action? SettingsChanged;

        public async Task StartAsync(IntPtr parent)
        {
            this.parent = parent;
            await WakeAsync();
            Log.Write("engines ready, WebView2 " + Environment.BrowserVersionString);
        }

        // --probe gets its own folder: two processes sharing one also share
        // WebView2's processes, and the probe's exit would stop the app's engines.
        // No GPU: the engines' page is never shown and the settings window is a
        // plain page; WebView2's GPU process alone takes about 30 MB more.
        static Task<CoreWebView2Environment> CreateEnvironmentAsync() =>
            CoreWebView2Environment.CreateAsync(null, Path.Combine(Log.Folder, Program.Probing ? "WebView2-probe" : "WebView2"),
                new CoreWebView2EnvironmentOptions { AdditionalBrowserArguments = "--disable-gpu" });

        async Task NewEnvironmentAsync()
        {
            var env = await CreateEnvironmentAsync();
            env.BrowserProcessExited += (_, _) => { if (Environment == env) browserAlive = false; };
            Environment = env;
            browserAlive = true;
        }

        // Starts the engines if they are not running (or starting).
        Task WakeAsync()
        {
            if (web != null) return Task.CompletedTask;
            if (starting == null)
            {
                starting = StartEnginesAsync();
                starting.ContinueWith(_ => starting = null, TaskScheduler.FromCurrentSynchronizationContext());
            }
            return starting;
        }

        async Task StartEnginesAsync()
        {
            var clock = Stopwatch.StartNew();
            var first = Environment == null;
            if (first || !browserAlive) await NewEnvironmentAsync();
            try { await LoadAsync(); }
            catch (Exception e) when (!first)
            {
                // The browser process was on its way out (asleep a moment ago): a new one.
                Log.Write("engine start: " + e.Message + ", new WebView2 environment");
                Detach();
                await Task.Delay(500);
                await NewEnvironmentAsync();
                await LoadAsync();
            }
            if (!first) Log.Write($"engines awake ({clock.ElapsedMilliseconds} ms)");
        }

        async Task LoadAsync()
        {
            ready = new();
            idle = false; // the page warms an engine up (bridge.js)
            controller = await Environment.CreateCoreWebView2ControllerAsync(parent);
            controller.IsVisible = false;
            web = controller.CoreWebView2;
            Secure(web);
            web.WebMessageReceived += OnMessage;
            web.ProcessFailed += OnProcessFailed;
            web.Navigate($"https://{Host}/engine.html?lang={(L.French ? "fr" : "en")}");
            await ready.Task;
            foreach (var (message, _) in waiting.Values) web.PostWebMessageAsJson(message);
        }

        // Closes the engines' page.
        void Detach()
        {
            if (web != null)
            {
                web.WebMessageReceived -= OnMessage;
                web.ProcessFailed -= OnProcessFailed;
                web = null;
            }
            try { controller?.Close(); } catch (Exception) { }
            controller = null;
        }

        void TrySleep()
        {
            if (!idle || web == null || starting != null || holds > 0 || waiting.Count > 0) return;
            Detach();
            Log.Write("engines asleep");
        }

        public void Hold() => holds++;

        public void Release()
        {
            holds--;
            TrySleep();
        }

        // The environment for another page of the app (the settings window), engines awake.
        public async Task<CoreWebView2Environment> EnvironmentAsync()
        {
            await WakeAsync();
            return Environment;
        }

        // WebView2's processes can stop (a crash, a WebView2 update…): the
        // engines restart and the questions in flight are asked again. At once
        // only if they did not fail within the last half minute, so a page that
        // keeps failing does not loop: then the next question starts them.
        async void OnProcessFailed(object? sender, CoreWebView2ProcessFailedEventArgs e)
        {
            var kind = e.ProcessFailedKind;
            Log.Write("engine process failed: " + kind);
            if (kind != CoreWebView2ProcessFailedKind.BrowserProcessExited && kind != CoreWebView2ProcessFailedKind.RenderProcessExited) return;
            if (web == null || sender != web) return;
            Detach();
            if (kind == CoreWebView2ProcessFailedKind.BrowserProcessExited) browserAlive = false;
            if (DateTime.UtcNow - restartedAt < TimeSpan.FromSeconds(30)) { Log.Write("engines failed again: not restarted"); return; }
            restartedAt = DateTime.UtcNow;
            try
            {
                await Task.Delay(1000);
                await WakeAsync();
                Log.Write("engines restarted");
            }
            catch (Exception ex) { Log.Write("engine restart: " + ex.Message); }
        }

        public static string Url(string path) => $"https://{Host}/{path}";

        // The app's pages, for the engines and the settings window: the app's own
        // files and nothing else, so that everything stays on the computer.
        public void Secure(CoreWebView2 view)
        {
            var env = Environment;
            view.Settings.AreDevToolsEnabled = false;
            view.Settings.AreDefaultContextMenusEnabled = false;
            view.Settings.IsStatusBarEnabled = false;
            view.Settings.IsZoomControlEnabled = false;
            view.SetVirtualHostNameToFolderMapping(Host, Path.Combine(AppContext.BaseDirectory, "engine"), CoreWebView2HostResourceAccessKind.Deny);
            view.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
            view.WebResourceRequested += (_, e) =>
            {
                if (!new Uri(e.Request.Uri).Host.Equals(Host, StringComparison.OrdinalIgnoreCase))
                    e.Response = env.CreateWebResourceResponse(null, 403, "Blocked", "");
            };
        }

        void OnMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("type", out var type))
            {
                switch (type.GetString())
                {
                    case "ready": ready.TrySetResult(); break;
                    case "settings": SettingsChanged?.Invoke(); break;
                    case "idle": idle = true; TrySleep(); break;
                }
                return;
            }
            if (root.TryGetProperty("id", out var id) && waiting.Remove(id.GetInt32(), out var question))
                question.Answer.SetResult(root.Clone());
        }

        // While the engines start (or restart), the question waits for them.
        Task<JsonElement> Ask(string type, object payload)
        {
            var id = ++nextId;
            var answer = new TaskCompletionSource<JsonElement>();
            var message = JsonSerializer.SerializeToNode(payload, Json)!.AsObject();
            message["id"] = id;
            message["type"] = type;
            waiting[id] = (message.ToJsonString(), answer);
            if (type == "check") idle = false;
            if (web == null) WakeAsync().ContinueWith(t => Log.Write("engine wake: " + t.Exception!.GetBaseException().Message),
                                                      TaskContinuationOptions.OnlyOnFaulted);
            else if (ready.Task.IsCompleted) web.PostWebMessageAsJson(waiting[id].Message);
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
