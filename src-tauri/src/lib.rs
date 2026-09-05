// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use tauri::menu::{CheckMenuItem, Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutEvent, ShortcutState};
use tauri_plugin_store::StoreBuilder;
use std::str::FromStr;
use std::sync::Mutex;
use std::time::{Duration, Instant};

const STORE_FILE: &str = "settings.json";
const DEFAULT_SHORTCUT: &str = "CommandOrControl+Shift+A";
const DEFAULT_TONE: &str = "professional";
const DEFAULT_THEME: &str = "NSX";
const DEFAULT_MAX_TOKENS: u32 = 2000;

// Global static for debouncing shortcut triggers
static LAST_SHORTCUT_TRIGGER: Mutex<Option<Instant>> = Mutex::new(None);
// Keep the app's desired window visibility in sync across shortcut and close-button flows
static MAIN_WINDOW_VISIBLE: Mutex<bool> = Mutex::new(true);

/// The single source of truth for user configuration.
///
/// Persisted as flat keys in `settings.json` (app data dir) through
/// tauri-plugin-store. The frontend reads it via `get_settings` and writes it
/// via `update_settings` — it must not keep its own copy in localStorage.
/// Field names are deliberately snake_case on both sides of the IPC boundary so
/// the store file, the Rust struct and the TypeScript interface all use one
/// vocabulary.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub shortcut: String,
    pub auto_close: bool,
    pub openrouter_api_key: String,
    pub selected_model: String,
    pub max_tokens: u32,
    pub default_tone: String,
    pub theme: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            shortcut: DEFAULT_SHORTCUT.to_string(),
            auto_close: true,
            openrouter_api_key: String::new(),
            selected_model: String::new(),
            max_tokens: DEFAULT_MAX_TOKENS,
            default_tone: DEFAULT_TONE.to_string(),
            theme: DEFAULT_THEME.to_string(),
        }
    }
}

/// A partial update. Every field is optional so a caller can change one value
/// without sending — and risking clobbering — the rest.
#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct SettingsPatch {
    pub shortcut: Option<String>,
    pub auto_close: Option<bool>,
    pub openrouter_api_key: Option<String>,
    pub selected_model: Option<String>,
    pub max_tokens: Option<u32>,
    pub default_tone: Option<String>,
    pub theme: Option<String>,
}

fn ensure_store_dir(app: &tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn load_settings(app: &tauri::AppHandle) -> Result<Settings, String> {
    ensure_store_dir(app)?;
    let store = StoreBuilder::new(app, STORE_FILE)
        .build()
        .map_err(|e| e.to_string())?;
    // A missing file just means "no settings saved yet" — fall through to defaults.
    let _ = store.reload();

    let entries: serde_json::Map<String, serde_json::Value> = store.entries().into_iter().collect();
    Ok(
        serde_json::from_value(serde_json::Value::Object(entries)).unwrap_or_else(|e| {
            eprintln!("Could not parse stored settings, using defaults: {}", e);
            Settings::default()
        }),
    )
}

fn save_settings(app: &tauri::AppHandle, settings: &Settings) -> Result<(), String> {
    ensure_store_dir(app)?;
    let store = StoreBuilder::new(app, STORE_FILE)
        .build()
        .map_err(|e| e.to_string())?;

    let value = serde_json::to_value(settings).map_err(|e| e.to_string())?;
    if let serde_json::Value::Object(map) = value {
        for (key, entry) in map {
            store.set(key, entry);
        }
    }

    store.save().map_err(|e| e.to_string())
}

fn sync_main_window_visibility_from_window(app: &tauri::AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("main") {
        let visible = window.is_visible().unwrap_or(false);
        if let Ok(mut state) = MAIN_WINDOW_VISIBLE.lock() {
            *state = visible;
        }
        Ok(visible)
    } else {
        Err("Main window not found".to_string())
    }
}

fn apply_main_window_visibility(app: &tauri::AppHandle, visible: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        if visible {
            window.show().map_err(|e| e.to_string())?;
            window.center().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        } else {
            window.hide().map_err(|e| e.to_string())?;
        }

        if let Ok(mut state) = MAIN_WINDOW_VISIBLE.lock() {
            *state = visible;
        }

        Ok(())
    } else {
        Err("Main window not found".to_string())
    }
}

