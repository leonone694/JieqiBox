<template>
  <v-dialog v-model="dialogVisible" max-width="600" persistent>
    <v-card>
      <v-card-title class="headline d-flex justify-space-between align-center">
        <span>{{ $t('linker.title') }}</span>
        <v-btn icon="mdi-close" variant="text" @click="close" />
      </v-card-title>

      <v-card-text>
        <!-- Status Section -->
        <div class="status-section mb-4">
          <v-chip
            :color="statusColor"
            variant="elevated"
            size="small"
            class="mr-2"
          >
            <v-icon start size="small">{{ statusIcon }}</v-icon>
            {{ linker.statusText.value }}
          </v-chip>
        </div>

        <!-- Mode Selection -->
        <v-radio-group
          v-model="linker.mode.value"
          inline
          :disabled="linker.isActive.value"
          class="mb-4"
        >
          <v-radio :label="$t('linker.mode.auto')" value="auto" />
          <v-radio :label="$t('linker.mode.watch')" value="watch" />
        </v-radio-group>

        <!-- Instructions -->
        <v-alert
          v-if="linker.state.value === 'idle'"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          {{ $t('linker.instructions.idle') }}
        </v-alert>

        <v-alert
          v-else-if="linker.state.value === 'selecting'"
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          {{ $t('linker.instructions.selecting') }}
        </v-alert>

        <v-alert
          v-else-if="linker.state.value === 'error'"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ linker.errorMessage.value }}
        </v-alert>

        <!-- Image Upload Section (for web-based manual input) -->
        <div v-if="linker.state.value === 'selecting'" class="upload-section">
          <v-file-input
            v-model="selectedFile"
            :label="$t('linker.uploadScreenshot')"
            accept="image/*"
            prepend-icon="mdi-camera"
            variant="outlined"
            density="compact"
            @update:model-value="handleFileSelected"
          />
        </div>

        <!-- Recognition Preview -->
        <div
          v-if="previewImageUrl"
          class="preview-section mt-4"
        >
          <div class="preview-container">
            <img
              ref="previewImage"
              :src="previewImageUrl"
              class="preview-image"
              alt="Screenshot preview"
            />
            <canvas ref="overlayCanvas" class="overlay-canvas" />
          </div>
        </div>

        <!-- Recognized FEN Display -->
        <div v-if="recognizedFen" class="fen-section mt-4">
          <v-text-field
            v-model="recognizedFen"
            :label="$t('linker.recognizedFen')"
            readonly
            variant="outlined"
            density="compact"
          >
            <template #append>
              <v-btn
                icon="mdi-content-copy"
                variant="text"
                size="small"
                @click="copyFen"
              />
            </template>
          </v-text-field>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-btn
          v-if="linker.state.value === 'idle'"
          color="primary"
          @click="handleStart"
        >
          {{ $t('linker.start') }}
        </v-btn>

        <v-btn
          v-else-if="linker.state.value === 'selecting' && recognizedFen"
          color="success"
          @click="handleConfirm"
        >
          {{ $t('linker.confirm') }}
        </v-btn>

        <v-btn
          v-else-if="linker.state.value === 'connecting'"
          color="error"
          @click="handleStop"
        >
          {{ $t('linker.stop') }}
        </v-btn>

        <v-spacer />

        <v-btn variant="text" @click="showSettings = true">
          <v-icon start>mdi-cog</v-icon>
          {{ $t('linker.settings') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Settings Dialog -->
    <LinkerSettingsDialog
      v-model="showSettings"
      :settings="linker.settings.value"
      @update:settings="linker.updateSettings"
      @reset="linker.resetSettings"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, nextTick } from 'vue'
import { useLinker, type BoardGrid } from '../composables/useLinker'
import LinkerSettingsDialog from './LinkerSettingsDialog.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'boardInitialized', fen: string, isReversed: boolean): void
  (e: 'moveDetected', from: string, to: string): void
}>()

const gameState = inject('game-state') as any
const engineState = inject('engine-state') as any

const linker = useLinker()
const showSettings = ref(false)
const selectedFile = ref<File | null>(null)
const previewImageUrl = ref<string | null>(null)
const recognizedFen = ref<string | null>(null)
const previewImage = ref<HTMLImageElement | null>(null)
const overlayCanvas = ref<HTMLCanvasElement | null>(null)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

// Status indicators
const statusColor = computed(() => {
  switch (linker.state.value) {
    case 'idle':
      return 'grey'
    case 'selecting':
      return 'warning'
    case 'connecting':
      return linker.isScanning.value ? 'success' : 'info'
    case 'error':
      return 'error'
    default:
      return 'grey'
  }
})

