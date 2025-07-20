// src/lib.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(clippy::uninlined_format_args)]

use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri::{AppHandle, Emitter};
use std::sync::{Arc, Mutex};
use tauri::async_runtime;
use std::process::Command;
use encoding_rs::GBK;
use std::path::Path;
use std::fs;
#[cfg(target_os = "android")]
use std::os::unix::fs::PermissionsExt;

// -------------------------------------------------------------
type EngineProcess = Arc<Mutex<Option<CommandChild>>>;
// -------------------------------------------------------------

/// Check if the engine file exists and is executable on Android
#[cfg(target_os = "android")]
fn check_android_engine_file(path: &str) -> Result<(), String> {
    let engine_path = Path::new(path);
    
    // Check if file exists
    if !engine_path.exists() {
        return Err(format!("Engine file not found: {}", path));
    }
    
    // Check if file is executable (Android requires specific permissions)
    if let Ok(metadata) = fs::metadata(engine_path) {
        if !metadata.is_file() {
            return Err("Path is not a file".to_string());
        }
    } else {
        return Err("Cannot access engine file".to_string());
    }
    Ok(())
}

/// Copy file from user directory to app internal storage
#[cfg(target_os = "android")]
fn copy_file_to_internal_storage(source_path_str: &str, app_handle: &AppHandle) -> Result<String, String> {
    let source_path = Path::new(source_path_str);
    if !source_path.exists() {
        let error_msg = format!("Source file not found: {}", source_path.display());
        let _ = app_handle.emit("engine-output", format!("[DEBUG] {}", error_msg));
        return Err(error_msg);
    }

    // Use dynamic bundle identifier for internal storage path
    let bundle_identifier = &app_handle.config().identifier;
    let internal_dir = format!("/data/data/{}/files/engines", bundle_identifier);
    if let Err(e) = fs::create_dir_all(&internal_dir) {
        let error_msg = format!("Failed to create internal directory: {}", e);
        let _ = app_handle.emit("engine-output", format!("[DEBUG] {}", error_msg));
        return Err(error_msg);
    }

    // Generate destination path
    let filename = source_path.file_name()
        .ok_or_else(|| "Invalid source path".to_string())?
        .to_str()
        .ok_or_else(|| "Invalid filename encoding".to_string())?;
    let dest_path_str = format!("{}/{}", internal_dir, filename);
    let dest_path = Path::new(&dest_path_str);

    let _ = app_handle.emit("engine-output", format!("[DEBUG] Copying file from {} to {}", source_path.display(), dest_path.display()));

    // Copy file
    if let Err(e) = fs::copy(source_path, dest_path) {
        let error_msg = format!("Failed to copy file: {}", e);
        let _ = app_handle.emit("engine-output", format!("[DEBUG] {}", error_msg));
        return Err(error_msg);
    }

    let _ = app_handle.emit("engine-output", "[DEBUG] Setting executable permission...");
    
    match fs::metadata(dest_path) {
        Ok(metadata) => {
            let mut permissions = metadata.permissions();
            // Set permissions to rwxr-xr-x (0o755)
            permissions.set_mode(0o755);   

            if let Err(e) = fs::set_permissions(dest_path, permissions) {
                let error_msg = format!("Failed to set executable permission: {}", e);
                let _ = app_handle.emit("engine-output", format!("[DEBUG] {}", error_msg));
                return Err(error_msg);
            }
        },
        Err(e) => {
            let error_msg = format!("Failed to get metadata for setting permissions: {}", e);
            let _ = app_handle.emit("engine-output", format!("[DEBUG] {}", error_msg));
            return Err(error_msg);
        }
    }
    
    let _ = app_handle.emit("engine-output", format!("[DEBUG] Successfully copied and made executable: {}", dest_path.display()));
    Ok(dest_path_str)
}

