/**
 * Elo Performance Rating Calculator
 * Based on WLD (Wins-Losses-Draws) statistics
 */

export interface EloRatingResult {
  performance: number
  errorMargin: number
  confidenceInterval: [number, number]
  scoreRate: number
  standardError: number
  totalGames: number
}

/**
 * Calculate Elo performance rating based on WLD statistics
 * @param wins Number of wins
 * @param losses Number of losses  
 * @param draws Number of draws
 * @returns EloRatingResult or null if no games played
 */
export function calculateEloRating(wins: number, losses: number, draws: number): EloRatingResult | null {
  const W = wins
  const L = losses
  const D = draws
  const N = W + L + D
  
  // If no games played, return null
  if (N === 0) return null
  
  // Step 1: Calculate average score rate (μ)
  const mu = (W + 0.5 * D) / N
  
  // Handle edge cases where mu is 0 or 1
  if (mu === 0) {
    // All losses - return negative infinity equivalent
    return {
      performance: -Infinity,
      errorMargin: 0,
      confidenceInterval: [-Infinity, -Infinity],
      scoreRate: mu,
      standardError: 0,
      totalGames: N
    }
  }
  
  if (mu === 1) {
    // All wins - return positive infinity equivalent
    return {
      performance: Infinity,
      errorMargin: 0,
      confidenceInterval: [Infinity, Infinity],
      scoreRate: mu,
      standardError: 0,
      totalGames: N
    }
  }
  
  // Step 2: Calculate standard error of the mean (σ_μ)
  // First calculate variance of individual game scores
  const variance = (W / N) * Math.pow(1 - mu, 2) + 
                   (L / N) * Math.pow(0 - mu, 2) + 
                   (D / N) * Math.pow(0.5 - mu, 2)
  
  // Then calculate standard error
  const sigmaMu = Math.sqrt(variance / N)
  
  // Step 3: Convert performance to Elo difference
  // ΔElo(P) = -400 × log₁₀(1/P - 1)
  const deltaElo = -400 * Math.log10(1 / mu - 1)
  
  // Step 4: Calculate 95% confidence interval
  const muMin = mu - 1.959963984540054 * sigmaMu
  const muMax = mu + 1.959963984540054 * sigmaMu
  
  // Handle edge cases for confidence interval calculation
  let eloMin, eloMax
  
  if (muMin <= 0) {
    eloMin = -Infinity
  } else if (muMin >= 1) {
    eloMin = Infinity
  } else {
    eloMin = -400 * Math.log10(1 / muMin - 1)
  }
  
  if (muMax <= 0) {
    eloMax = -Infinity
  } else if (muMax >= 1) {
    eloMax = Infinity
  } else {
    eloMax = -400 * Math.log10(1 / muMax - 1)
  }
  
  // Calculate error margin (half the width of the confidence interval)
  const errorMargin = (eloMax - eloMin) / 2
  
  return {
    performance: parseFloat(deltaElo.toFixed(2)),
    errorMargin: parseFloat(errorMargin.toFixed(2)),
    confidenceInterval: [parseFloat(eloMin.toFixed(2)), parseFloat(eloMax.toFixed(2))],
    scoreRate: mu,
    standardError: sigmaMu,
    totalGames: N
  }
}

/**
 * Format Elo rating for display
 * @param rating EloRatingResult
 * @returns Formatted string for display
 */
export function formatEloRating(rating: EloRatingResult): string {
  if (rating.performance === Infinity) {
    return '+∞'
  } else if (rating.performance === -Infinity) {
    return '-∞'
  } else {
    const sign = rating.performance > 0 ? '+' : ''
    return `${sign}${rating.performance.toFixed(2)}`
  }
}

/**
 * Format error margin for display
 * @param rating EloRatingResult
 * @returns Formatted error margin string
 */
export function formatErrorMargin(rating: EloRatingResult): string {
  if (rating.errorMargin === Infinity || rating.errorMargin === -Infinity) {
    return ''
  }
  return `± ${rating.errorMargin.toFixed(2)}`
}

/**
 * Format confidence interval for display
 * @param rating EloRatingResult
 * @returns Formatted confidence interval string
 */
export function formatConfidenceInterval(rating: EloRatingResult): string {
  const formatValue = (value: number): string => {
    if (value === Infinity) return '+∞'
    if (value === -Infinity) return '-∞'
    return value.toFixed(2)
  }
  
  const min = formatValue(rating.confidenceInterval[0])
  const max = formatValue(rating.confidenceInterval[1])
  
  return `(${min} - ${max})`
} 