/// Parse and register the global shortcut. The string is parsed *before* the
/// previous binding is torn down, so an invalid shortcut leaves the working one
/// in place.
fn register_shortcut(app: &tauri::AppHandle, shortcut: &str) -> Result<(), String> {
    let parsed = Shortcut::from_str(shortcut)
        .map_err(|e| format!("Invalid shortcut \"{}\": {}", shortcut, e))?;

    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())?;

    app.global_shortcut()
        .on_shortcut(parsed, |app: &tauri::AppHandle, _shortcut: &Shortcut, event: ShortcutEvent| {
            // The handler fires for both press and release. Acting on release
            // only gives a single toggle per keypress no matter how long the
            // key is held — pressing fired "show" and releasing fired "hide".
            if event.state != ShortcutState::Released {
                return;
            }

            // Guard against a duplicated release event from the OS. Kept well
            // below human double-tap speed so intentional taps still register.
            if let Ok(mut last_trigger) = LAST_SHORTCUT_TRIGGER.lock() {
                if let Some(last) = *last_trigger {
                    if last.elapsed() < Duration::from_millis(50) {
                        return;
                    }
                }
                *last_trigger = Some(Instant::now());
            }

            let app_handle_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = toggle_main_window_visibility(app_handle_clone).await {
                    eprintln!("Failed to toggle main window visibility: {}", e);
                }
            });
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    load_settings(&app)
}

/// Merge `patch` into the stored settings and return the result. Re-registers
/// the global shortcut when it changed.
#[tauri::command]
async fn update_settings(app: tauri::AppHandle, patch: SettingsPatch) -> Result<Settings, String> {
    let mut settings = load_settings(&app)?;

    let shortcut_changed = patch
        .shortcut
        .as_ref()
        .is_some_and(|next| *next != settings.shortcut);

    if let Some(value) = patch.shortcut {
        settings.shortcut = value;
    }
    if let Some(value) = patch.auto_close {
        settings.auto_close = value;
    }
    if let Some(value) = patch.openrouter_api_key {
        settings.openrouter_api_key = value;
    }
    if let Some(value) = patch.selected_model {
        settings.selected_model = value;
    }
    if let Some(value) = patch.max_tokens {
        settings.max_tokens = value;
    }
    if let Some(value) = patch.default_tone {
        settings.default_tone = value;
    }
    if let Some(value) = patch.theme {
        settings.theme = value;
    }

    // Register before saving so a rejected shortcut is never persisted.
    if shortcut_changed {
        register_shortcut(&app, &settings.shortcut)?;
    }

    save_settings(&app, &settings)?;
    Ok(settings)
}

#[tauri::command]
async fn reset_shortcut(app: tauri::AppHandle) -> Result<Settings, String> {
    update_settings(
        app,
        SettingsPatch {
            shortcut: Some(DEFAULT_SHORTCUT.to_string()),
            ..Default::default()
        },
    )
    .await
}

#[tauri::command]
async fn enable_autostart(app: tauri::AppHandle) -> Result<(), String> {
    app.autolaunch().enable().map_err(|e| e.to_string())
}

#[tauri::command]
async fn disable_autostart(app: tauri::AppHandle) -> Result<(), String> {
    app.autolaunch().disable().map_err(|e| e.to_string())
}

#[tauri::command]
async fn is_autostart_enabled(app: tauri::AppHandle) -> Result<bool, String> {
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_main_window_visibility(app: tauri::AppHandle) -> Result<(), String> {
    let is_visible = sync_main_window_visibility_from_window(&app)?;
    apply_main_window_visibility(&app, !is_visible)
}

#[tauri::command]
async fn hide_main_window(app: tauri::AppHandle) -> Result<(), String> {
    apply_main_window_visibility(&app, false)
}

#[tauri::command]
async fn get_clipboard_text(app: tauri::AppHandle) -> Result<String, String> {
    let clipboard = app.clipboard();
    match clipboard.read_text() {
        Ok(text) => Ok(text),
        Err(e) => Err(format!("Failed to read clipboard: {}", e))
    }
}

#[tauri::command]
async fn set_clipboard_text(app: tauri::AppHandle, text: String) -> Result<(), String> {
    let clipboard = app.clipboard();
    match clipboard.write_text(&text) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to write to clipboard: {}", e))
    }
}

