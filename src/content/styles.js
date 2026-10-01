/* exported FC_CSS */

// Injected into FreeCorrector's shadow root, so page styles never leak in.
const FC_CSS = `
:host { all: initial; }

* { box-sizing: border-box; }

[hidden] { display: none !important; }

.fc-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  --fc-spelling: #e5484d;
  --fc-grammar: #f5a524;
  --fc-style: #3b82f6;
  --fc-ok: #2fa86b;
  --fc-bg: #ffffff;
  --fc-fg: #1d2129;
  --fc-muted: #6b7280;
  --fc-border: #e3e6ea;
  --fc-hover: #f2f4f7;
  --fc-accent: #2563eb;
  font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

@media (prefers-color-scheme: dark) {
  .fc-layer {
    --fc-bg: #1f2329;
    --fc-fg: #e8eaed;
    --fc-muted: #9aa1ab;
    --fc-border: #343a42;
    --fc-hover: #2a2f36;
    --fc-accent: #60a5fa;
  }
}

/* ---------- Mirror overlay that draws the underlines ---------- */

.fc-mirror {
  position: absolute;
  overflow: hidden;
  pointer-events: none;
  color: transparent;
  background: transparent;
  border: 0;
  margin: 0;
}

.fc-mirror-inner {
  color: transparent;
  will-change: transform;
}

.fc-err {
  text-decoration-line: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
  text-decoration-skip-ink: none;
  text-decoration-color: var(--fc-grammar);
  border-radius: 2px;
}
.fc-err.fc-spelling { text-decoration-color: var(--fc-spelling); }
.fc-err.fc-grammar { text-decoration-color: var(--fc-grammar); }
.fc-err.fc-style, .fc-err.fc-typo { text-decoration-color: var(--fc-style); }
.fc-err.fc-active.fc-spelling { background: color-mix(in srgb, var(--fc-spelling) 18%, transparent); }
.fc-err.fc-active.fc-grammar { background: color-mix(in srgb, var(--fc-grammar) 22%, transparent); }
.fc-err.fc-active.fc-style, .fc-err.fc-active.fc-typo { background: color-mix(in srgb, var(--fc-style) 18%, transparent); }

/* ---------- Error counter badge ---------- */

.fc-badge {
  position: absolute;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  cursor: pointer;
  user-select: none;
  font: 600 11px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: #fff;
  background: var(--fc-ok);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.12s ease, background-color 0.15s ease;
}
.fc-badge:hover { transform: scale(1.1); }
.fc-badge[data-state="errors"] { background: var(--fc-spelling); }
.fc-badge[data-state="errors"].fc-only-minor { background: var(--fc-grammar); }
.fc-badge[data-state="checking"] { background: var(--fc-muted); }
.fc-badge[data-state="checking"]::after {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: var(--fc-muted);
  animation: fc-spin 0.8s linear infinite;
}
.fc-badge[data-state="error"] { background: var(--fc-muted); }
.fc-badge svg { width: 12px; height: 12px; }

@keyframes fc-spin { to { transform: rotate(360deg); } }

/* ---------- Suggestion card & error list panel ---------- */

.fc-card, .fc-panel {
  position: absolute;
  pointer-events: auto;
  background: var(--fc-bg);
  color: var(--fc-fg);
  border: 1px solid var(--fc-border);
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  text-align: left;
}

.fc-card { width: 320px; max-width: calc(100vw - 16px); padding: 12px; }

.fc-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--fc-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.fc-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--fc-grammar); }
.fc-dot.fc-spelling { background: var(--fc-spelling); }
.fc-dot.fc-style, .fc-dot.fc-typo { background: var(--fc-style); }

.fc-msg { margin: 6px 0 10px; font-size: 14px; }

.fc-repls { display: flex; flex-wrap: wrap; gap: 6px; }
.fc-repl {
  all: unset;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--fc-accent);
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  white-space: pre;
}
.fc-repl:hover { filter: brightness(1.1); }
.fc-repl.fc-empty { font-style: italic; font-weight: 400; }

.fc-actions {
  display: flex;
  gap: 4px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--fc-border);
}
.fc-action {
  all: unset;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--fc-muted);
}
.fc-action:hover { background: var(--fc-hover); color: var(--fc-fg); }

.fc-panel { width: 360px; max-width: calc(100vw - 16px); display: flex; flex-direction: column; max-height: 420px; }
.fc-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--fc-border);
  font-weight: 600;
}
.fc-close { all: unset; cursor: pointer; padding: 2px 6px; border-radius: 6px; color: var(--fc-muted); font-size: 16px; }
.fc-close:hover { background: var(--fc-hover); }
.fc-list { overflow-y: auto; padding: 4px 0; }
.fc-item { padding: 10px 12px; border-bottom: 1px solid var(--fc-border); }
.fc-item:last-child { border-bottom: 0; }
.fc-context { font-size: 13px; color: var(--fc-muted); margin: 4px 0 8px; cursor: pointer; }
.fc-context mark {
  background: none;
  color: var(--fc-fg);
  font-weight: 600;
  text-decoration: underline 2px var(--fc-grammar);
  text-underline-offset: 3px;
}
.fc-context mark.fc-spelling { text-decoration-color: var(--fc-spelling); }
.fc-context mark.fc-style, .fc-context mark.fc-typo { text-decoration-color: var(--fc-style); }
.fc-empty-state { padding: 20px 12px; text-align: center; color: var(--fc-muted); }
.fc-foot { padding: 6px 12px; font-size: 11px; color: var(--fc-muted); border-top: 1px solid var(--fc-border); }
`;
