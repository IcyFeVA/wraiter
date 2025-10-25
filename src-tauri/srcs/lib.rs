// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_store::{Store, StoreBuilder};
use std::str::FromStr;
use tauri::Wry;

const SHORTCUT_KEY: &str = "shortcut";
const DEFAULT_SHORTCUT: &str = "CommandOrControl+Shift+A";

#[tauri::command]
fn get_shortcut(app: tauri::AppHandle) -> Result<String, String> {
    let mut store = StoreBuilder::new("settings.json").build(app.clone());
    let _ = store.load();
    match store.get(SHORTCUT_KEY) {
        Some(shortcut) => Ok(shortcut.as_str().unwrap().to_string()),
        None => Ok(DEFAULT_SHORTCUT.to_string()),
    }
}

#[tauri::command]
async fn set_shortcut(app: tauri::AppHandle, shortcut: String) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())?;

    let new_shortcut = Shortcut::from_str(&shortcut).map_err(|e| e.to_string())?;

    app.global_shortcut()
        .register(new_shortcut)
        .map_err(|e| e.to_string())?;

    let mut store = StoreBuilder::new("settings.json").build(app.clone());
    let _ = store.load();
    store.insert(SHORTCUT_KEY.to_string(), serde_json::Value::String(shortcut));
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn reset_shortcut(app: tauri::AppHandle) -> Result<(), String> {
    set_shortcut(app, DEFAULT_SHORTCUT.to_string()).await
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
async fn show_overlay(app: tauri::AppHandle) -> Result<(), String> {
    // Get the main window instead of trying to create a new overlay window
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.center().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
    } else {
        return Err("Main window not found".to_string());
    }
    Ok(())
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

#[tauri::command]
async fn fetch_openrouter_models(api_key: String) -> Result<Vec<serde_json::Value>, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://openrouter.ai/api/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .send()
        .await;

    match response {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                match resp.json::<serde_json::Value>().await {
                    Ok(models) => {
                        if let Some(models_array) = models["data"].as_array() {
                            Ok(models_array.clone())
                        } else {
                            Ok(Vec::new())
                        }
                    }
                    Err(e) => Err(format!("Failed to parse models response: {}", e))
                }
            } else {
                match resp.text().await {
                    Ok(error_text) => {
                        if status == 401 {
                            Err(format!("Authentication failed (401 Unauthorized): {}", error_text))
                        } else if status == 403 {
                            Err(format!("Access forbidden (403 Forbidden): {}", error_text))
                        } else {
                            Err(format!("API request failed ({}): {}", status, error_text))
                        }
                    },
                    Err(_) => Err(format!("API request failed with status: {}", status))
                }
            }
        }
        Err(e) => Err(format!("Failed to connect to OpenRouter API: {}", e))
    }
}

#[tauri::command]
async fn process_text_with_ai(
    text: String,
    action: String,
    model: String,
    api_key: String,
    tone: Option<String>,
    max_tokens: Option<u32>
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let system_prompt = match action.as_str() {
        "proofread" => "You are a professional editor. Please proofread and correct the following text for grammar, spelling, punctuation, and clarity. Return only the corrected text without additional commentary.".to_string(),
        "tone" => {
            let tone_desc = tone.unwrap_or_else(|| "professional".to_string());
            format!("You are a writing assistant. Please rewrite the following text in a {} tone. Maintain the original meaning but adjust the style and language to match the requested tone. Return only the rewritten text without additional commentary.", tone_desc)
        },
        "draft" => "You are a helpful writing assistant. Please help improve and expand the following text to make it more complete, clear, and professional. Return only the improved text without additional commentary.".to_string(),
        _ => return Err("Unknown action specified".to_string())
    };

    let request_body = serde_json::json!({
        "model": model,
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
        "max_tokens": max_tokens.unwrap_or(2000),
        "temperature": 0.7
    });

    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await;

    match response {
        Ok(resp) => {
            if resp.status().is_success() {
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
                let status = resp.status();
                match resp.text().await {
                    Ok(error_text) => {
                        // Parse the error response to provide better error messages
                        if status == 401 {
                            Err(format!("Authentication failed (401 Unauthorized): {}", error_text))
                        } else if status == 403 {
                            Err(format!("Access forbidden (403 Forbidden): {}", error_text))
                        } else if status == 429 {
                            Err(format!("Rate limit exceeded (429 Too Many Requests): {}", error_text))
                        } else {
                            Err(format!("API request failed ({}): {}", status, error_text))
                        }
                    },
                    Err(_) => Err(format!("API request failed with status: {}", status))
                }
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_.build())
        .invoke_handler(tauri::generate_handler![
            show_overlay,
            get_clipboard_text,
            set_clipboard_text,
            fetch_openrouter_models,
            process_text_with_ai,
            resize_window,
            get_shortcut,
            set_shortcut,
            reset_shortcut,
            enable_autostart,
            disable_autostart,
            is_autostart_enabled
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let shortcut = get_shortcut(app_handle.clone()).unwrap_or_else(|_| DEFAULT_SHORTCUT.to_string());
                if let Err(e) = set_shortcut(app_handle.clone(), shortcut).await {
                    eprintln!("Failed to set initial shortcut: {}", e);
                }

                let app_handle_clone = app_handle.clone();
                if let Err(e) = app_handle.global_shortcut().on_shortcut(move |_shortcut, _press_time| {
                    let app_handle_clone_clone = app_handle_clone.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Err(e) = show_overlay(app_handle_clone_clone).await {
                            eprintln!("Failed to show overlay: {}", e);
                        }
                    });
                }) {
                     eprintln!("Failed to register shortcut handler: {}", e);
                }
            });

            let show = MenuItem::with_id(app, "show", "Show UI", true, None::<&str>)?;
            let startup = MenuItem::with_id(app, "startup", "Start on Boot", true, None::<&str>)?;
            let exit = MenuItem::with_id(app, "exit", "Exit App", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &startup, &exit])?;
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
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
            let window_ = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    window_.hide().unwrap();
                    api.prevent_close();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
