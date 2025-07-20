import { ref, watch } from 'vue';

const INTERFACE_SETTINGS_KEY = 'interface-settings';

/**
 * Gets the initial settings from localStorage.
 * @returns {object} - Object containing initial values for showCoordinates and parseUciInfo
 */
const getInitialSettings = (): { showCoordinates: boolean; parseUciInfo: boolean, showAnimations: boolean, showPositionChart: boolean } => {
  // Only access localStorage in client environment
  if (typeof window === 'undefined') {
    return { showCoordinates: false, parseUciInfo: true, showAnimations: true, showPositionChart: false };
  }
  
  const savedSettings = localStorage.getItem(INTERFACE_SETTINGS_KEY);
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      return {
        showCoordinates: !!settings.showCoordinates,
        parseUciInfo: settings.parseUciInfo !== false, // Default to true
        showAnimations: settings.showAnimations !== false, // Default to true
        showPositionChart: !!settings.showPositionChart // Default to false
      };
    } catch (e) {
      console.error('Failed to parse interface settings:', e);
      // Return default values on parsing failure
      return { showCoordinates: false, parseUciInfo: true, showAnimations: true, showPositionChart: false };
    }
  }
  // Return default values if no saved settings found
  return { showCoordinates: false, parseUciInfo: true, showAnimations: true, showPositionChart: false };
};

// Create reactive references shared across the application
const { showCoordinates: initialShowCoordinates, parseUciInfo: initialParseUciInfo, showAnimations: initialShowAnimations, showPositionChart: initialShowPositionChart } = getInitialSettings();
const showCoordinates = ref<boolean>(initialShowCoordinates);
const parseUciInfo = ref<boolean>(initialParseUciInfo);
const showAnimations = ref<boolean>(initialShowAnimations);
const showPositionChart = ref<boolean>(initialShowPositionChart);

// Watch for changes to showCoordinates and parseUciInfo and persist to localStorage
watch([showCoordinates, parseUciInfo, showAnimations, showPositionChart], ([newShowCoordinates, newParseUciInfo, newShowAnimations, newShowPositionChart]) => {
  const settings = { 
    showCoordinates: newShowCoordinates,
    parseUciInfo: newParseUciInfo,
    showAnimations: newShowAnimations,
    showPositionChart: newShowPositionChart
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
    showAnimations,
    showPositionChart,
  };
} 