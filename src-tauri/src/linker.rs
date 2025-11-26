// Linker module for screen capture and mouse automation
// This module provides the native desktop functionality for the "连线" feature

#[cfg(not(target_os = "android"))]
use xcap::{Monitor, Window};
#[cfg(not(target_os = "android"))]
use enigo::{Enigo, Mouse, Settings, Coordinate, Button};
#[cfg(not(target_os = "android"))]
use image::ImageFormat;
#[cfg(not(target_os = "android"))]
use std::io::Cursor;

use serde::{Deserialize, Serialize};
use base64::Engine;

/// Information about a window that can be captured
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowInfo {
    pub id: u32,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_minimized: bool,
}

/// Information about the captured screen region
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureRegion {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

/// Result of a screen capture operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureResult {
    pub image_base64: String,
    pub width: u32,
    pub height: u32,
}

/// List all visible windows on the system
#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn list_windows() -> Result<Vec<WindowInfo>, String> {
    let windows = Window::all().map_err(|e| format!("Failed to enumerate windows: {}", e))?;
    
    let mut result = Vec::new();
    for window in windows {
        // Skip windows with empty names or very small sizes
        let name = window.title();
        if name.is_empty() {
            continue;
        }
        
        let x = window.x();
        let y = window.y();
        let width = window.width();
        let height = window.height();
        
        // Skip very small windows (likely system windows)
        if width < 100 || height < 100 {
            continue;
        }
        
        result.push(WindowInfo {
            id: window.id(),
            name,
            x,
            y,
            width,
            height,
            is_minimized: window.is_minimized(),
        });
    }
    
    Ok(result)
}

#[cfg(target_os = "android")]
#[tauri::command]
pub async fn list_windows() -> Result<Vec<WindowInfo>, String> {
    Err("Window listing is not supported on Android".to_string())
}

/// Capture a specific window by ID
#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn capture_window(window_id: u32) -> Result<CaptureResult, String> {
    let windows = Window::all().map_err(|e| format!("Failed to enumerate windows: {}", e))?;
    
    let window = windows
        .into_iter()
        .find(|w| w.id() == window_id)
        .ok_or_else(|| format!("Window with ID {} not found", window_id))?;
    
    let image = window.capture_image().map_err(|e| format!("Failed to capture window: {}", e))?;
    
    let width = image.width();
    let height = image.height();
    
    // Convert to PNG and base64 encode
    let mut buffer = Cursor::new(Vec::new());
    image.write_to(&mut buffer, ImageFormat::Png)
        .map_err(|e| format!("Failed to encode image: {}", e))?;
    
    let base64_str = base64::engine::general_purpose::STANDARD.encode(buffer.into_inner());
    
    Ok(CaptureResult {
        image_base64: base64_str,
        width,
        height,
    })
}

#[cfg(target_os = "android")]
#[tauri::command]
pub async fn capture_window(_window_id: u32) -> Result<CaptureResult, String> {
    Err("Window capture is not supported on Android".to_string())
}

/// Capture the entire screen or primary monitor
#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn capture_screen() -> Result<CaptureResult, String> {
    let monitors = Monitor::all().map_err(|e| format!("Failed to enumerate monitors: {}", e))?;
    
    let monitor = monitors
        .into_iter()
        .next()
        .ok_or_else(|| "No monitors found".to_string())?;
    
    let image = monitor.capture_image().map_err(|e| format!("Failed to capture screen: {}", e))?;
    
    let width = image.width();
    let height = image.height();
    
    // Convert to PNG and base64 encode
    let mut buffer = Cursor::new(Vec::new());
    image.write_to(&mut buffer, ImageFormat::Png)
        .map_err(|e| format!("Failed to encode image: {}", e))?;
    
    let base64_str = base64::engine::general_purpose::STANDARD.encode(buffer.into_inner());
    
    Ok(CaptureResult {
        image_base64: base64_str,
        width,
        height,
    })
}

#[cfg(target_os = "android")]
#[tauri::command]
pub async fn capture_screen() -> Result<CaptureResult, String> {
    Err("Screen capture is not supported on Android".to_string())
}