/// Save game notation to Android external storage (user accessible)
#[tauri::command]
async fn save_game_notation(content: String, filename: String, app: AppHandle) -> Result<String, String> {
    if !cfg!(target_os = "android") {
        return Err("This function is only available on Android".to_string());
    }

    // Use dynamic bundle identifier for external storage path
    let bundle_identifier = &app.config().identifier;
    let external_dir = format!("/storage/emulated/0/Android/data/{}/files/notations", bundle_identifier);
    
    // Create notations directory if it doesn't exist
    if let Err(e) = fs::create_dir_all(&external_dir) {
        let error_msg = format!("Failed to create notations directory: {}", e);
        return Err(error_msg);
    }

    // Generate full file path
    let file_path_str = format!("{}/{}", external_dir, filename);
    let file_path = Path::new(&file_path_str);

    // Write content to file
    if let Err(e) = fs::write(file_path, content) {
        let error_msg = format!("Failed to write notation file: {}", e);
        return Err(error_msg);
    }

    Ok(file_path_str)
}

/// Get the user-accessible engine directory path
#[cfg(target_os = "android")]
fn get_user_engine_directory() -> String {
    // Use external storage that users can access
    "/storage/emulated/0/jieqibox/engines".to_string()
}

/// Scans user directory for engine files, copies them to internal storage,
/// and then lists all available engine files in the internal storage.
#[cfg(target_os = "android")]
fn sync_and_list_engines(app_handle: &AppHandle) -> Result<Vec<String>, String> {
    let bundle_identifier = &app_handle.config().identifier;
    let source_dirs = vec![
        get_user_engine_directory(),
        format!("/storage/emulated/0/Android/data/{}/files/engines", bundle_identifier),
    ];
    let internal_dir_str = format!("/data/data/{}/files/engines", bundle_identifier);
    
    let _ = app_handle.emit("engine-output", format!("[DEBUG] Syncing engines. Internal dir: {}. Source dirs: {:?}", internal_dir_str, source_dirs));
    
    // Ensure internal engine directory exists
    if let Err(e) = fs::create_dir_all(&internal_dir_str) {
        let error_msg = format!("Failed to create internal directory '{}': {}", internal_dir_str, e);
        let _ = app_handle.emit("engine-output", format!("[DEBUG] {}", error_msg));
        return Err(error_msg);
    } else {
        let _ = app_handle.emit("engine-output", format!("[DEBUG] Internal directory created/exists: {}", internal_dir_str));
    }

    // Iterate over all possible source directories
    for user_dir in &source_dirs {
        let _ = app_handle.emit("engine-output", format!("[DEBUG] Checking source directory: {}", user_dir));
        let user_path = Path::new(user_dir);

        // Ensure user directory exists
        if !user_path.exists() {
            let _ = app_handle.emit("engine-output", format!("[DEBUG] Source directory does not exist, skipping: {}", user_dir));
            continue;
        } else {
            let _ = app_handle.emit("engine-output", format!("[DEBUG] Source directory exists: {}", user_dir));
        }

        // Scan user directory and copy files
        match fs::read_dir(user_path) {
            Ok(entries) => {
                let _ = app_handle.emit("engine-output", format!("[DEBUG] Successfully read source directory: {}", user_dir));
                
                let entries_vec: Vec<_> = entries.collect();
                let _ = app_handle.emit("engine-output", format!("[DEBUG] Found {} entries in source directory '{}'.", entries_vec.len(), user_dir));

                for entry_result in entries_vec {
                    match entry_result {
                        Ok(entry) => {
                            let path = entry.path();
                            let _ = app_handle.emit("engine-output", format!("[DEBUG] Found entry: {}", path.display()));
                            if path.is_file() {
                                let _ = app_handle.emit("engine-output", format!("[DEBUG] Entry is a file: {}", path.display()));
                                if let Err(e) = copy_file_to_internal_storage(path.to_str().unwrap_or(""), app_handle) {
                                    let _ = app_handle.emit("engine-output", format!("[DEBUG] Failed to copy file {}: {}", path.display(), e));
                                }
                            } else {
                                let _ = app_handle.emit("engine-output", format!("[DEBUG] Entry is not a file: {}", path.display()));
                            }
                        }
                        Err(e) => {
                             let _ = app_handle.emit("engine-output", format!("[DEBUG] Error reading entry in source directory '{}': {}", user_dir, e));
                        }
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("Failed to read source directory '{}': {}", user_dir, e);
                let _ = app_handle.emit("engine-output", format!("[DEBUG] {}", error_msg));
            }
        }
    }

    // Now, list all files in the internal directory and return their full paths
    let mut available_engines = Vec::new();
    match fs::read_dir(&internal_dir_str) {
        Ok(entries) => {
            let _ = app_handle.emit("engine-output", format!("[DEBUG] Successfully read internal directory: {}", internal_dir_str));
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Some(path_str) = path.to_str() {
                        available_engines.push(path_str.to_string());
                    }
                }
            }
        }
        Err(e) => {
            let error_msg = format!("Failed to read internal directory '{}': {}", internal_dir_str, e);
            let _ = app_handle.emit("engine-output", format!("[DEBUG] {}", error_msg));
            // Don't return error, just log it. The function can return an empty list.
        }
    }
    
    let _ = app_handle.emit("engine-output", format!("[DEBUG] Available internal engines: {:?}", available_engines));
    Ok(available_engines)
}

