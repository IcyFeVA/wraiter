# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Starstrike is a Tauri 2 desktop utility: a global-shortcut overlay that sends clipboard/selected text to an OpenRouter model to proofread, change tone, or draft text, then copies the result back to the clipboard. Frontend is React 19 + TypeScript + Vite; native integration (global shortcut, clipboard, tray, persistent store, autostart, OpenRouter HTTP calls) is Rust via Tauri, all in one file at [src-tauri/src/lib.rs](src-tauri/src/lib.rs). [src-tauri/src/main.rs](src-tauri/src/main.rs) just calls `run()`.

## Commands

```bash
yarn install       # install deps
yarn dev           # Vite dev server only (port 1420, fixed/strict)
yarn tauri dev     # full app: Rust backend + frontend, hot reload
yarn build         # tsc && vite build (frontend only)
yarn tauri build   # produces an .rpm bundle
```

There is no test suite and no lint script configured in [package.json](package.json). After changing Rust, `cd src-tauri && cargo check` is the fast feedback loop.

## Architecture

### Settings: the Tauri store is the only source of truth

All user configuration lives in one `Settings` struct in [src-tauri/src/lib.rs](src-tauri/src/lib.rs), persisted as flat keys in `settings.json` in the app data dir (`~/.local/share/com.crushy.starstrike/` on Linux) via tauri-plugin-store. The frontend never persists settings itself — **do not reintroduce `localStorage` for anything that belongs in `Settings`**.

The whole surface is three commands:
- `get_settings() -> Settings`
- `update_settings(patch) -> Settings` — merges only the fields present in the patch and returns the merged result, so a caller can change one value without clobbering the rest. Re-registers the global shortcut when `shortcut` changes (parsing first, so an invalid shortcut is rejected before the working one is torn down, and is never persisted).
- `reset_shortcut() -> Settings`

Field names are snake_case on both sides of the IPC boundary (`auto_close`, `openrouter_api_key`, `max_tokens`, …) so the store file, the Rust struct, and the TypeScript interface share one vocabulary. When adding a setting, add it in three places: the `Settings` struct + its `Default`, `SettingsPatch`, and the `Settings` interface in [src/contexts/SettingsContext.tsx](src/contexts/SettingsContext.tsx). Missing keys fall back to `Default` via `#[serde(default)]`, so adding a field is backward compatible with existing store files.

Autostart is the one setting *not* in the store — it's OS-level state owned by tauri-plugin-autostart, read/written through `is_autostart_enabled` / `enable_autostart` / `disable_autostart`.

On the frontend, [src/contexts/SettingsContext.tsx](src/contexts/SettingsContext.tsx) loads the settings once and exposes `{ settings, isLoaded, updateSettings, resetShortcut }` via `useSettings()`. It also owns theme application (body class). Components keep local draft state only for inputs that shouldn't write on every keystroke (API key, shortcut, max tokens — the latter commits on blur).

### The API key never reaches the frontend's request path

`process_text_with_ai(text, action, tone?)` and `fetch_openrouter_models()` read the key, model, and token budget from the store inside Rust. The frontend only says what to do with which text. Keep it that way — don't add an `apiKey` parameter back to those commands. The key is still readable via `get_settings` (the Settings screen needs to show whether one is set), but it is not passed around to make requests.

### Single overlay window, hidden not closed

There is one webview window, `main` (defined in [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json): 500x200, undecorated, transparent, always-on-top). It is never destroyed — the global shortcut, tray "Show UI" item, and the in-app close button all just toggle visibility via `apply_main_window_visibility`. The window's `CloseRequested` event is intercepted (`api.prevent_close()`) and hides the window instead. Visibility is mirrored into a process-wide `Mutex<bool>` (`MAIN_WINDOW_VISIBLE`) so the shortcut toggle and the OS-reported window state can be kept in sync.

The global shortcut handler **must act on `ShortcutState::Released` only** (see `register_shortcut`). `on_shortcut` fires for both press and release, so handling both toggled twice per keypress — the window appeared on press and vanished on release when the key was held. The X11 backend sends exactly one `Pressed` and one `Released` per physical press (auto-repeat is filtered by the plugin), so release-only gives one toggle regardless of hold duration. The short debounce that remains is only a guard against a duplicated OS event; it is deliberately well under human double-tap speed so real taps are never swallowed.

The window height auto-adjusts to content via [src/hooks/useWindowResize.ts](src/hooks/useWindowResize.ts), which observes the root element's `scrollHeight` (capped at 700px) and calls the `resize_window` Rust command. Width is fixed at 500.

`src-tauri/capabilities/default.json` grants permissions to windows `["main", "overlay"]`, but no `overlay` window is actually declared in `tauri.conf.json` — treat that as a vestigial/planned reference, not a second window that exists today.

### Themes

Themes are plain CSS files under [src/themes/](src/themes/), applied by setting a `theme-{name}` class on `<body>` (from `SettingsContext`) and on the root app div (from `App.tsx`). The canonical list is the `THEMES` const in `SettingsContext`; adding a theme means adding the name there, the CSS file, and its import in [src/main.tsx](src/main.tsx). `Console` has a stylesheet but is deliberately filtered out of the picker in `AppSettings.tsx`.

### Versioning — bump in one place

The app version lives **only** in `version` in [src-tauri/Cargo.toml](src-tauri/Cargo.toml). `tauri.conf.json` deliberately has no `version` key so Tauri falls back to Cargo.toml, and the UI reads it at runtime with `getVersion()` rather than hardcoding it. Don't re-add a version to `tauri.conf.json` or type one into a component.

This matters for installs, not just tidiness: the rpm's NEVRA comes from this version, so shipping two different builds as the same version makes `dnf install`/`upgrade` a no-op ("nothing to do") and forces a `remove` + `install`. Bump the version for any build you intend to install over an existing one.

### Platform targets

Linux-only for now: `bundle.targets` is `["rpm"]`. The app is *intended* for Linux, Windows and macOS — Windows/macOS icons and the NSIS config are kept in place for that — but cross-platform builds are explicitly deferred, so don't treat the Linux-only target list as a bug.

### Two one-time migrations (removable later)

Both exist to carry an already-installed copy of the app across the changes above, and can be deleted once every install has started at least once:
1. `migrate_legacy_store` in `lib.rs` — the bundle identifier changed from `com.crushy.nsxt` to `com.crushy.starstrike`, which moves the app data dir; this copies the old `settings.json` across on first launch.
2. `migrateLegacyLocalStorage` in `SettingsContext.tsx` — settings used to be split between the store and `localStorage`; this moves any leftover localStorage values into the store and clears them. It only fills fields the store doesn't already have, so a newer stored value always wins.
