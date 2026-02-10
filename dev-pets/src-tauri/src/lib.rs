use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
mod handlers;
mod utils;
use crate::constants::DEFAULT_SQL_SCHEMA;
use crate::handlers::pet_window::pet_window_toggle;
use crate::handlers::oauth::open_url_in_browser;
use crate::{
    constants::DB_NAME_TYPE
};
use tauri_plugin_sql::{Migration, MigrationKind};

mod constants;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
        let migrations = vec![Migration {
        version: 1,
        description: "init",
        sql: DEFAULT_SQL_SCHEMA,
        kind: MigrationKind::Up,
    }];
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_NAME_TYPE, migrations)
                .build(),
        )
        .setup(|app| {
            let _pet_window_init =
                tauri::WebviewWindowBuilder::new(app, "pet", tauri::WebviewUrl::App("/pet".into()))
                    .transparent(true)
                    .decorations(false)
                    .always_on_top(true)
                    .skip_taskbar(true)
                    .maximized(true)
                    .visible(false)
                    .build()
                    .unwrap();

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;

            let _ = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        println!("quit menu item was clicked");
                        app.exit(0);
                    }
                    _ => {
                        println!("menu item {:?} not handled", event.id);
                    }
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![pet_window_toggle, open_url_in_browser])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
