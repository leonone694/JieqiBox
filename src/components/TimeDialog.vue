<template>
  <v-dialog v-model="isVisible" max-width="500px" persistent>
    <v-card>
      <v-card-title class="dialog-title">
        <span>{{ $t('timeDialog.title') }}</span>
        <v-spacer></v-spacer>
        <v-btn icon @click="closeDialog">
          <v-icon color="black">mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="settings-container">
        <div class="setting-item" v-if="analysisMode === 'movetime'">
          <label class="setting-label">{{ $t('timeDialog.movetime') }}</label>
          <v-text-field
            v-model.number="movetime"
            type="number"
            variant="outlined"
            density="compact"
            :min="100"
            :max="10000"
            :step="100"
            hide-details
            class="setting-input"
            @update:model-value="updateSettings"
          ></v-text-field>
        </div>

        <div class="setting-item" v-if="analysisMode === 'maxThinkTime'">
          <label class="setting-label">{{
            $t('timeDialog.maxThinkTime')
          }}</label>
          <v-text-field
            v-model.number="maxThinkTime"
            type="number"
            variant="outlined"
            density="compact"
            :min="100"
            :max="60000"
            :step="100"
            hide-details
            class="setting-input"
            @update:model-value="updateSettings"
          ></v-text-field>
        </div>

        <div class="setting-item" v-if="analysisMode === 'depth'">
          <label class="setting-label">{{ $t('timeDialog.maxDepth') }}</label>
          <v-text-field
            v-model.number="maxDepth"
            type="number"
            variant="outlined"
            density="compact"
            :min="1"
            :max="100"
            :step="1"
            hide-details
            class="setting-input"
            @update:model-value="updateSettings"
          ></v-text-field>
        </div>

        <div class="setting-item" v-if="analysisMode === 'nodes'">
          <label class="setting-label">{{ $t('timeDialog.maxNodes') }}</label>
          <v-text-field
            v-model.number="maxNodes"
            type="number"
            variant="outlined"
            density="compact"
            :min="1000"
            :max="10000000"
            :step="1000"
            hide-details
            class="setting-input"
            @update:model-value="updateSettings"
          ></v-text-field>
        </div>

        <div class="setting-item">
          <label class="setting-label">{{
            $t('timeDialog.analysisMode')
          }}</label>
          <v-select
            v-model="analysisMode"
            :items="analysisModes"
            variant="outlined"
            density="compact"
            hide-details
            class="setting-input"
            @update:model-value="updateSettings"
          ></v-select>
        </div>
      </v-card-text>

      <v-card-actions class="dialog-actions">
        <v-btn color="grey" @click="resetToDefaults">{{
          $t('timeDialog.resetToDefaults')
        }}</v-btn>
        <v-btn color="error" @click="clearSettings">{{
          $t('timeDialog.clearSettings')
        }}</v-btn>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="closeDialog">{{
          $t('common.confirm')
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useConfigManager } from '../composables/useConfigManager'

  const { t } = useI18n()
  const configManager = useConfigManager()

  // Analysis mode options
  const analysisModes = computed(() => [
    { title: t('timeDialog.analysisModes.movetime'), value: 'movetime' },
    {
      title: t('timeDialog.analysisModes.maxThinkTime'),
      value: 'maxThinkTime',
    },
    { title: t('timeDialog.analysisModes.depth'), value: 'depth' },
    { title: t('timeDialog.analysisModes.nodes'), value: 'nodes' },
  ])

  // Component properties definition
  interface Props {
    modelValue: boolean
  }

  const props = defineProps<Props>()

  // Component events definition
  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'settings-changed': [settings: AnalysisSettings]
  }>()

  // Analysis settings interface
  interface AnalysisSettings {
    movetime: number
    maxThinkTime: number
    maxDepth: number
    maxNodes: number
    analysisMode: string
  }

  // Reactive data
  const movetime = ref(1000)
  const maxThinkTime = ref(5000)
  const maxDepth = ref(20)
  const maxNodes = ref(1000000)
  const analysisMode = ref('movetime')

  // Computed property - dialog visibility state
  const isVisible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
  })

  // Load settings from config file
  const loadSettings = async () => {
    try {
      await configManager.loadConfig()
      const settings = configManager.getAnalysisSettings()
      movetime.value = settings.movetime || 1000
      maxThinkTime.value = settings.maxThinkTime || 5000
      maxDepth.value = settings.maxDepth || 20
      maxNodes.value = settings.maxNodes || 1000000
      analysisMode.value = settings.analysisMode || 'movetime'
    } catch (error) {
      console.error('Failed to load analysis settings:', error)
    }
  }

  // Save settings to config file
  const saveSettings = async () => {
    const settings = {
      movetime: movetime.value,
      maxThinkTime: maxThinkTime.value,
      maxDepth: maxDepth.value,
      maxNodes: maxNodes.value,
      analysisMode: analysisMode.value,
    }
    try {
      await configManager.updateAnalysisSettings(settings)
    } catch (error) {
      console.error('Failed to save analysis settings:', error)
    }
  }

  // Update settings and notify parent component
  const updateSettings = async () => {
    await saveSettings()
    const settings: AnalysisSettings = {
      movetime: movetime.value,
      maxThinkTime: maxThinkTime.value,
      maxDepth: maxDepth.value,
      maxNodes: maxNodes.value,
      analysisMode: analysisMode.value,
    }
    emit('settings-changed', settings)
    // console.log('TimeDialog: 设置已更新并保存:', settings);
  }

  // Reset to default values
  const resetToDefaults = async () => {
    movetime.value = 1000
    maxThinkTime.value = 5000
    maxDepth.value = 20
    maxNodes.value = 1000000
    analysisMode.value = 'movetime'
    await updateSettings()
  }

  // Clear settings
  const clearSettings = async () => {
    if (confirm(t('timeDialog.confirmClearSettings'))) {
      // Reset to default values
      movetime.value = 1000
      maxThinkTime.value = 5000
      maxDepth.value = 20
      maxNodes.value = 1000000
      analysisMode.value = 'movetime'

      // Clear config storage - no need to remove specific key, just save defaults
      await updateSettings()

      // console.log(t('timeDialog.settingsCleared'));
    }
  }

  // Close the dialog
  const closeDialog = async () => {
    // Ensure current settings are saved when closing the dialog
    await saveSettings()
    isVisible.value = false
  }

  // Load settings after the component is mounted
  onMounted(async () => {
    await loadSettings()
  })

  // Expose methods to the parent component
  defineExpose({
    getSettings: () => ({
      movetime: movetime.value,
      maxThinkTime: maxThinkTime.value,
      maxDepth: maxDepth.value,
      maxNodes: maxNodes.value,
      analysisMode: analysisMode.value,
    }),
  })
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

  .settings-container {
    padding: 20px;
  }

  .setting-item {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .setting-label {
    font-weight: 500;
    color: #333;
    min-width: 120px;
    font-size: 14px;
  }

  .setting-input {
    flex: 1;
    max-width: 200px;
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
</style>
