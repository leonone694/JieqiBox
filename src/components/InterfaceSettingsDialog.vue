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
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="closeDialog">{{ $t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { defineModel } from 'vue';
import { useInterfaceSettings } from '@/composables/useInterfaceSettings';

const isDialogVisible = defineModel<boolean>();

// Get showCoordinates from the shared state
const { showCoordinates } = useInterfaceSettings();

const closeDialog = () => {
  isDialogVisible.value = false;
};
</script>