#[tauri::command]
async fn spawn_engine(
    path: String,
    app: AppHandle,
    process_state: tauri::State<'_, EngineProcess>,
) -> Result<(), String> {
    // Only output debug logs on Android
    if cfg!(target_os = "android") {
        let _ = app.emit("engine-output", format!("[DEBUG] Spawning engine with provided path: {}", path));
    }
    
    // On Android, the path provided should already be the absolute internal path.
    // No more copying logic here.
    let final_path = path;

    #[cfg(target_os = "android")]
    {
        let _ = app.emit("engine-output", format!("[DEBUG] Validating engine file: {}", final_path));

        // Validate engine file
        if let Err(e) = check_android_engine_file(&final_path) {
            let _ = app.emit("engine-output", format!("[DEBUG] Engine file validation failed: {}", e));
            return Err(e);
        }
        let _ = app.emit("engine-output", "[DEBUG] Engine file validation passed.");
    }
    
    // If there's an existing process, terminate it first
    if let Some(child) = process_state.lock().unwrap().take() {
        if cfg!(target_os = "android") {
            let _ = app.emit("engine-output", "[DEBUG] Terminating existing engine process.");
        }
        let _ = child.kill();
    }

    // The command is simply the path to the executable.
    let command = final_path;
    if cfg!(target_os = "android") {
        let _ = app.emit("engine-output", format!("[DEBUG] Attempting to spawn executable: {}", command));
    }

    // Start new process
    let (mut rx, child) = match app.shell().command(command).spawn() {
        Ok(result) => {
            if cfg!(target_os = "android") {
                let _ = app.emit("engine-output", "[DEBUG] Engine process spawned successfully.");
            }
            result
        }
        Err(e) => {
            let error_msg = format!("Failed to spawn engine: {e}");
            if cfg!(target_os = "android") {
                let _ = app.emit("engine-output", format!("[DEBUG] {}", error_msg));
            }
            return Err(error_msg);
        }
    };

    *process_state.lock().unwrap() = Some(child);

    if cfg!(target_os = "android") {
        let _ = app.emit("engine-output", "[DEBUG] Engine process started, forwarding output.");
    }
    
    let app_clone = app.clone();
    async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(buf) | CommandEvent::Stderr(buf) => {
                    // Decode from GBK on Windows, UTF-8 on other platforms
                    let text = if cfg!(target_os = "windows") {
                        let (cow, _encoding_used, _had_errors) = GBK.decode(&buf);
                        cow.into_owned()
                    } else {
                        // Use UTF-8 for Android and other platforms
                        String::from_utf8_lossy(&buf).into_owned()
                    };
                    let _ = app_clone.emit("engine-output", text);
                }
                _ => {}
            }
        }
    });

    if cfg!(target_os = "android") {
        let _ = app.emit("engine-output", "[DEBUG] Engine spawn setup complete.");
    }
    Ok(())
}

