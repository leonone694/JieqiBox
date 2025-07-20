<template>
  <v-dialog v-model="isDialogVisible" max-width="500px">
    <v-card>
      <v-card-title>{{ $t('interfaceSettings.title') }}</v-card-title>
      <v-card-text>
        <v-switch
          v-model="showCoordinates"
          :label="$t('interfaceSettings.showCoordinates')"
          color="primary"
        ></v-switch>
        <v-switch
          v-model="parseUciInfo"
          :label="$t('interfaceSettings.parseUciInfo')"
          color="primary"
        ></v-switch>
        <v-switch
          v-model="showAnimations"
          :label="$t('interfaceSettings.showAnimations')"
          color="primary"
        ></v-switch>
        <v-switch
          v-model="showPositionChart"
          :label="$t('interfaceSettings.showPositionChart')"
          color="primary"
        ></v-switch>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="closeDialog">{{
          $t('common.close')
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { useInterfaceSettings } from '@/composables/useInterfaceSettings'

  const isDialogVisible = defineModel<boolean>()

  // Get showCoordinates and parseUciInfo from shared state
  const { showCoordinates, parseUciInfo, showAnimations, showPositionChart } =
    useInterfaceSettings()

  const closeDialog = () => {
    isDialogVisible.value = false
  }
</script>
