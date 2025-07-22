import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'

// Configuration data structure
interface ConfigData {
  interfaceSettings: {
    showCoordinates: boolean
    parseUciInfo: boolean
    showAnimations: boolean
    showPositionChart: boolean
    darkMode: boolean
  }
  analysisSettings: {
    movetime: number
    maxThinkTime: number
    maxDepth: number
    maxNodes: number
    analysisMode: string
  }
  uciOptions: Record<string, Record<string, string | number | boolean>>
  locale: string
}

// Default configuration values
const defaultConfig: ConfigData = {
  interfaceSettings: {
    showCoordinates: false,
    parseUciInfo: true,
    showAnimations: true,
    showPositionChart: false,
    darkMode: false,
  },
  analysisSettings: {
    movetime: 1000,
    maxThinkTime: 5000,
    maxDepth: 20,
    maxNodes: 1000000,
    analysisMode: 'movetime',
  },
  uciOptions: {},
  locale: 'zh_cn',
}

// Current configuration data
const configData = ref<ConfigData>({ ...defaultConfig })

// Platform detection utility
const isAndroid = () => {
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

const isAndroidPlatform = computed(() => isAndroid())

// Configuration file manager composable
export function useConfigManager() {
  // Load configuration from file
  const loadConfig = async (): Promise<void> => {
    try {
      const loadedConfig = await invoke<string>('load_config')
      if (loadedConfig) {
        const parsedConfig = JSON.parse(loadedConfig)
        // Merge with default config to ensure all properties exist
        configData.value = {
          ...defaultConfig,
          ...parsedConfig,
          interfaceSettings: {
            ...defaultConfig.interfaceSettings,
            ...parsedConfig.interfaceSettings,
          },
          analysisSettings: {
            ...defaultConfig.analysisSettings,
            ...parsedConfig.analysisSettings,
          },
          uciOptions: parsedConfig.uciOptions || {},
        }
      }
    } catch (error) {
      console.error('Failed to load configuration:', error)
      // Use default configuration if loading fails
      configData.value = { ...defaultConfig }
    }
  }

  // Save configuration to file
  const saveConfig = async (): Promise<void> => {
    try {
      const configJson = JSON.stringify(configData.value, null, 2)
      await invoke('save_config', { content: configJson })
    } catch (error) {
      console.error('Failed to save configuration:', error)
    }
  }

  // Get interface settings
  const getInterfaceSettings = () => configData.value.interfaceSettings

  // Update interface settings
  const updateInterfaceSettings = async (
    settings: Partial<ConfigData['interfaceSettings']>
  ): Promise<void> => {
    configData.value.interfaceSettings = {
      ...configData.value.interfaceSettings,
      ...settings,
    }
    await saveConfig()
  }

  // Get analysis settings
  const getAnalysisSettings = () => configData.value.analysisSettings

  // Update analysis settings
  const updateAnalysisSettings = async (
    settings: Partial<ConfigData['analysisSettings']>
  ): Promise<void> => {
    configData.value.analysisSettings = {
      ...configData.value.analysisSettings,
      ...settings,
    }
    await saveConfig()
  }

  // Get UCI options for a specific engine
  const getUciOptions = (
    enginePathHash: string
  ): Record<string, string | number | boolean> => {
    return configData.value.uciOptions[enginePathHash] || {}
  }

  // Update UCI options for a specific engine
  const updateUciOptions = async (
    enginePathHash: string,
    options: Record<string, string | number | boolean>
  ): Promise<void> => {
    configData.value.uciOptions[enginePathHash] = options
    await saveConfig()
  }

  // Clear UCI options for a specific engine
  const clearUciOptions = async (enginePathHash: string): Promise<void> => {
    delete configData.value.uciOptions[enginePathHash]
    await saveConfig()
  }

  // Get locale setting
  const getLocale = () => configData.value.locale

  // Update locale setting
  const updateLocale = async (locale: string): Promise<void> => {
    configData.value.locale = locale
    await saveConfig()
  }

  // Reset all configuration to defaults
  const resetToDefaults = async (): Promise<void> => {
    configData.value = { ...defaultConfig }
    await saveConfig()
  }

  // Clear all configuration
  const clearAllConfig = async (): Promise<void> => {
    try {
      await invoke('clear_config')
      configData.value = { ...defaultConfig }
    } catch (error) {
      console.error('Failed to clear configuration:', error)
    }
  }

  return {
    // State
    configData,
    isAndroidPlatform,

    // Methods
    loadConfig,
    saveConfig,
    getInterfaceSettings,
    updateInterfaceSettings,
    getAnalysisSettings,
    updateAnalysisSettings,
    getUciOptions,
    updateUciOptions,
    clearUciOptions,
    getLocale,
    updateLocale,
    resetToDefaults,
    clearAllConfig,
  }
}