#[tauri::command]
async fn send_to_engine(
    command: String,
    process_state: tauri::State<'_, EngineProcess>,
) -> Result<(), String> {
    if let Some(child) = process_state.lock().unwrap().as_mut() {
        child
            .write(format!("{command}\n").as_bytes())
            .map_err(|e| format!("Failed to write to engine: {e}"))?;
        Ok(())
    } else {
        Err("Engine not running.".into())
    }
}

/// Get the default engine path for Android
#[cfg(target_os = "android")]
#[tauri::command]
async fn get_default_android_engine_path() -> Result<String, String> {
    return Ok(get_user_engine_directory());
}

/// Check if a file is executable on Android
#[cfg(target_os = "android")]
#[tauri::command]
async fn check_android_file_permissions(path: String) -> Result<bool, String> {
    if cfg!(target_os = "android") {
        let file_path = Path::new(&path);
        if file_path.exists() {
            if let Ok(metadata) = fs::metadata(file_path) {
                return Ok(metadata.is_file());
            }
        }
        Ok(false)
    } else {
        Err("This function is only available on Android".to_string())
    }
}

/// Get the bundle identifier/package name
#[cfg(target_os = "android")]
#[tauri::command]
async fn get_bundle_identifier(app: AppHandle) -> Result<String, String> {
    Ok(app.config().identifier.clone())
}

/// Scan for available engines in the user directory
#[cfg(target_os = "android")]
#[tauri::command]
async fn scan_android_engines(app: AppHandle) -> Result<Vec<String>, String> {
        return sync_and_list_engines(&app);
}

/// Request SAF file selection for engine loading
#[cfg(target_os = "android")]
#[tauri::command]
async fn request_saf_file_selection(app: AppHandle) -> Result<(), String> {
    if !cfg!(target_os = "android") {
        return Err("This function is only available on Android".to_string());
    }

    // Emit event to request SAF file selection from Android native code
    let _ = app.emit("request-saf-file-selection", "engine");
    Ok(())
}

/// Handle SAF file selection result from Android native code
#[cfg(target_os = "android")]
#[tauri::command]
async fn handle_saf_file_result(
    uri: String,
    filename: String,
    result: String,
    app: AppHandle,
    process_state: tauri::State<'_, EngineProcess>,
) -> Result<String, String> {

    let _ = app.emit("engine-output", format!("[DEBUG] Received SAF file result: URI={}, filename={}, result={}", uri, filename, result));

    // Check if we got a valid result
    if result.is_empty() || result.contains("error") || result.contains("failed") {
        let error_msg = format!("SAF file selection failed: {}", result);
        let _ = app.emit("engine-output", format!("[DEBUG] {}", error_msg));
        return Err(error_msg);
    }

    // The result contains the internal path where the file was copied
    let internal_path = result;
    let _ = app.emit("engine-output", format!("[DEBUG] Successfully copied SAF file to: {}", internal_path));

    // Automatically load the engine with the copied file
    #[cfg(target_os = "android")]
    {
        match spawn_engine_internal(internal_path.clone(), app.clone(), process_state).await {
            Ok(_) => {
                let _ = app.emit("engine-output", format!("[DEBUG] Successfully loaded engine from SAF file: {}", internal_path));
                Ok(internal_path)
            }
            Err(e) => {
                let error_msg = format!("Failed to load engine from SAF file: {}", e);
                let _ = app.emit("engine-output", format!("[DEBUG] {}", error_msg));
                Err(error_msg)
            }
        }
    }
    #[cfg(not(target_os = "android"))]
    {
        Err("This function is only available on Android".to_string())
    }
}