const statusIcon = computed(() => {
  switch (linker.state.value) {
    case 'idle':
      return 'mdi-link-off'
    case 'selecting':
      return 'mdi-cursor-default-click'
    case 'connecting':
      return linker.isScanning.value ? 'mdi-radar' : 'mdi-link'
    case 'error':
      return 'mdi-alert-circle'
    default:
      return 'mdi-help-circle'
  }
})

// Set up callbacks for linker
linker.setCallbacks({
  onMoveDetected: (from: string, to: string) => {
    emit('moveDetected', from, to)
    // Also apply the move to the game
    if (gameState?.playMoveFromUci) {
      gameState.playMoveFromUci(from + to)
    }
  },
  onBoardInitialized: (fen: string, isReversed: boolean) => {
    emit('boardInitialized', fen, isReversed)
    // Load the FEN into the game
    if (gameState?.confirmFenInput) {
      gameState.confirmFenInput(fen)
    }
  },
  getEngineBoard: (): BoardGrid | null => {
    // Convert game state to board grid
    if (!gameState?.pieces?.value) return null

    const board: BoardGrid = Array(10)
      .fill(null)
      .map(() => Array(9).fill(null))

    for (const piece of gameState.pieces.value) {
      if (piece.isKnown) {
        const fenChar = gameState.getCharFromPieceName?.(piece.name)
        if (fenChar && piece.row >= 0 && piece.row < 10 && piece.col >= 0 && piece.col < 9) {
          board[piece.row][piece.col] = fenChar
        }
      } else {
        // Dark piece
        const side = gameState.getPieceSide?.(piece)
        if (piece.row >= 0 && piece.row < 10 && piece.col >= 0 && piece.col < 9) {
          board[piece.row][piece.col] = side === 'red' ? 'X' : 'x'
        }
      }
    }

    return board
  },
  isEngineThinking: () => {
    return engineState?.isThinking?.value || false
  },
})

// Handle file selection
const handleFileSelected = async (files: File[] | File | null) => {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) {
    previewImageUrl.value = null
    recognizedFen.value = null
    return
  }

  // Create preview URL
  previewImageUrl.value = URL.createObjectURL(file)

  // Process the image
  const result = await linker.processScreenshot(file)
  if (result) {
    recognizedFen.value = result.fen + ' w - - 0 1'

    // Draw bounding boxes on preview
    await nextTick()
    drawRecognitionOverlay()
  }
}

// Draw recognition overlay
const drawRecognitionOverlay = () => {
  if (!previewImage.value || !overlayCanvas.value) return

  const img = previewImage.value
  const canvas = overlayCanvas.value

  // Wait for image to load
  if (!img.complete) {
    img.onload = () => drawRecognitionOverlay()
    return
  }

  const dispW = img.clientWidth
  const dispH = img.clientHeight

  canvas.style.position = 'absolute'
  canvas.style.left = '0'
  canvas.style.top = '0'
  canvas.style.width = dispW + 'px'
  canvas.style.height = dispH + 'px'
  canvas.style.pointerEvents = 'none'

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(dispW * dpr)
  canvas.height = Math.round(dispH * dpr)

  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, dispW, dispH)

  // Draw board position
  if (linker.boardPosition.value) {
    const natW = img.naturalWidth
    const natH = img.naturalHeight
    const scaleX = dispW / natW
    const scaleY = dispH / natH

    const { x, y, width, height } = linker.boardPosition.value
    ctx.strokeStyle = '#4CAF50'
    ctx.lineWidth = 2
    ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY)
  }
}

// Copy FEN to clipboard
const copyFen = async () => {
  if (recognizedFen.value) {
    try {
      await navigator.clipboard.writeText(recognizedFen.value)
    } catch (error) {
      console.error('Failed to copy FEN:', error)
    }
  }
}

// Action handlers
const handleStart = async () => {
  await linker.start()
}

const handleConfirm = () => {
  if (recognizedFen.value) {
    emit('boardInitialized', recognizedFen.value, false)
    if (gameState?.confirmFenInput) {
      gameState.confirmFenInput(recognizedFen.value)
    }
    linker.startScanning()
  }
}

const handleStop = () => {
  linker.stop()
  previewImageUrl.value = null
  recognizedFen.value = null
}

const close = () => {
  handleStop()
  dialogVisible.value = false
}

// Cleanup preview URL when dialog closes
watch(dialogVisible, newValue => {
  if (!newValue) {
    if (previewImageUrl.value) {
      URL.revokeObjectURL(previewImageUrl.value)
      previewImageUrl.value = null
    }
    recognizedFen.value = null
    selectedFile.value = null
  }
})
</script>

<style scoped lang="scss">
.status-section {
  display: flex;
  align-items: center;
}

.upload-section {
  margin-top: 16px;
}

.preview-section {
  position: relative;
}

.preview-container {
  position: relative;
  display: inline-block;
  width: 100%;
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.fen-section {
  margin-top: 16px;
}
</style>