fn describe_api_error(status: reqwest::StatusCode, body: String) -> String {
    match status.as_u16() {
        401 => format!("Authentication failed (401 Unauthorized): {}", body),
        403 => format!("Access forbidden (403 Forbidden): {}", body),
        429 => format!("Rate limit exceeded (429 Too Many Requests): {}", body),
        _ => format!("API request failed ({}): {}", status, body),
    }
}

/// Reads the API key from the store — it never travels through the frontend.
#[tauri::command]
async fn fetch_openrouter_models(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let settings = load_settings(&app)?;
    if settings.openrouter_api_key.is_empty() {
        return Err("No OpenRouter API key saved. Add one in Settings first.".to_string());
    }

    let client = reqwest::Client::new();
    let response = client
        .get("https://openrouter.ai/api/v1/models")
        .header("Authorization", format!("Bearer {}", settings.openrouter_api_key))
        .header("Content-Type", "application/json")
        .send()
        .await;

    match response {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                match resp.json::<serde_json::Value>().await {
                    Ok(models) => Ok(models["data"].as_array().cloned().unwrap_or_default()),
                    Err(e) => Err(format!("Failed to parse models response: {}", e))
                }
            } else {
                let body = resp.text().await.unwrap_or_default();
                Err(describe_api_error(status, body))
            }
        }
        Err(e) => Err(format!("Failed to connect to OpenRouter API: {}", e))
    }
}

/// The model, token budget and API key all come from the store; the frontend
/// only says what to do with which text.
#[tauri::command]
async fn process_text_with_ai(
    app: tauri::AppHandle,
    text: String,
    action: String,
    tone: Option<String>,
) -> Result<String, String> {
    let settings = load_settings(&app)?;

    if settings.openrouter_api_key.is_empty() {
        return Err("No OpenRouter API key saved. Add one in Settings first.".to_string());
    }
    if settings.selected_model.is_empty() {
        return Err("No model selected. Choose one in Settings first.".to_string());
    }

    let system_prompt = match action.as_str() {
        "proofread" => "You are a professional editor. Please proofread and correct the following text for grammar, spelling, punctuation, and clarity. Return only the corrected text without additional commentary.".to_string(),
        "tone" => {
            let tone_desc = tone.unwrap_or_else(|| settings.default_tone.clone());
            format!("You are a writing assistant. Please rewrite the following text in a {} tone. Maintain the original meaning but adjust the style and language to match the requested tone. Return only the rewritten text without additional commentary.", tone_desc)
        },
        "draft" => "You are a helpful writing assistant. Please help improve and expand the following text to make it more complete, clear, and professional. Return only the improved text without additional commentary.".to_string(),
        _ => return Err("Unknown action specified".to_string())
    };

    let request_body = serde_json::json!({
        "model": settings.selected_model,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": text
            }
        ],
        "max_tokens": settings.max_tokens,
        "temperature": 0.7
    });

    let client = reqwest::Client::new();
    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", settings.openrouter_api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await;

    match response {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                match resp.json::<serde_json::Value>().await {
                    Ok(result) => {
                        if let Some(content) = result["choices"][0]["message"]["content"].as_str() {
                            Ok(content.trim().to_string())
                        } else {
                            Err("No content in AI response".to_string())
                        }
                    }
                    Err(e) => Err(format!("Failed to parse AI response: {}", e))
                }
            } else {
                let body = resp.text().await.unwrap_or_default();
                Err(describe_api_error(status, body))
            }
        }
        Err(e) => Err(format!("Failed to connect to OpenRouter API: {}", e))
    }
}

