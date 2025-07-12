// src/lib.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri::{AppHandle, Emitter};
use std::sync::{Arc, Mutex};
use tauri::async_runtime;
use std::process::Command;
use encoding_rs::GBK;

// -------------------------------------------------------------
type EngineProcess = Arc<Mutex<Option<CommandChild>>>;
// -------------------------------------------------------------

#[tauri::command]
async fn spawn_engine(
    path: String,
    app: AppHandle,
    process_state: tauri::State<'_, EngineProcess>,
) -> Result<(), String> {
    // If there's an existing process, terminate it first
    if let Some(child) = process_state.lock().unwrap().take() {
        let _ = child.kill();
    }

    // Start new process
    let (mut rx, child) = app.shell()
        .command(path)
        .spawn()
        .map_err(|e| format!("Failed to spawn engine: {e}"))?;

    *process_state.lock().unwrap() = Some(child);

    // Asynchronously forward and decode output
    async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(buf) | CommandEvent::Stderr(buf) => {
                    // Decode from GBK, as many Chinese engines use this on Windows.
                    let (cow, _encoding_used, _had_errors) = GBK.decode(&buf);
                    let text = cow.into_owned();
                    let _ = app.emit("engine-output", text);
                }
                _ => {}
            }
        }
    });

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

#[tauri::command]
async fn open_external_url(url: String) -> Result<(), String> {
    // Use different commands to open browser based on operating system
    let result = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "start", &url])
            .spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("open")
            .arg(&url)
            .spawn()
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
        .invoke_handler(tauri::generate_handler![spawn_engine, send_to_engine, open_external_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
