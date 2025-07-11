import { ref, watch } from 'vue';

const INTERFACE_SETTINGS_KEY = 'interface-settings';

/**
 * Gets the initial setting from localStorage.
 * @returns {boolean} - The initial value for whether to show coordinates.
 */
const getInitialShowCoordinates = (): boolean => {
  // Access localStorage only in the client environment
  if (typeof window === 'undefined') {
    return false;
  }
  
  const savedSettings = localStorage.getItem(INTERFACE_SETTINGS_KEY);
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      return !!settings.showCoordinates;
    } catch (e) {
      console.error('Failed to parse interface settings:', e);
      // Return default value on parsing failure
      return false;
    }
  }
  // Return default value if no saved settings are found
  return false;
};

// Create a reactive reference shared across the application
const showCoordinates = ref<boolean>(getInitialShowCoordinates());

// Watch for changes to showCoordinates and persist them to localStorage
watch(showCoordinates, (newValue) => {
  const settings = { showCoordinates: newValue };
  localStorage.setItem(INTERFACE_SETTINGS_KEY, JSON.stringify(settings));
});

/**
 * Provides the reactive state for interface settings.
 * @returns {{showCoordinates: import('vue').Ref<boolean>}} - An object containing the reactive state for interface settings.
 */
export function useInterfaceSettings() {
  return {
    showCoordinates,
  };
} 