/// Capture a specific region of the screen
#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn capture_region(region: CaptureRegion) -> Result<CaptureResult, String> {
    let monitors = Monitor::all().map_err(|e| format!("Failed to enumerate monitors: {}", e))?;
    
    let monitor = monitors
        .into_iter()
        .next()
        .ok_or_else(|| "No monitors found".to_string())?;
    
    let full_image = monitor.capture_image().map_err(|e| format!("Failed to capture screen: {}", e))?;
    
    // Crop the image to the specified region
    let cropped = image::imageops::crop_imm(
        &full_image,
        region.x as u32,
        region.y as u32,
        region.width,
        region.height,
    ).to_image();
    
    let width = cropped.width();
    let height = cropped.height();
    
    // Convert to PNG and base64 encode
    let mut buffer = Cursor::new(Vec::new());
    cropped.write_to(&mut buffer, ImageFormat::Png)
        .map_err(|e| format!("Failed to encode image: {}", e))?;
    
    let base64_str = base64::engine::general_purpose::STANDARD.encode(buffer.into_inner());
    
    Ok(CaptureResult {
        image_base64: base64_str,
        width,
        height,
    })
}

#[cfg(target_os = "android")]
#[tauri::command]
pub async fn capture_region(_region: CaptureRegion) -> Result<CaptureResult, String> {
    Err("Screen capture is not supported on Android".to_string())
}

/// Simulate a mouse click at the specified screen coordinates
#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn simulate_click(x: i32, y: i32, click_delay_ms: u64) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| format!("Failed to create Enigo instance: {}", e))?;
    
    // Move mouse to position
    enigo.move_mouse(x, y, Coordinate::Abs)
        .map_err(|e| format!("Failed to move mouse: {}", e))?;
    
    // Small delay before clicking
    std::thread::sleep(std::time::Duration::from_millis(click_delay_ms));
    
    // Click
    enigo.button(Button::Left, enigo::Direction::Click)
        .map_err(|e| format!("Failed to click: {}", e))?;
    
    Ok(())
}

#[cfg(target_os = "android")]
#[tauri::command]
pub async fn simulate_click(_x: i32, _y: i32, _click_delay_ms: u64) -> Result<(), String> {
    Err("Mouse simulation is not supported on Android".to_string())
}

/// Simulate a chess move by clicking from source to destination
#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn simulate_move(
    from_x: i32,
    from_y: i32,
    to_x: i32,
    to_y: i32,
    click_delay_ms: u64,
    move_delay_ms: u64,
) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| format!("Failed to create Enigo instance: {}", e))?;
    
    // Click on source square
    enigo.move_mouse(from_x, from_y, Coordinate::Abs)
        .map_err(|e| format!("Failed to move mouse to source: {}", e))?;
    std::thread::sleep(std::time::Duration::from_millis(click_delay_ms));
    enigo.button(Button::Left, enigo::Direction::Click)
        .map_err(|e| format!("Failed to click source: {}", e))?;
    
    // Delay between clicks
    std::thread::sleep(std::time::Duration::from_millis(move_delay_ms));
    
    // Click on destination square
    enigo.move_mouse(to_x, to_y, Coordinate::Abs)
        .map_err(|e| format!("Failed to move mouse to destination: {}", e))?;
    std::thread::sleep(std::time::Duration::from_millis(click_delay_ms));
    enigo.button(Button::Left, enigo::Direction::Click)
        .map_err(|e| format!("Failed to click destination: {}", e))?;
    
    Ok(())
}

#[cfg(target_os = "android")]
#[tauri::command]
pub async fn simulate_move(
    _from_x: i32,
    _from_y: i32,
    _to_x: i32,
    _to_y: i32,
    _click_delay_ms: u64,
    _move_delay_ms: u64,
) -> Result<(), String> {
    Err("Mouse simulation is not supported on Android".to_string())
}

/// Get information about a specific window by ID
#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn get_window_info(window_id: u32) -> Result<WindowInfo, String> {
    let windows = Window::all().map_err(|e| format!("Failed to enumerate windows: {}", e))?;
    
    let window = windows
        .into_iter()
        .find(|w| w.id() == window_id)
        .ok_or_else(|| format!("Window with ID {} not found", window_id))?;
    
    Ok(WindowInfo {
        id: window.id(),
        name: window.title(),
        x: window.x(),
        y: window.y(),
        width: window.width(),
        height: window.height(),
        is_minimized: window.is_minimized(),
    })
}

#[cfg(target_os = "android")]
#[tauri::command]
pub async fn get_window_info(_window_id: u32) -> Result<WindowInfo, String> {
    Err("Window info is not supported on Android".to_string())
}
