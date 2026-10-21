mod cloud;
mod crypto;
mod error;
mod models;
mod service;
mod spec;
mod storage;

use crate::{
    cloud::Cloud,
    error::{AppError, Result},
    models::*,
    service::Backend,
    storage::Storage,
};
use std::sync::{atomic::Ordering, Arc};
use tauri::{Manager, State};
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
async fn get_session(state: State<'_, Arc<Backend>>) -> Result<Session> {
    Ok(state.cloud.session().await)
}
#[tauri::command]
async fn begin_login(state: State<'_, Arc<Backend>>) -> Result<LoginTicket> {
    state.cloud.begin_login().await
}
#[tauri::command]
async fn wait_login(state: State<'_, Arc<Backend>>, ticket_id: String) -> Result<Session> {
    state.cloud.wait_login(&ticket_id).await
}
#[tauri::command]
async fn cancel_login(state: State<'_, Arc<Backend>>, ticket_id: String) -> Result<()> {
    state.cloud.cancel_login(&ticket_id).await
}
#[tauri::command]
async fn logout(state: State<'_, Arc<Backend>>) -> Result<()> {
    state.logout().await
}
#[tauri::command]
async fn refresh_devices(state: State<'_, Arc<Backend>>) -> Result<Snapshot> {
    state.refresh_devices().await
}
#[tauri::command]
async fn get_cached_snapshot(state: State<'_, Arc<Backend>>) -> Result<Option<Snapshot>> {
    state.cached_snapshot().await
}
#[tauri::command]
async fn get_device_detail(state: State<'_, Arc<Backend>>, did: String) -> Result<DeviceDetail> {
    state.device_detail(&did).await
}
#[tauri::command]
async fn set_property(
    state: State<'_, Arc<Backend>>,
    did: String,
    siid: u32,
    piid: u32,
    value: serde_json::Value,
) -> Result<()> {
    state.set_property(&did, siid, piid, value).await
}
#[tauri::command]
async fn run_action(
    state: State<'_, Arc<Backend>>,
    did: String,
    siid: u32,
    aiid: u32,
    inputs: Vec<serde_json::Value>,
) -> Result<()> {
    state.run_action(&did, siid, aiid, inputs).await
}
#[tauri::command]
async fn run_scene(
    state: State<'_, Arc<Backend>>,
    scene_id: String,
    home_id: String,
) -> Result<()> {
    state.run_scene(&scene_id, &home_id).await
}
#[tauri::command]
async fn send_voice(
    state: State<'_, Arc<Backend>>,
    did: String,
    text: String,
    silent: bool,
) -> Result<()> {
    state.send_voice(&did, &text, silent).await
}
#[tauri::command]
async fn get_settings(app: tauri::AppHandle, state: State<'_, Arc<Backend>>) -> Result<Settings> {
    let mut s = state.settings.read().await.clone();
    s.auto_start = app
        .autolaunch()
        .is_enabled()
        .map_err(|e| AppError::new("autostart", e.to_string()))?;
    Ok(s)
}
#[tauri::command]
async fn save_settings(
    app: tauri::AppHandle,
    state: State<'_, Arc<Backend>>,
    settings: Settings,
) -> Result<Settings> {
    settings.validate()?;
    let _guard = state.settings_write.lock().await;
    let manager = app.autolaunch();
    let was_enabled = manager
        .is_enabled()
        .map_err(|e| AppError::new("autostart", e.to_string()))?;
    if settings.auto_start != was_enabled {
        if settings.auto_start {
            manager.enable()
        } else {
            manager.disable()
        }
        .map_err(|e| AppError::new("autostart", e.to_string()))?;
    }
    if let Err(error) = state.cloud.storage.write("settings.json", &settings) {
        if settings.auto_start != was_enabled {
            let _ = if was_enabled {
                manager.enable()
            } else {
                manager.disable()
            };
        }
        return Err(error);
    }
    state
        .close_to_tray
        .store(settings.minimize_to_tray, Ordering::SeqCst);
    *state.settings.write().await = settings.clone();
    Ok(settings)
}
#[tauri::command]
fn get_app_info(app: tauri::AppHandle, state: State<'_, Arc<Backend>>) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        data_dir: state.cloud.storage.dir.to_string_lossy().into_owned(),
        platform: std::env::consts::OS.into(),
    }
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}
fn install_tray(app: &tauri::App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    use tauri::{
        menu::{Menu, MenuItem},
        tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    };
    let show = MenuItem::with_id(app, "show", "显示 MiHome", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "隐藏窗口", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出 MiHome", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &hide, &quit])?;
    TrayIconBuilder::with_id("main-tray")
        .icon(tauri::image::Image::from_bytes(include_bytes!(
            "../icons/32x32.png"
        ))?)
        .tooltip("MiHome")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main(app),
            "hide" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                show_main(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(|app| {
            let storage = Storage::new(app.path().app_data_dir()?)?;
            let cloud = Arc::new(Cloud::new(storage)?);
            let backend = Arc::new(Backend::new(cloud)?);
            app.manage(backend);
            install_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<Arc<Backend>>();
                if state.close_to_tray.load(Ordering::SeqCst) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_session,
            begin_login,
            wait_login,
            cancel_login,
            logout,
            refresh_devices,
            get_cached_snapshot,
            get_device_detail,
            set_property,
            run_action,
            run_scene,
            send_voice,
            get_settings,
            save_settings,
            get_app_info
        ])
        .run(tauri::generate_context!())
        .expect("MiHome native application failed to start");
}
