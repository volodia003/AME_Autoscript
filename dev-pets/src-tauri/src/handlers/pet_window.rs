use tauri::Manager;

#[tauri::command]
pub fn pet_window_toggle(visible: bool, app: tauri::AppHandle) {
    let pet_window = app.get_webview_window("pet").unwrap();
    if visible {
        pet_window.set_ignore_cursor_events(true).unwrap();
        pet_window.show().unwrap();
    } else {
        pet_window.hide().unwrap();
        pet_window.set_ignore_cursor_events(false).unwrap();
    }
}
