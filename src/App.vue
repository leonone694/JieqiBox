<script setup lang="ts">
import { provide, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import TopToolbar from './components/TopToolbar.vue';
import Chessboard from './components/Chessboard.vue'
import AnalysisSidebar from './components/AnalysisSidebar.vue';
import FlipPromptDialog from './components/FlipPromptDialog.vue';

import { useChessGame } from './composables/useChessGame';
import { useUciEngine } from './composables/useUciEngine';

const { locale } = useI18n();

// Set HTML lang attribute based on current language
const htmlLang = computed(() => {
  const langMap: { [key: string]: string } = {
    'zh_cn': 'zh-CN',
    'zh_tw': 'zh-TW',
    'ja': 'ja-JP',
    'en': 'en-US',
    'vi': 'vi-VN'
  };
  return langMap[locale.value] || 'en-US';
});

// Watch for language changes and update HTML lang attribute
watch(locale, (newLocale) => {
  const langMap: { [key: string]: string } = {
    'zh_cn': 'zh-CN',
    'zh_tw': 'zh-TW',
    'ja': 'ja-JP',
    'en': 'en-US',
    'vi': 'vi-VN'
  };
  const htmlLang = langMap[newLocale] || 'en-US';
  document.documentElement.lang = htmlLang;
  document.documentElement.setAttribute('lang', htmlLang);
}, { immediate: true });

const game = useChessGame();

// Pass generateFen to ensure engine receives correct FEN format
const engine = useUciEngine(game.generateFen);

// Note: Removed incorrect engine connection code
// game.connectEngine(engine.startAnalysis);

// Provide global state
provide('game-state', game);
provide('engine-state', engine);

// Provide the FEN input dialog state from game state
provide('fen-input-dialog-visible', game.isFenInputDialogVisible);

// Set global engine state for useChessGame to access
(window as any).__ENGINE_STATE__ = engine;
</script>

<template>
  <div class="app-container" :lang="htmlLang">
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
  
  // Mobile responsive layout - switch to vertical on narrow screens
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    padding: 10px;
    gap: 30px;
  }
}

.chessboard-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
  
  // Mobile responsive adjustments
  @media (max-width: 768px) {
    padding-top: 30px;
  }
}
</style>