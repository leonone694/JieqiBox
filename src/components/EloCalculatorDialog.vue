<template>
  <v-dialog v-model="dialogVisible" max-width="600px">
    <v-card>
      <v-card-title class="text-h6">
        {{ $t('eloCalculator.title') }}
      </v-card-title>

      <v-card-text>
        <div class="elo-calculator">
          <!-- Input Section -->
          <div class="input-section">
            <h4>{{ $t('eloCalculator.inputSection') }}</h4>
            <div class="input-row">
              <v-text-field
                v-model.number="wins"
                :label="$t('eloCalculator.wins')"
                type="number"
                min="0"
                density="compact"
                variant="outlined"
                hide-details
                class="input-field"
              />
              <v-text-field
                v-model.number="losses"
                :label="$t('eloCalculator.losses')"
                type="number"
                min="0"
                density="compact"
                variant="outlined"
                hide-details
                class="input-field"
              />
              <v-text-field
                v-model.number="draws"
                :label="$t('eloCalculator.draws')"
                type="number"
                min="0"
                density="compact"
                variant="outlined"
                hide-details
                class="input-field"
              />
            </div>
            <div class="total-games">
              {{ $t('eloCalculator.totalGames') }}: {{ totalGames }}
            </div>
          </div>

          <!-- Results Section -->
          <div v-if="eloResult" class="results-section">
            <h4>{{ $t('eloCalculator.resultsSection') }}</h4>

            <div class="result-item">
              <span class="label">{{ $t('eloCalculator.performance') }}:</span>
              <span class="value performance">{{
                formatEloRating(eloResult)
              }}</span>
            </div>

            <div class="result-item">
              <span class="label">{{ $t('eloCalculator.errorMargin') }}:</span>
              <span class="value">{{ formatErrorMargin(eloResult) }}</span>
            </div>

            <div class="result-item">
              <span class="label"
                >{{ $t('eloCalculator.confidenceInterval') }}:</span
              >
              <span class="value">{{
                formatConfidenceInterval(eloResult)
              }}</span>
            </div>

            <div class="result-item">
              <span class="label">{{ $t('eloCalculator.scoreRate') }}:</span>
              <span class="value"
                >{{ (eloResult.scoreRate * 100).toFixed(2) }}%</span
              >
            </div>

            <div class="result-item">
              <span class="label"
                >{{ $t('eloCalculator.standardError') }}:</span
              >
              <span class="value">{{
                eloResult.standardError.toFixed(4)
              }}</span>
            </div>
          </div>

          <!-- No Results Message -->
          <div v-else-if="totalGames > 0" class="no-results">
            {{ $t('eloCalculator.noResults') }}
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeDialog" color="primary" variant="text">
          {{ $t('eloCalculator.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import {
    calculateEloRating,
    formatEloRating,
    formatErrorMargin,
    formatConfidenceInterval,
  } from '@/utils/eloCalculator'

  // Props
  interface Props {
    modelValue: boolean
    initialWins?: number
    initialLosses?: number
    initialDraws?: number
  }

  const props = withDefaults(defineProps<Props>(), {
    initialWins: 0,
    initialLosses: 0,
    initialDraws: 0,
  })

  // Emits
  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
  }>()

  // Reactive data
  const wins = ref(props.initialWins)
  const losses = ref(props.initialLosses)
  const draws = ref(props.initialDraws)

  // Computed properties
  const dialogVisible = computed({
    get: () => props.modelValue,
    set: value => emit('update:modelValue', value),
  })

  const totalGames = computed(() => wins.value + losses.value + draws.value)

  const eloResult = computed(() => {
    if (totalGames.value === 0) return null
    return calculateEloRating(wins.value, losses.value, draws.value)
  })

  // Methods
  const closeDialog = () => {
    dialogVisible.value = false
  }

  // Watch for prop changes and update local values
  watch(
    () => props.initialWins,
    newValue => {
      wins.value = newValue
    }
  )

  watch(
    () => props.initialLosses,
    newValue => {
      losses.value = newValue
    }
  )

  watch(
    () => props.initialDraws,
    newValue => {
      draws.value = newValue
    }
  )
</script>

<style lang="scss" scoped>
  .elo-calculator {
    .input-section {
      margin-bottom: 24px;

      h4 {
        margin-bottom: 16px;
        color: rgb(var(--v-theme-primary));
      }

      .input-row {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;

        .input-field {
          flex: 1;
        }
      }

      .total-games {
        font-weight: 600;
        color: rgb(var(--v-theme-primary));
      }
    }

    .results-section {
      h4 {
        margin-bottom: 16px;
        color: rgb(var(--v-theme-primary));
      }

      .result-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        padding: 8px;
        border-radius: 4px;
        background-color: rgba(var(--v-theme-surface), 0.8);

        .label {
          font-weight: 600;
          color: rgb(var(--v-theme-on-surface));
        }

        .value {
          font-weight: 500;
          color: rgb(var(--v-theme-primary));

          &.performance {
            font-weight: 700;
            font-size: 1.1em;
          }
        }
      }
    }

    .no-results {
      text-align: center;
      padding: 20px;
      color: rgb(var(--v-theme-on-surface));
      opacity: 0.6;
      font-style: italic;
    }
  }
</style>