/// Internal function to spawn engine (extracted from spawn_engine for reuse)
#[cfg(target_os = "android")]
async fn spawn_engine_internal(
    path: String,
    app: AppHandle,
    process_state: tauri::State<'_, EngineProcess>,
) -> Result<(), String> {
    let _ = app.emit("engine-output", format!("[DEBUG] Spawning engine with provided path: {}", path));
    
    // On Android, the path provided should already be the absolute internal path.
    let final_path = path;

    let _ = app.emit("engine-output", format!("[DEBUG] Validating engine file: {}", final_path));

    // Validate engine file
    if let Err(e) = check_android_engine_file(&final_path) {
        let _ = app.emit("engine-output", format!("[DEBUG] Engine file validation failed: {}", e));
        return Err(e);
    }
    let _ = app.emit("engine-output", "[DEBUG] Engine file validation passed.");
    
    // If there's an existing process, terminate it first
    if let Some(child) = process_state.lock().unwrap().take() {
        let _ = app.emit("engine-output", "[DEBUG] Terminating existing engine process.");
        let _ = child.kill();
    }

    // The command is simply the path to the executable.
    let command = final_path;
    let _ = app.emit("engine-output", format!("[DEBUG] Attempting to spawn executable: {}", command));

    // Start new process
    let (mut rx, child) = match app.shell().command(command).spawn() {
        Ok(result) => {
            let _ = app.emit("engine-output", "[DEBUG] Engine process spawned successfully.");
            result
        }
        Err(e) => {
            let error_msg = format!("Failed to spawn engine: {e}");
            let _ = app.emit("engine-output", format!("[DEBUG] {}", error_msg));
            return Err(error_msg);
        }
    };

    *process_state.lock().unwrap() = Some(child);

    let _ = app.emit("engine-output", "[DEBUG] Engine process started, forwarding output.");
    
    let app_clone = app.clone();
    async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(buf) | CommandEvent::Stderr(buf) => {
                    // Decode from GBK on Windows, UTF-8 on other platforms
                    let text = if cfg!(target_os = "windows") {
                        let (cow, _encoding_used, _had_errors) = GBK.decode(&buf);
                        cow.into_owned()
                    } else {
                        // Use UTF-8 for Android and other platforms
                        String::from_utf8_lossy(&buf).into_owned()
                    };
                    let _ = app_clone.emit("engine-output", text);
                }
                _ => {}
            }
        }
    });

    let _ = app.emit("engine-output", "[DEBUG] Engine spawn setup complete.");
    Ok(())
}

#[tauri::command]
async fn open_external_url(url: String, app: AppHandle) -> Result<(), String> {
    // Use different commands to open browser based on operating system
    let result = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "start", &url])
            .spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("open")
            .arg(&url)
            .spawn()
    } else if cfg!(target_os = "android") {
        // On Android, emit an event to trigger external browser opening
        // This will be handled by the Android native code
        let _ = app.emit("open-external-url", url);
        return Ok(());
    } else {
        // Linux and other Unix systems
        Command::new("xdg-open")
            .arg(&url)
            .spawn()
    };

    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open URL: {e}"))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Arc::new(Mutex::new(None)) as EngineProcess)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            spawn_engine, 
            send_to_engine, 
            open_external_url,
            save_game_notation,
            #[cfg(target_os = "android")]
            get_bundle_identifier,
            #[cfg(target_os = "android")]
            get_default_android_engine_path,
            #[cfg(target_os = "android")]
            check_android_file_permissions,
            #[cfg(target_os = "android")]
            scan_android_engines,
            #[cfg(target_os = "android")]
            request_saf_file_selection,
            #[cfg(target_os = "android")]
            handle_saf_file_result
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

