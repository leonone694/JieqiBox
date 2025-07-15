<template>
  <v-dialog v-model="isVisible" max-width="800px" persistent>
    <v-card>
      <v-card-title class="dialog-title">
        <span>{{ $t('uciOptions.title') }}</span>
        <v-spacer></v-spacer>
        <v-btn icon @click="closeDialog">
          <v-icon color="black">mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="options-container">
        <div v-if="isLoading" class="loading-section">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <span class="loading-text">{{ $t('uciOptions.loadingText') }}</span>
        </div>

        <div v-else-if="!isEngineLoaded" class="empty-section">
          <v-icon size="48" color="grey">mdi-engine-off</v-icon>
          <p>{{ $t('uciOptions.noEngineLoaded') }}</p>
          <v-btn 
            color="primary" 
            @click="loadEngine" 
            :loading="isEngineLoading"
            :disabled="isEngineLoading"
          >
            {{ $t('uciOptions.loadEngine') }}
          </v-btn>
        </div>

        <div v-else-if="uciOptions.length === 0" class="empty-section">
          <v-icon size="48" color="grey">mdi-cog-off</v-icon>
          <p>{{ $t('uciOptions.noOptionsAvailable') }}</p>
          <v-btn color="primary" @click="refreshOptions">{{ $t('uciOptions.refreshOptions') }}</v-btn>
        </div>

        <div v-else class="options-list">
          <div v-for="option in uciOptions" :key="option.name" class="option-item">
            <!-- 数值类型选项 (spin) -->
            <div v-if="option.type === 'spin'" class="option-row">
              <label class="option-label">{{ option.name }}</label>
              <v-slider
                v-model="option.currentValue as number"
                :min="option.min"
                :max="option.max"
                :step="1"
                thumb-label
                track-color="grey-lighten-1"
                class="option-slider"
                @update:model-value="updateOption(option.name, $event)"
              >
                <template #prepend>
                  <v-text-field
                    v-model.number="option.currentValue"
                    :min="option.min"
                    :max="option.max"
                    type="number"
                    variant="outlined"
                    density="compact"
                    hide-details
                    style="width: 80px"
                    @update:model-value="updateOption(option.name, $event)"
                  ></v-text-field>
                </template>
              </v-slider>
              <span class="option-range">{{ $t('uciOptions.range') }}: {{ option.min }} - {{ option.max }}</span>
            </div>

            <!-- 布尔类型选项 (check) -->
            <div v-else-if="option.type === 'check'" class="option-row">
              <label class="option-label">{{ option.name }}</label>
              <v-switch
                v-model="option.currentValue as boolean"
                color="primary"
                @update:model-value="updateOption(option.name, $event ?? false)"
              ></v-switch>
            </div>

            <!-- 下拉选择类型选项 (combo) -->
            <div v-else-if="option.type === 'combo'" class="option-row">
              <label class="option-label">{{ option.name }}</label>
              <v-select
                v-model="option.currentValue as string"
                :items="option.vars"
                variant="outlined"
                density="compact"
                class="option-select"
                @update:model-value="updateOption(option.name, $event || '')"
              ></v-select>
            </div>

            <!-- 字符串类型选项 (string) -->
            <div v-else-if="option.type === 'string'" class="option-row">
              <label class="option-label">{{ option.name }}</label>
              <v-text-field
                v-model="option.currentValue as string"
                variant="outlined"
                density="compact"
                class="option-input"
                @update:model-value="updateOption(option.name, $event || '')"
              ></v-text-field>
            </div>

            <!-- 按钮类型选项 (button) -->
            <div v-else-if="option.type === 'button'" class="option-row">
              <label class="option-label">{{ option.name }}</label>
              <v-btn
                color="primary"
                variant="outlined"
                @click="executeButtonOption(option.name)"
              >
                {{ $t('uciOptions.execute') }}
              </v-btn>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="dialog-actions">
        <v-btn color="grey" @click="resetToDefaults">{{ $t('uciOptions.resetToDefaults') }}</v-btn>
        <v-btn color="primary" @click="refreshOptions">{{ $t('uciOptions.refreshOptions') }}</v-btn>
        <v-btn color="grey" @click="clearSettings">{{ $t('uciOptions.clearSettings') }}</v-btn>
        <v-spacer></v-spacer>
        <v-btn color="grey" @click="closeDialog">{{ $t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, inject } from 'vue';
import { useI18n } from 'vue-i18n';

// UCI option interface definition
interface UciOption {
  name: string;
  type: 'spin' | 'check' | 'combo' | 'string' | 'button';
  defaultValue: string | number | boolean;
  currentValue: string | number | boolean;
  min?: number;
  max?: number;
  vars?: string[];
}

// Component properties definition
interface Props {
  modelValue: boolean;
  engineId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  engineId: 'default'
});

