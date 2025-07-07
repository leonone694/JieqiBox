<template>
  <div class="language-selector">
    <v-menu>
      <template v-slot:activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-translate"
          size="small"
          color="primary"
          variant="text"
          :title="$t('languages.current')"
        />
      </template>
      <v-list>
        <v-list-item
          v-for="(name, code) in availableLanguages"
          :key="code"
          @click="changeLanguage(code)"
          :active="currentLanguage === code"
        >
          <v-list-item-title>{{ name }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

// Current language
const currentLanguage = computed(() => locale.value)

// Available languages
const availableLanguages = computed(() => ({
  zh_cn: t('languages.zh_cn'),
  zh_tw: t('languages.zh_tw'),
  en: t('languages.en'),
  vi: t('languages.vi'),
  ja: t('languages.ja')
}))

// Change language
const changeLanguage = (langCode: string) => {
  locale.value = langCode
  // Save to localStorage
  localStorage.setItem('locale', langCode)
}
</script>

<style lang="scss" scoped>
.language-selector {
  display: flex;
  align-items: center;
}
</style> 