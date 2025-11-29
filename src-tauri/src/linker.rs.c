// src-tauri/src/linker.rs
use tauri::AppHandle;
use std::{thread, time};
use enigo::{Enigo, MouseControllable, MouseButton}; 
use base64::{Engine as _, engine::general_purpose::STANDARD};
use std::io::Cursor;
use xcap::Window;
use image::{DynamicImage, Rgba};
use std::cmp;

#[derive(serde::Serialize, Clone)]
pub struct WindowInfo {
    id: u32,
    name: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    is_minimized: bool,
}

#[derive(serde::Serialize)]
pub struct CaptureResult {
    image_base64: String,
    width: u32,
    height: u32,
}

#[tauri::command]
pub async fn list_windows() -> Result<Vec<WindowInfo>, String> {
    let windows = Window::all().map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for window in windows {
        result.push(WindowInfo {
            id: window.id(),
            name: window.title().to_string(),
            x: window.x(),
            y: window.y(),
            width: window.width(),
            height: window.height(),
            is_minimized: window.is_minimized(),
        });
    }
    Ok(result)
}

#[tauri::command]
pub async fn get_window_info(window_id: u32) -> Result<WindowInfo, String> {
    let windows = Window::all().map_err(|e| e.to_string())?;
    for window in windows {
        if window.id() == window_id {
            return Ok(WindowInfo {
                id: window.id(),
                name: window.title().to_string(),
                x: window.x(),
                y: window.y(),
                width: window.width(),
                height: window.height(),
                is_minimized: window.is_minimized(),
            });
        }
    }
    Err("Window not found".to_string())
}

#[tauri::command]
pub async fn capture_window(window_id: u32) -> Result<CaptureResult, String> {
    let windows = Window::all().map_err(|e| e.to_string())?;
    for window in windows {
        if window.id() == window_id {
            let image = window.capture_image().map_err(|e| e.to_string())?;
            
            // 修复 Linux 下截图可能带透明通道导致 AI 识别错误的问题
            // 强制转为白底 RGB
            let width = image.width();
            let height = image.height();
            let mut rgb_image = image::ImageBuffer::from_pixel(width, height, Rgba([255, 255, 255, 255]));
            image::imageops::overlay(&mut rgb_image, &image, 0, 0);
            let dynamic_image = DynamicImage::ImageRgba8(rgb_image);
            
            let mut buffer = Vec::new();
            let mut cursor = Cursor::new(&mut buffer);
            dynamic_image.write_to(&mut cursor, image::ImageFormat::Png).map_err(|e| e.to_string())?;
            
            let base64_string = STANDARD.encode(&buffer);
            return Ok(CaptureResult {
                image_base64: base64_string,
                width,
                height,
            });
        }
    }
    Err("Window not found".to_string())
}

#[tauri::command]
pub async fn capture_screen(display_id: usize) -> Result<CaptureResult, String> {
    let screens = xcap::Monitor::all().map_err(|e| e.to_string())?;
    if display_id >= screens.len() {
        return Err("Display ID out of range".to_string());
    }
    let screen = &screens[display_id];
    let image = screen.capture_image().map_err(|e| e.to_string())?;
    
    let width = image.width();
    let height = image.height();
    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);
    image.write_to(&mut cursor, image::ImageFormat::Png).map_err(|e| e.to_string())?;
    
    Ok(CaptureResult {
        image_base64: STANDARD.encode(&buffer),
        width,
        height,
    })
}

#[tauri::command]
pub async fn capture_region(x: i32, y: i32, width: u32, height: u32) -> Result<CaptureResult, String> {
    let screens = xcap::Monitor::all().map_err(|e| e.to_string())?;
    if screens.is_empty() { return Err("No screens found".to_string()); }
    
    // 默认截取第一个屏幕并裁剪
    let image = screens[0].capture_image().map_err(|e| e.to_string())?;
    let cropped = image::imageops::crop_imm(&image, x as u32, y as u32, width, height).to_image();
    
    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);
    cropped.write_to(&mut cursor, image::ImageFormat::Png).map_err(|e| e.to_string())?;
    
    Ok(CaptureResult {
        image_base64: STANDARD.encode(&buffer),
        width,
        height,
    })
}

#[tauri::command]
pub async fn simulate_move(
    from_x: i32,
    from_y: i32,
    to_x: i32,
    to_y: i32,
    click_delay_ms: u64,
    move_delay_ms: u64
) -> Result<(), String> {
    println!("[Rust Linker] >>> 模拟移动: ({}, {}) -> ({}, {})", from_x, from_y, to_x, to_y);

    let mut enigo = Enigo::new();

    // 1. 移动到起点
    enigo.mouse_move_to(from_x, from_y);
    thread::sleep(time::Duration::from_millis(50));

    // 2. 点击起点
    enigo.mouse_down(MouseButton::Left);
    if click_delay_ms > 0 {
        thread::sleep(time::Duration::from_millis(click_delay_ms));
    }
    enigo.mouse_up(MouseButton::Left);
    println!("[Rust Linker] 点击起点完成");

    // 3. 移动延迟
    if move_delay_ms > 0 {
        thread::sleep(time::Duration::from_millis(move_delay_ms));
    }

    // 4. 移动到终点
    enigo.mouse_move_to(to_x, to_y);
    thread::sleep(time::Duration::from_millis(50));

    // 5. 点击终点
    enigo.mouse_down(MouseButton::Left);
    if click_delay_ms > 0 {
        thread::sleep(time::Duration::from_millis(click_delay_ms));
    }
    enigo.mouse_up(MouseButton::Left);
    println!("[Rust Linker] 点击终点完成");

    Ok(())
}

#[tauri::command]
pub async fn simulate_click(x: i32, y: i32, delay_ms: u64) -> Result<(), String> {
    println!("[Rust Linker] >>> 模拟点击: ({}, {})", x, y);
    let mut enigo = Enigo::new();
    enigo.mouse_move_to(x, y);
    thread::sleep(time::Duration::from_millis(50));
    enigo.mouse_down(MouseButton::Left);
    if delay_ms > 0 {
        thread::sleep(time::Duration::from_millis(delay_ms));
    }
    enigo.mouse_up(MouseButton::Left);
    Ok(())
}
