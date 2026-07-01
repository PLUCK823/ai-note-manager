pub mod app_state;
pub mod commands;
pub mod domain;
pub mod error;
pub mod infrastructure;
pub mod services;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let database =
                infrastructure::db::Database::open(app_data_dir.join("metadata.sqlite3"))?;
            app.manage(app_state::AppState::from_database(database));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::vault::select_vault,
            commands::vault::open_recent_vault,
            commands::vault::get_recent_vault,
            commands::notes::list_markdown_files,
            commands::notes::start_vault_watcher,
            commands::notes::read_note,
            commands::notes::check_note_status,
            commands::notes::save_note,
            commands::notes::create_note,
            commands::notes::create_folder,
            commands::notes::rename_note,
            commands::notes::delete_note,
            commands::search::search_notes,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::save_api_key,
            commands::ai::run_ai_action,
            commands::ai::apply_ai_change,
            commands::ai::cancel_ai_action,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
