<template>
  <v-dialog v-model="isVisible" max-width="800px" persistent>
    <v-card>
      <v-card-title>
        <span class="headline">{{ $t('engineManager.title') }}</span>
      </v-card-title>

      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="engines"
          item-key="id"
          class="elevation-1"
        >
          <template v-slot:item.actions="{ item }">
            <v-icon small class="mr-2" @click="editEngine(item)">
              mdi-pencil
            </v-icon>
            <v-icon small @click="prepareToDeleteEngine(item)">
              mdi-delete
            </v-icon>
          </template>
        </v-data-table>
      </v-card-text>

      <v-card-actions>
        <v-btn
          v-if="isAndroidPlatform"
          color="blue-darken-1"
          @click="addEngineAndroid"
          >{{ $t('engineManager.addEngineAndroid') }}</v-btn
        >
        <v-btn v-else color="blue-darken-1" @click="addEngineDesktop">{{
          $t('engineManager.addEngine')
        }}</v-btn>
        <v-spacer></v-spacer>
        <v-btn color="grey-darken-1" @click="closeDialog">{{
          $t('common.close')
        }}</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Add/Edit Engine Dialog -->
    <v-dialog v-model="editDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>
          <span class="headline">{{ formTitle }}</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-text-field
              v-model="editedEngine.name"
              :label="$t('engineManager.engineName')"
              :rules="[rules.required, rules.unique]"
              :disabled="isEditing"
            ></v-text-field>
            <v-text-field
              v-model="editedEngine.path"
              :label="$t('engineManager.enginePath')"
              disabled
            ></v-text-field>
            <v-text-field
              v-model="editedEngine.args"
              :label="$t('engineManager.arguments')"
            ></v-text-field>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" @click="closeEditDialog">{{
            $t('common.cancel')
          }}</v-btn>
          <v-btn color="blue-darken-1" @click="saveEngine">{{
            $t('common.save')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Deletion Confirmation Dialog -->
    <v-dialog v-model="confirmDeleteDialog" max-width="450px">
      <v-card>
        <v-card-title class="text-h5">{{
          $t('engineManager.confirmDeleteTitle')
        }}</v-card-title>
        <v-card-text>
          {{
            $t('engineManager.confirmDeleteMessage', {
              name: engineToDelete?.name,
            })
          }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" text @click="cancelDelete">{{
            $t('common.cancel')
          }}</v-btn>
          <v-btn color="red-darken-1" text @click="confirmDelete">{{
            $t('common.delete')
          }}</v-btn>
          <v-spacer></v-spacer>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import {
    useConfigManager,
    type ManagedEngine,
  } from '../composables/useConfigManager'
  import { open } from '@tauri-apps/plugin-dialog'
  import { invoke } from '@tauri-apps/api/core'
  import type { UnlistenFn } from '@tauri-apps/api/event'

  // Props and Emits
  const props = defineProps<{ modelValue: boolean }>()
  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

  // Composables
  const { t } = useI18n()
  const configManager = useConfigManager()

  // State
  const engines = ref<ManagedEngine[]>([])
  const editDialog = ref(false)
  const isEditing = ref(false)
  const editedEngine = ref<ManagedEngine>({
    id: '',
    name: '',
    path: '',
    args: '',
  })
  const defaultEngine: ManagedEngine = {
    id: '',
    name: '',
    path: '',
    args: '',
  }
  let unlistenAndroidAdd: Promise<UnlistenFn> | null = null

  // --- NEW State for Deletion Flow ---
  const confirmDeleteDialog = ref(false)
  const engineToDelete = ref<ManagedEngine | null>(null)

  // Computed properties
  const isVisible = computed({
    get: () => props.modelValue,
    set: value => emit('update:modelValue', value),
  })

  const formTitle = computed(() => {
    return isEditing.value
      ? t('engineManager.editEngine')
      : t('engineManager.addEngine')
  })

  const isAndroidPlatform = computed(() => {
    if (typeof window !== 'undefined') {
      const tauriPlatform = (window as any).__TAURI__?.platform
      if (tauriPlatform === 'android') return true
      if (navigator.userAgent.includes('Android')) return true
      if (/Android/i.test(navigator.userAgent)) return true
    }
    return false
  })

  // Table headers
  const headers = computed(() => [
    { title: t('engineManager.engineName'), key: 'name', minWidth: '150px' },
    { title: t('engineManager.enginePath'), key: 'path', minWidth: '250px' },
    { title: t('engineManager.arguments'), key: 'args', minWidth: '150px' },
    {
      title: t('engineManager.actions'),
      key: 'actions',
      sortable: false,
      align: 'end' as const,
    },
  ])

  // Validation Rules
  const rules = {
    required: (value: string) => !!value || t('common.required'),
    unique: (value: string) => {
      if (isEditing.value) return true // Don't check uniqueness when editing
      return (
        !engines.value.some((e: ManagedEngine) => e.name === value) ||
        t('common.nameMustBeUnique')
      )
    },
  }

  // Methods
  const loadEnginesFromConfig = async () => {
    await configManager.loadConfig()
    engines.value = configManager.getEngines()
  }

  const saveEnginesToConfig = async () => {
    await configManager.saveEngines(engines.value)
  }

  const addEngineDesktop = async () => {
    const selectedPath = await open({
      multiple: false,
      title: 'Select UCI Engine',
    })

    if (typeof selectedPath === 'string' && selectedPath) {
      const newId = `engine_${Date.now()}`
      editedEngine.value = {
        id: newId,
        name: `Engine ${engines.value.length + 1}`, // Default name
        path: selectedPath,
        args: '',
      }
      isEditing.value = false
      editDialog.value = true
    }
  }

  const addEngineAndroid = () => {
    const name = prompt(t('engineManager.promptEngineName'))
    if (!name) return
    if (engines.value.some((e: ManagedEngine) => e.name === name)) {
      alert(t('engineManager.nameExists'))
      return
    }

    const args = prompt(t('engineManager.promptEngineArgs'), '') ?? ''

    // Store the engine data for when the file is selected
    const engineData = { name, args }

    // Use the JavaScript interface approach that the Android MainActivity expects
    if (typeof window !== 'undefined' && (window as any).SafFileInterface) {
      // Call the JavaScript interface directly
      ;(window as any).SafFileInterface.startFileSelection()

      // Listen for the result
      const handleSafResult = (event: Event) => {
        const customEvent = event as CustomEvent
        const { filename, result } = customEvent.detail

        if (
          result &&
          result !== 'File selection cancelled' &&
          result !== 'No URI returned' &&
          result !== 'No data returned'
        ) {
          // Success - the file was copied to internal storage
          // Now we need to call the Rust backend to handle the SAF file result
          console.log('[DEBUG] Calling handle_saf_file_result with:', {
            tempFilePath: result,
            filename: filename,
            name: engineData.name,
            args: engineData.args,
          })

          invoke('handle_saf_file_result', {
            tempFilePath: result,
            filename: filename,
            name: engineData.name,
            args: engineData.args,
          }).catch(err => {
            console.error('Failed to handle SAF file result:', err)
            alert(t('errors.failedToProcessEngine') + ': ' + err)
          })
        } else {
          // User cancelled or there was an error
          console.log('SAF file selection cancelled or failed:', result)
        }

        // Remove the event listener
        window.removeEventListener('saf-file-result', handleSafResult)
      }

      window.addEventListener('saf-file-result', handleSafResult)
    } else {
      // Fallback to the Tauri invoke approach
      invoke('request_saf_file_selection', { name, args }).catch(err => {
        console.error('SAF request failed:', err)
        alert(t('errors.failedToOpenFileSelector'))
      })
    }
  }

  const editEngine = (engine: ManagedEngine) => {
    isEditing.value = true
    editedEngine.value = { ...engine }
    editDialog.value = true
  }

  // --- UPDATED Deletion Flow ---
  const prepareToDeleteEngine = (engine: ManagedEngine) => {
    // 1. Store the engine to be deleted
    engineToDelete.value = engine
    // 2. Open the non-blocking confirmation dialog
    confirmDeleteDialog.value = true
  }

  const confirmDelete = () => {
    // 3. If the user confirms in the dialog, proceed with deletion
    if (!engineToDelete.value) return
    console.log(
      `[DEBUG] EngineManager: Deleting engine: ${engineToDelete.value.name}`
    )
    engines.value = engines.value.filter(e => e.id !== engineToDelete.value!.id)
    console.log(
      `[DEBUG] EngineManager: Engines remaining: ${engines.value.length}`
    )
    saveEnginesToConfig()
    // Clear last selected engine ID if the deleted engine was the last selected one
    const lastSelectedId = configManager.getLastSelectedEngineId()
    if (lastSelectedId === engineToDelete.value.id) {
      console.log(
        `[DEBUG] EngineManager: Deleted engine was the last selected one, clearing last selected engine ID`
      )
      configManager.clearLastSelectedEngineId()
    }
    // 4. Close the dialog
    cancelDelete()
  }

  const cancelDelete = () => {
    // 5. If the user cancels, just close the dialog and clear the state
    confirmDeleteDialog.value = false
    engineToDelete.value = null
  }
  // --- END of Deletion Flow ---

  const saveEngine = () => {
    if (isEditing.value) {
      const index = engines.value.findIndex(
        (e: ManagedEngine) => e.id === editedEngine.value.id
      )
      if (index > -1) {
        // Check if the engine ID changed (which shouldn't happen in normal editing)
        const oldEngine = engines.value[index]
        engines.value.splice(index, 1, { ...editedEngine.value })
        // If the engine ID changed, clear the last selected engine ID
        if (oldEngine.id !== editedEngine.value.id) {
          console.log(
            `[DEBUG] EngineManager: Engine ID changed from ${oldEngine.id} to ${editedEngine.value.id}, clearing last selected engine ID`
          )
          configManager.clearLastSelectedEngineId()
        }
      }
    } else {
      if (
        engines.value.some(
          (e: ManagedEngine) => e.name === editedEngine.value.name
        )
      ) {
        alert(t('engineManager.nameExists'))
        return
      }
      engines.value.push({ ...editedEngine.value })
    }
    saveEnginesToConfig()
    closeEditDialog()
  }

  const closeDialog = () => {
    isVisible.value = false
  }

  const closeEditDialog = () => {
    editDialog.value = false
    editedEngine.value = { ...defaultEngine }
    isEditing.value = false
  }

  // Lifecycle Hooks
  onMounted(async () => {
    loadEnginesFromConfig()

    // Clear last selected engine ID if the engine list is empty
    if (engines.value.length === 0) {
      console.log(
        `[DEBUG] EngineManager: Engine list is empty on mount, clearing last selected engine ID`
      )
      configManager.clearLastSelectedEngineId()
    }

    if (isAndroidPlatform.value) {
      const { listen } = await import('@tauri-apps/api/event')
      unlistenAndroidAdd = listen('android-engine-added', event => {
        const payload = event.payload as ManagedEngine
        engines.value.push(payload)
        saveEnginesToConfig()
        alert(t('engineManager.engineAddedSuccess', { name: payload.name }))
      })
    }
  })

  onUnmounted(async () => {
    if (unlistenAndroidAdd) {
      const unlisten = await unlistenAndroidAdd
      unlisten()
    }
  })

  watch(isVisible, newValue => {
    if (newValue) {
      loadEnginesFromConfig()
      // Clear last selected engine ID if the engine list is empty
      if (engines.value.length === 0) {
        console.log(
          `[DEBUG] EngineManager: Engine list is empty when dialog opened, clearing last selected engine ID`
        )
        configManager.clearLastSelectedEngineId()
      }
    }
  })
</script>
