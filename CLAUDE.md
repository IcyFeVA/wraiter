# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Starstrike is a Tauri 2 desktop utility: a global-shortcut overlay that sends clipboard/selected text to an OpenRouter model to proofread, change tone, or draft text, then copies the result back to the clipboard. Frontend is React 19 + TypeScript + Vite; native integration (global shortcut, clipboard, tray, persistent store, autostart, OpenRouter HTTP calls) is Rust via Tauri, all in one file at [src-tauri/src/lib.rs](src-tauri/src/lib.rs). [src-tauri/src/main.rs](src-tauri/src/main.rs) just calls `run()`.

## Commands

```bash
yarn install       # install deps
yarn dev           # Vite dev server only (port 1420, fixed/strict)
yarn tauri dev     # full app: Rust backend + frontend, hot reload
yarn build          # tsc && vite build (frontend only)
yarn tauri build   # produces installable bundles (see Bundling below)
```

There is no test suite and no lint script configured in [package.json](package.json).

## Architecture

### Single overlay window, hidden not closed

There is one webview window, `main` (defined in [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json): 500x200, undecorated, transparent, always-on-top). It is never destroyed — the global shortcut, tray "Show UI" item, and the in-app close button all just toggle visibility via `apply_main_window_visibility`. The window's `CloseRequested` event is intercepted (`api.prevent_close()`) and hides the window instead. Visibility is mirrored into a process-wide `Mutex<bool>` (`MAIN_WINDOW_VISIBLE`) so the shortcut toggle and the OS-reported window state can be kept in sync (`sync_main_window_visibility_from_window`).

The window height auto-adjusts to content via [src/hooks/useWindowResize.ts](src/hooks/useWindowResize.ts), which observes the root element's `scrollHeight` (capped at 700px) and calls the `resize_window` Rust command. Width is fixed at 500.

`src-tauri/capabilities/default.json` grants permissions to windows `["main", "overlay"]`, but no `overlay` window is actually declared in `tauri.conf.json` — treat that as a vestigial/planned reference, not a second window that exists today.

### Settings are split across two persistence layers — know which is which

- **Rust-side `tauri-plugin-store`** (`settings.json` in the app data dir, via `StoreBuilder`): OpenRouter API key, global shortcut string, and the auto-close toggle. Accessed only through the `get_api_key`/`set_api_key`, `get_shortcut`/`set_shortcut`/`reset_shortcut`, `get_auto_close`/`set_auto_close` commands.
- **Browser `localStorage`** (frontend only, Rust never touches it): selected model (`selected_model`), max tokens (`max_tokens`), default tone (`default_tone`), theme (`app_theme`).

The API key is the tricky one: [Settings.tsx](src/components/Settings.tsx) saves it via `invoke('set_api_key', ...)` into the Tauri store, but *also* writes a copy to `localStorage['openrouter_api_key']` "as a fallback." [Overlay.tsx](src/components/Overlay.tsx) — where the key is actually used to call the AI — reads it **only** from `localStorage`, never via `invoke('get_api_key')`. So the localStorage copy in Settings.tsx is not a fallback, it's load-bearing: removing it silently breaks the overlay's ability to authenticate, even though the Rust store still has the key. If you touch either side of this, keep both writes in sync (or unify them onto one source of truth).

### AI request flow

`Overlay.tsx` → `invoke('process_text_with_ai', { text, action, model, apiKey, tone?, maxTokens? })` → Rust builds a system prompt per `action` (`proofread` | `tone` | `draft`) and POSTs to `https://openrouter.ai/api/v1/chat/completions` via `reqwest`. Model list population (`Settings.tsx`) hits `GET https://openrouter.ai/api/v1/models` through the `fetch_openrouter_models` command. Both commands return raw/mapped errors distinguishing 401/403/429 so the frontend can show specific messages — preserve that distinction if you touch error handling.

### Themes

Themes are plain CSS files under [src/themes/](src/themes/) (NSX, Aqua, AquaDark, Console, Abelton, Lamasass, ICQ, Ampwin, Maverick), applied by setting a `theme-{name}` class on `<body>` and on the root app div. [ThemeContext.tsx](src/contexts/ThemeContext.tsx) owns the selected theme and persists it to `localStorage['app_theme']` — a third, independent persistence path from the two above. `Console` theme exists as a file but is commented out of the selector in `AppSettings.tsx`.

### Naming inconsistencies across config files

The product has been renamed at least once; several identifiers still disagree:
- `package.json` name: `wraiter`
- Rust lib name (`src-tauri/Cargo.toml`): `wraiter_lib`, but the Cargo *package* name is `Starstrike`
- Tauri `productName`: `Starstrike`, bundle identifier: `com.crushy.nsxt`

None of this is broken, but don't assume `wraiter`/`Starstrike`/`nsxt` are typos if you see them — they refer to the same app.

### Bundling

`src-tauri/tauri.conf.json` currently sets `bundle.targets` to `["deb", "rpm"]` only, even though icons for Windows (`.ico`) and macOS (`.icns`) are present and the README/project brief describe this as a Windows+macOS tool. If asked to produce Windows/macOS builds, the targets list will need to be widened (and built on/for that OS).

### Stray file

[src-tauri/srcs/lib.rs](src-tauri/srcs/lib.rs) (note: `srcs`, not `src`) is a duplicate/old copy of the real backend file and is **not** part of the build — Cargo only compiles `src-tauri/src/`. Don't edit it by mistake; if it's confirmed dead weight, it's safe to remove, but confirm with the user first since it may be an intentional backup.
