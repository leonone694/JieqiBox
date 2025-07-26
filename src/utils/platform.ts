/**
 * Platform detection utilities
 * Centralized platform detection logic to avoid code duplication
 */

/**
 * Check if the current platform is Android
 * Uses multiple detection methods for reliability
 * @returns true if running on Android platform
 */
export const isAndroidPlatform = (): boolean => {
  if (typeof window !== 'undefined') {
    // Check Tauri platform if available
    const tauriPlatform = (window as any).__TAURI__?.platform
    if (tauriPlatform === 'android') return true

    // Check user agent
    if (navigator.userAgent.includes('Android')) return true
    if (/Android/i.test(navigator.userAgent)) return true
  }
  return false
}
