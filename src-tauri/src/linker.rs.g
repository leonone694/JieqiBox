// src-tauri/src/linker.rs
use tauri::AppHandle;
use std::{thread, time};
use enigo::{Enigo, MouseControllable, MouseButton}; 
use base64::{Engine as _, engine::general_purpose::STANDARD};
use std::io::Cursor;
use xcap::Window;
// ★★★ 适配 0.25 版：引入 ExtendedColorType ★★★
use image::{DynamicImage, Rgba, GenericImageView, ExtendedColorType}; 
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
            let image_buffer = window.capture_image().map_err(|e| e.to_string())?;
            
            // 包装为 DynamicImage
            let dynamic_image = DynamicImage::ImageRgba8(image_buffer);
            
            let width = dynamic_image.width();
            let height = dynamic_image.height();
            
            // 转 RGB8 处理白底
            let rgb_image = dynamic_image.to_rgb8();
            
            let mut buffer = Vec::new();
            let mut cursor = Cursor::new(&mut buffer);
            // PNG 依然使用 write_to，它会自动处理 ColorType
            rgb_image.write_to(&mut cursor, image::ImageFormat::Png).map_err(|e| e.to_string())?;
            
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

// ★★★ 极速接口 (已修复 0.25 类型错误) ★★★
#[tauri::command]
pub async fn capture_for_ai(window_id: u32) -> Result<CaptureResult, String> {
    let windows = Window::all().map_err(|e| e.to_string())?;
    for window in windows {
        if window.id() == window_id {
            // 1. 获取截图
            let image_buffer = window.capture_image().map_err(|e| e.to_string())?;
            let img = DynamicImage::ImageRgba8(image_buffer);
            
            // 2. 缩放 (Triangle 算法平衡速度和质量)
            let scaled = img.resize(640, 640, image::imageops::FilterType::Triangle);
            let width = scaled.width();
            let height = scaled.height();

            // 3. 转 RGB (JPEG 不支持 Alpha)
            let rgb_img = scaled.to_rgb8();

            // 4. 编码 JPEG
            let mut buffer = Vec::new();
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, 75);
            
            // ★★★ 修复点：使用 ExtendedColorType::Rgb8 ★★★
            encoder.encode(
                rgb_img.as_raw(), 
                width, 
                height, 
                ExtendedColorType::Rgb8
            ).map_err(|e| e.to_string())?;
            
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
    let image_buffer = screen.capture_image().map_err(|e| e.to_string())?;
    let dynamic_image = DynamicImage::ImageRgba8(image_buffer);
    
    let width = dynamic_image.width();
    let height = dynamic_image.height();
    
    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);
    dynamic_image.write_to(&mut cursor, image::ImageFormat::Png).map_err(|e| e.to_string())?;
    
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
    
    let image_buffer = screens[0].capture_image().map_err(|e| e.to_string())?;
    let dynamic_image = DynamicImage::ImageRgba8(image_buffer);
    
    let cropped = dynamic_image.crop_imm(x as u32, y as u32, width, height);
    
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
    println!("[Rust Linker] 模拟移动: ({}, {}) -> ({}, {})", from_x, from_y, to_x, to_y);
    let mut enigo = Enigo::new();
    enigo.mouse_move_to(from_x, from_y);
    thread::sleep(time::Duration::from_millis(20));
    enigo.mouse_down(MouseButton::Left);
    if click_delay_ms > 0 { thread::sleep(time::Duration::from_millis(click_delay_ms)); }
    enigo.mouse_up(MouseButton::Left);

    if move_delay_ms > 0 { thread::sleep(time::Duration::from_millis(move_delay_ms)); }

    enigo.mouse_move_to(to_x, to_y);
    thread::sleep(time::Duration::from_millis(20));
    enigo.mouse_down(MouseButton::Left);
    if click_delay_ms > 0 { thread::sleep(time::Duration::from_millis(click_delay_ms)); }
    enigo.mouse_up(MouseButton::Left);
    Ok(())
}

#[tauri::command]
pub async fn simulate_click(x: i32, y: i32, delay_ms: u64) -> Result<(), String> {
    let mut enigo = Enigo::new();
    enigo.mouse_move_to(x, y);
    thread::sleep(time::Duration::from_millis(20));
    enigo.mouse_down(MouseButton::Left);
    if delay_ms > 0 { thread::sleep(time::Duration::from_millis(delay_ms)); }
    enigo.mouse_up(MouseButton::Left);
    Ok(())
}