// Component events definition
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// Inject engine state
const { t } = useI18n();
const engineState = inject('engine-state') as any;
const { 
  isEngineLoaded, 
  isEngineLoading, 
  loadEngine, 
  engineOutput, 
  uciOptionsText, 
  currentEnginePath 
} = engineState;

// Reactive data
const isLoading = ref(false);
const uciOptions = ref<UciOption[]>([]);
const isWaitingForOptions = ref(false);

// Computed property - dialog visibility state
const isVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

// Local storage key - using a hash of the engine path
const storageKey = computed(() => {
  if (!currentEnginePath.value) return 'uci-options-default';
  const enginePathHash = btoa(currentEnginePath.value).replace(/[^a-zA-Z0-9]/g, '');
  return `uci-options-${enginePathHash}`;
});

// Send UCI command to the engine
const sendUciCommand = (command: string) => {
  if (!isEngineLoaded.value) {
    return;
  }

  // Directly call the engine's send method
  if (engineState.send) {
    engineState.send(command);
  }
};

// Function to parse UCI options text
const parseUciOptions = (uciText: string): UciOption[] => {
  const options: UciOption[] = [];
  const lines = uciText.split('\n');

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('option name ')) {
      const option = parseUciOptionLine(trimmedLine);
      if (option) {
        options.push(option);
      }
    }
  });

  return options;
};

// Function to parse a single UCI option line
const parseUciOptionLine = (line: string): UciOption | null => {
  const nameMatch = line.match(/option name (.+?) type (.+)/);
  if (!nameMatch) return null;

  const name = nameMatch[1];
  const typeMatch = line.match(/type (\w+)/);
  if (!typeMatch) return null;

  const type = typeMatch[1] as UciOption['type'];

  // Create a basic option object
  const option: UciOption = {
    name,
    type,
    defaultValue: '',
    currentValue: ''
  };

  // Parse specific parameters based on type
  switch (type) {
    case 'spin':
      const defaultSpinMatch = line.match(/default (\d+)/);
      const minMatch = line.match(/min (\d+)/);
      const maxMatch = line.match(/max (\d+)/);

      option.defaultValue = defaultSpinMatch ? parseInt(defaultSpinMatch[1]) : 0;
      option.min = minMatch ? parseInt(minMatch[1]) : 0;
      option.max = maxMatch ? parseInt(maxMatch[1]) : 100;
      break;

    case 'check':
      const defaultCheckMatch = line.match(/default (true|false)/);
      option.defaultValue = defaultCheckMatch ? defaultCheckMatch[1] === 'true' : false;
      break;

    case 'combo':
      const defaultComboMatch = line.match(/default (\w+)/);
      const varsMatch = line.match(/var (.+)/);

      option.defaultValue = defaultComboMatch ? defaultComboMatch[1] : '';
      option.vars = varsMatch ? varsMatch[1].split(' var ') : [];
      break;

    case 'string':
      const defaultStringMatch = line.match(/default (.+?)(?:\s|$)/);
      option.defaultValue = defaultStringMatch ? defaultStringMatch[1] : '';
      break;

    case 'button':
      option.defaultValue = '';
      break;
  }

  // Set current value to the default value
  option.currentValue = option.defaultValue;

  return option;
};

// Load saved option values from local storage
const loadSavedOptions = () => {
  const savedOptions = localStorage.getItem(storageKey.value);
  if (savedOptions) {
    const parsedOptions = JSON.parse(savedOptions);

    // Apply the saved values to the current options
    uciOptions.value.forEach(option => {
      if (parsedOptions[option.name] !== undefined) {
        option.currentValue = parsedOptions[option.name];
        // Immediately send the set command to the engine
        sendOptionToEngine(option.name, option.currentValue);
      }
    });
  }
};

// Save option values to local storage
const saveOptionsToStorage = () => {
  const optionsToSave: Record<string, string | number | boolean> = {};

  uciOptions.value.forEach(option => {
    if (option.type !== 'button') {
      optionsToSave[option.name] = option.currentValue;
    }
  });

  localStorage.setItem(storageKey.value, JSON.stringify(optionsToSave));
};

// Send option set command to the engine
const sendOptionToEngine = (name: string, value: string | number | boolean) => {
  const command = `setoption name ${name} value ${value}`;
  sendUciCommand(command);
};

// Function to update an option's value
const updateOption = (name: string, value: string | number | boolean) => {
  const option = uciOptions.value.find(opt => opt.name === name);
  if (option) {
    option.currentValue = value;
    // Immediately send the set command to the engine
    sendOptionToEngine(name, value);
    // Save to local storage
    saveOptionsToStorage();
  }
};