#[tauri::command]
async fn resize_window(app: tauri::AppHandle, height: f64) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let size = tauri::LogicalSize::new(500.0, height);
        window.set_size(size).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn copy_dir_all(from: &std::path::Path, to: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(to)?;
    for entry in std::fs::read_dir(from)? {
        let entry = entry?;
        let target = to.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_all(&entry.path(), &target)?;
        } else {
            std::fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}

/// One-time migration for the rename from `com.crushy.nsxt` to
/// `com.crushy.starstrike`: the bundle identifier names the app data dir, so an
/// existing install's data would otherwise be orphaned. Two things live there —
/// the settings store, and the webview's localStorage, which older versions used
/// for the model/tone/theme settings (`migrateLegacyLocalStorage` on the
/// frontend picks those up once they are visible again).
/// Safe to delete once every install has started at least once post-rename.
fn migrate_legacy_store(app: &tauri::AppHandle) {
    const LEGACY_IDENTIFIER: &str = "com.crushy.nsxt";
    const LOCAL_STORAGE_DIR: &str = "localstorage";

    let Ok(app_data_dir) = app.path().app_data_dir() else {
        return;
    };
    let Some(parent) = app_data_dir.parent() else {
        return;
    };
    let legacy_dir = parent.join(LEGACY_IDENTIFIER);
    if !legacy_dir.exists() {
        return;
    }

    if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
        eprintln!("Failed to create app data dir for migration: {}", e);
        return;
    }

    // Each item is guarded separately so a partially migrated dir still completes.
    let legacy_store = legacy_dir.join(STORE_FILE);
    let target_store = app_data_dir.join(STORE_FILE);
    if legacy_store.exists() && !target_store.exists() {
        match std::fs::copy(&legacy_store, &target_store) {
            Ok(_) => println!("Migrated settings from {}", legacy_store.display()),
            Err(e) => eprintln!("Failed to migrate legacy settings: {}", e),
        }
    }

    let legacy_storage = legacy_dir.join(LOCAL_STORAGE_DIR);
    let target_storage = app_data_dir.join(LOCAL_STORAGE_DIR);
    if legacy_storage.is_dir() && !target_storage.exists() {
        match copy_dir_all(&legacy_storage, &target_storage) {
            Ok(_) => println!("Migrated localStorage from {}", legacy_storage.display()),
            Err(e) => eprintln!("Failed to migrate legacy localStorage: {}", e),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_settings,
            update_settings,
            reset_shortcut,
            toggle_main_window_visibility,
            hide_main_window,
            get_clipboard_text,
            set_clipboard_text,
            fetch_openrouter_models,
            process_text_with_ai,
            resize_window,
            enable_autostart,
            disable_autostart,
            is_autostart_enabled
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();

            migrate_legacy_store(&app_handle);

            let settings = load_settings(&app_handle).unwrap_or_default();
            if let Err(e) = register_shortcut(&app_handle, &settings.shortcut) {
                eprintln!("Failed to register shortcut, falling back to default: {}", e);
                if let Err(e) = register_shortcut(&app_handle, DEFAULT_SHORTCUT) {
                    eprintln!("Failed to register default shortcut: {}", e);
                }
            }

            let autostart_manager = app.autolaunch();
            let is_enabled = autostart_manager.is_enabled().unwrap_or(false);
            let show = MenuItem::with_id(app, "show", "Show UI", true, None::<&str>)?;
            let startup = CheckMenuItem::with_id(app, "startup", "Start on Boot", true, is_enabled, None::<&str>)?;
            let exit = MenuItem::with_id(app, "exit", "Exit App", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &startup, &exit])?;
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            let _ = apply_main_window_visibility(&app, true);
                        }
                        "startup" => {
                            let autostart_manager = app.autolaunch();
                            if let Ok(is_enabled) = autostart_manager.is_enabled() {
                                if is_enabled {
                                    let _ = autostart_manager.disable();
                                } else {
                                    let _ = autostart_manager.enable();
                                }
                            }
                        }
                        "exit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            let window = app.get_webview_window("main").unwrap();
            let window_visible = window.is_visible().unwrap_or(true);
            if let Ok(mut state) = MAIN_WINDOW_VISIBLE.lock() {
                *state = window_visible;
            }

            // Check if autostart is enabled and hide window if so
            if let Ok(is_enabled) = app.autolaunch().is_enabled() {
                if is_enabled {
                    let _ = apply_main_window_visibility(&app_handle, false);
                }
            }

            let app_for_close = app_handle.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    let _ = apply_main_window_visibility(&app_for_close, false);
                    api.prevent_close();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
