import { ref, watch } from 'vue';

const INTERFACE_SETTINGS_KEY = 'interface-settings';

/**
 * Gets the initial settings from localStorage.
 * @returns {object} - Object containing initial values for showCoordinates and parseUciInfo
 */
const getInitialSettings = (): { showCoordinates: boolean; parseUciInfo: boolean } => {
  // Only access localStorage in client environment
  if (typeof window === 'undefined') {
    return { showCoordinates: false, parseUciInfo: true };
  }
  
  const savedSettings = localStorage.getItem(INTERFACE_SETTINGS_KEY);
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      return {
        showCoordinates: !!settings.showCoordinates,
        parseUciInfo: settings.parseUciInfo !== false // Default to true
      };
    } catch (e) {
      console.error('Failed to parse interface settings:', e);
      // Return default values on parsing failure
      return { showCoordinates: false, parseUciInfo: true };
    }
  }
  // Return default values if no saved settings found
  return { showCoordinates: false, parseUciInfo: true };
};

// Create reactive references shared across the application
const { showCoordinates: initialShowCoordinates, parseUciInfo: initialParseUciInfo } = getInitialSettings();
const showCoordinates = ref<boolean>(initialShowCoordinates);
const parseUciInfo = ref<boolean>(initialParseUciInfo);

// Watch for changes to showCoordinates and parseUciInfo and persist to localStorage
watch([showCoordinates, parseUciInfo], ([newShowCoordinates, newParseUciInfo]) => {
  const settings = { 
    showCoordinates: newShowCoordinates,
    parseUciInfo: newParseUciInfo
  };
  localStorage.setItem(INTERFACE_SETTINGS_KEY, JSON.stringify(settings));
});

/**
 * Provides reactive state for interface settings.
 * @returns {{showCoordinates: import('vue').Ref<boolean>, parseUciInfo: import('vue').Ref<boolean>}} - Object containing reactive state for interface settings
 */
export function useInterfaceSettings() {
  return {
    showCoordinates,
    parseUciInfo,
  };
} 