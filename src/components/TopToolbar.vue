<template>
  <div class="top-toolbar">
    <div class="toolbar-left">
      <v-btn 
        icon="mdi-chess-king" 
        size="small" 
        color="primary" 
        variant="text"
        @click="setupNewGame"
        :title="$t('toolbar.newGame')"
      />
      <v-btn 
        icon="mdi-content-copy" 
        size="small" 
        color="primary" 
        variant="text"
        @click="copyFenToClipboard"
        :title="$t('toolbar.copyFen')"
      />
      <v-btn 
        icon="mdi-text-box" 
        size="small" 
        color="primary" 
        variant="text"
        @click="inputFenString"
        :title="$t('toolbar.inputFen')"
      />
      <v-btn 
        icon="mdi-pencil-box" 
        size="small" 
        color="primary" 
        variant="text"
        @click="showPositionEditor = true"
        :title="$t('toolbar.editPosition')"
      />
    </div>

    <div class="toolbar-center">
      <span class="game-title">{{ $t('toolbar.gameTitle') }}</span>
    </div>

    <div class="toolbar-right">
      <v-btn 
        icon="mdi-cog" 
        size="small" 
        color="primary" 
        variant="text"
        @click="showUciOptionsDialog = true"
        :title="$t('toolbar.uciSettings')"
      />
      <v-btn 
        icon="mdi-timer" 
        size="small" 
        color="primary" 
        variant="text"
        @click="showTimeDialog = true"
        :title="$t('toolbar.analysisParams')"
      />
      <v-btn 
        icon="mdi-content-save" 
        size="small" 
        color="success" 
        variant="text"
        @click="handleSaveNotation"
        :loading="isSaving"
        :title="$t('toolbar.saveNotation')"
      />
      <v-btn 
        icon="mdi-folder-open" 
        size="small" 
        color="primary" 
        variant="text"
        @click="handleOpenNotation"
        :loading="isOpening"
        :title="$t('toolbar.openNotation')"
      />
      <LanguageSelector />
    </div>

    <!-- Dialog components -->
    <UciOptionsDialog v-model="showUciOptionsDialog" />
    <TimeDialog v-model="showTimeDialog" @settings-changed="handleSettingsChanged" />
    <PositionEditorDialog 
      v-model="showPositionEditor" 
      @position-changed="handlePositionChanged" 
    />
    <FenInputDialog v-model="isFenDialogVisible" @confirm="confirmFenInput" />
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import UciOptionsDialog from './UciOptionsDialog.vue';
import TimeDialog from './TimeDialog.vue';
import PositionEditorDialog from './PositionEditorDialog.vue';
import FenInputDialog from './FenInputDialog.vue';
import LanguageSelector from './LanguageSelector.vue';

const { t } = useI18n();
const gameState: any = inject('game-state');
const engineState: any = inject('engine-state');
const isFenDialogVisible: any = inject('fen-input-dialog-visible');

// Dialog states
const showUciOptionsDialog = ref(false);
const showTimeDialog = ref(false);
const showPositionEditor = ref(false);

// Save/Open states
const isSaving = ref(false);
const isOpening = ref(false);

// Analysis settings
const analysisSettings = ref({
  movetime: 1000,
  maxDepth: 20,
  maxNodes: 1000000,
  analysisMode: 'movetime'
});

// New game - stop engine analysis before starting new game
const setupNewGame = () => {
  // Stop engine analysis before starting new game to prevent continued thinking
  if (engineState.stopAnalysis) {
    engineState.stopAnalysis();
  }
  gameState.setupNewGame();
};

// Copy FEN
const copyFenToClipboard = async () => {
  await gameState.copyFenToClipboard();
};

// Input FEN
const inputFenString = () => {
  isFenDialogVisible.value = true;
};

// Confirm FEN input - stop engine analysis before loading new position
const confirmFenInput = (fen: string) => {
  // Stop engine analysis before loading new position to prevent continued thinking
  if (engineState.stopAnalysis) {
    engineState.stopAnalysis();
  }
  // Only process if FEN string is not empty
  if (fen && fen.trim()) {
    gameState.confirmFenInput(fen);
  }
  // Ensure local state is also synchronized to close
  isFenDialogVisible.value = false;
};

// Save notation
const handleSaveNotation = async () => {
  isSaving.value = true;
  try {
    await gameState.saveGameNotation();
  } catch (error) {
    console.error(t('errors.saveNotationFailed'), error);
  } finally {
    isSaving.value = false;
  }
};

// Open notation - stop engine analysis before loading new game
const handleOpenNotation = () => {
  // Stop engine analysis before loading new game to prevent continued thinking
  if (engineState.stopAnalysis) {
    engineState.stopAnalysis();
  }
  isOpening.value = true;
  try {
    gameState.openGameNotation();
  } catch (error) {
    console.error(t('errors.openNotationFailed'), error);
  } finally {
    isOpening.value = false;
  }
};

// Handle analysis settings changes
const handleSettingsChanged = (settings: any) => {
  console.log('TopToolbar: 收到设置变化:', settings);
  analysisSettings.value = settings;
  // Save to local storage immediately to ensure AnalysisSidebar detects the change
  localStorage.setItem('analysis-settings', JSON.stringify(settings));
};

// Handle position changes - stop engine analysis when position is edited
const handlePositionChanged = (_pieces: any[], _sideToMove: 'red' | 'black') => {
  // Stop engine analysis when position is edited to prevent continued thinking
  if (engineState.stopAnalysis) {
    engineState.stopAnalysis();
  }
  // Callback after position editing is complete
};
</script>

<style lang="scss" scoped>
.top-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 4px;
  align-items: center;
}

.toolbar-center {
  flex: 1;
  text-align: center;
}

.game-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}
</style>