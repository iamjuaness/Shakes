#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // Diálogos y archivos nativos (sustituyen a la File System Access API del WebView, que en escritorio
        // pedía permisos «de sitio web» y abría los diálogos minimizados).
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // Recuerda entre sesiones las carpetas y archivos que el usuario eligió (proyectos recientes).
        .plugin(tauri_plugin_persisted_scope::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
