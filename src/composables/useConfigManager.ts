import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import Ini from 'ini'

// Add this new interface and export it
export interface ManagedEngine {
  id: string
  name: string
  path: string
  args: string
}

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
  // New properties for engine management
  Engines?: {
    list?: string
  }
  Settings?: {
    lastSelectedEngineId?: string
  }
  [key: string]: any // Allow additional properties for UCI options
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
        const parsedConfig = Ini.parse(loadedConfig)
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
      const configIni = Ini.stringify(configData.value)
      await invoke('save_config', { content: configIni })
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

  // --- NEW METHODS FOR ENGINE MANAGEMENT ---

  const getEngines = (): ManagedEngine[] => {
    if (!configData.value.Engines) {
      return []
    }
    try {
      // Engines are stored as a JSON string under the [Engines] section
      const engines = JSON.parse(configData.value.Engines.list || '[]')
      return engines
    } catch (e) {
      console.error('Failed to parse engines from config:', e)
      return []
    }
  }

  const saveEngines = async (engines: ManagedEngine[]) => {
    if (!configData.value.Engines) {
      configData.value.Engines = {}
    }
    configData.value.Engines.list = JSON.stringify(engines)
    await saveConfig()
    // Clear last selected engine ID if the list is empty
    if (engines.length === 0) {
      console.log(`[DEBUG] ConfigManager: Engine list is empty, clearing last selected engine ID`)
      if (configData.value.Settings) {
        delete configData.value.Settings.lastSelectedEngineId
        await saveConfig()
      }
    }
  }

  const getLastSelectedEngineId = (): string | null => {
    return configData.value.Settings?.lastSelectedEngineId || null
  }

  const saveLastSelectedEngineId = async (id: string) => {
    if (!configData.value.Settings) {
      configData.value.Settings = {}
    }
    configData.value.Settings.lastSelectedEngineId = id
    await saveConfig()
  }

  // Clear the last selected engine ID
  const clearLastSelectedEngineId = async () => {
    if (configData.value.Settings) {
      console.log(`[DEBUG] ConfigManager: Clearing last selected engine ID`)
      delete configData.value.Settings.lastSelectedEngineId
      // Don't call saveConfig here to avoid infinite recursion
      // The caller should call saveConfig if needed
    }
  }

  // --- UPDATE UCI OPTIONS TO USE ENGINE ID ---

  const getUciOptions = (engineId: string): Record<string, any> => {
    const key = `UciOptions_${engineId}`
    return configData.value[key] || {}
  }

  const updateUciOptions = async (
    engineId: string,
    options: Record<string, any>
  ) => {
    const key = `UciOptions_${engineId}`
    configData.value[key] = { ...(configData.value[key] || {}), ...options }
    await saveConfig()
  }

  const clearUciOptions = async (engineId: string) => {
    const key = `UciOptions_${engineId}`
    if (configData.value[key]) {
      delete configData.value[key]
      await saveConfig()
    }
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
    getEngines,
    saveEngines,
    getLastSelectedEngineId,
    saveLastSelectedEngineId,
    clearLastSelectedEngineId,
    getUciOptions,
    updateUciOptions,
    clearUciOptions,
    getLocale,
    updateLocale,
    resetToDefaults,
    clearAllConfig,
  }
}
