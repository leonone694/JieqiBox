<script setup lang="ts">
import { provide } from 'vue';
import TopToolbar from './components/TopToolbar.vue';
import Chessboard from './components/Chessboard.vue'
import AnalysisSidebar from './components/AnalysisSidebar.vue';
import FlipPromptDialog from './components/FlipPromptDialog.vue';

import { useChessGame } from './composables/useChessGame';
import { useUciEngine } from './composables/useUciEngine';

const game = useChessGame();

// Pass generateFenForEngine to ensure engine receives correct FEN format
const engine = useUciEngine(game.generateFenForEngine);

// Note: Removed incorrect engine connection code
// game.connectEngine(engine.startAnalysis);

// Provide global state
provide('game-state', game);
provide('engine-state', engine);

// Provide the FEN input dialog state from game state
provide('fen-input-dialog-visible', game.isFenInputDialogVisible);
</script>

<template>
  <div class="app-container">
    <TopToolbar />
    <div class="main-layout">
      <div class="chessboard-area">
        <Chessboard />
      </div>
      <AnalysisSidebar />
      <FlipPromptDialog />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #e8eaf6;
}

.main-layout {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: center;
  flex: 1;
  width: 100%;
  padding: 20px;
  gap: 20px;
  box-sizing: border-box;
}

.chessboard-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
}
</style>