// Function to execute a button-type option
const executeButtonOption = (name: string) => {
  const command = `setoption name ${name}`;
  sendUciCommand(command);
};

// Function to reset to default values
const resetToDefaults = () => {
  uciOptions.value.forEach(option => {
    option.currentValue = option.defaultValue;
    // Send reset command to the engine
    if (option.type !== 'button') {
      sendOptionToEngine(option.name, option.defaultValue);
    }
  });

  // Clear local storage
  localStorage.removeItem(storageKey.value);
};

// Function to refresh UCI options
const refreshOptions = () => {
  if (!isEngineLoaded.value) {
    alert(t('uciOptions.noEngineLoaded'));
    return;
  }

  isLoading.value = true;

  // If options are not in cache, actively request them
  if (!uciOptionsText.value || uciOptionsText.value.trim() === '') {
    sendUciCommand('uci');
  }

  // Parse cached options
  setTimeout(() => {
    isLoading.value = false;
    const options = parseUciOptions(uciOptionsText.value);
    uciOptions.value = options;
    loadSavedOptions();
  }, 100);
};

// Function to close the dialog
const closeDialog = () => {
  isVisible.value = false;
};

// Watch engine output to get UCI options
const parseEngineOutput = () => {
  if (!isWaitingForOptions.value) return;

  // Collect all engine output
  const allOutput = (engineOutput.value as { kind: string; text: string }[])
    .filter(line => line.kind === 'recv')
    .map(line => line.text)
    .join('\n');

  // Check if 'uciok' is received (indicates options sending is complete)
  if (allOutput.includes('uciok')) {
    isWaitingForOptions.value = false;
    isLoading.value = false;

    // Parse options
    const options = parseUciOptions(allOutput);
    uciOptions.value = options;

    // Load saved option values
    loadSavedOptions();
  }
};

// Watch for changes in engine output
watch(() => engineOutput.value, parseEngineOutput, { deep: true });

// Watch for changes in engine load status
watch(() => isEngineLoaded.value, (newVal) => {
  if (newVal && currentEnginePath.value) {
    // After the engine is loaded, refresh options with a delay to ensure the engine is ready
    setTimeout(() => {
      refreshOptions();
    }, 500);
  }
});

// Watch the dialog's open state
watch(isVisible, (newVal) => {
  if (newVal && isEngineLoaded.value) {
    // Automatically refresh options when the dialog opens
    refreshOptions();
  }
});

// Initialization after component is mounted
onMounted(() => {
  // If the engine is already loaded, get options immediately
  if (isEngineLoaded.value) {
    setTimeout(() => {
      refreshOptions();
    }, 500);
  }
});

// Function to clear settings
const clearSettings = () => {
  if (confirm(t('uciOptions.confirmClearSettings'))) {
    // Clear local storage
    localStorage.removeItem(storageKey.value);

    // Reset all options to their default values
    uciOptions.value.forEach(option => {
      option.currentValue = option.defaultValue;
      // Send reset command to the engine
      if (option.type !== 'button') {
        sendOptionToEngine(option.name, option.defaultValue);
      }
    });

    // console.log(t('uciOptions.settingsCleared'));
  }
};

// Expose methods to the parent component
defineExpose({
  refreshOptions,
  resetToDefaults,
  clearSettings
});
</script>

<style lang="scss" scoped>
.dialog-title {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 24px;

  .v-icon {
    color: white;
  }
}

.options-container {
  max-height: 600px;
  overflow-y: auto;
  padding: 20px;
}

.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;

  .loading-text {
    color: #666;
    font-size: 14px;
  }
}

.empty-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
  color: #666;

  p {
    margin: 0;
    font-size: 14px;
  }
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.option-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;

  &:hover {
    background: #f5f5f5;
  }
}

.option-row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 48px;
}

.option-label {
  font-weight: 500;
  color: #333;
  min-width: 200px;
  font-size: 14px;
}

.option-slider {
  flex: 1;
  margin: 0 16px;
}

.option-range {
  font-size: 12px;
  color: #666;
  min-width: 120px;
}

.option-select,
.option-input {
  max-width: 300px;
  flex: 1;
}

.dialog-actions {
  padding: 16px 24px;
  background: #f9f9f9;
  border-top: 1px solid #e0e0e0;

  .v-btn {
    text-transform: none;
    font-weight: 500;
  }
}

// Scrollbar styles
.options-container::-webkit-scrollbar {
  width: 6px;
}

.options-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.options-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;

  &:hover {
    background: #a8a8a8;
  }
}
</style>