<template>
  <div class="position-chart">
    <h3 class="chart-title">{{ $t('positionChart.title') }}</h3>

    <!-- Chart container -->
    <div class="chart-container" ref="chartContainer">
      <canvas ref="chartCanvas" class="chart-canvas"></canvas>

      <!-- Move labels overlay -->
      <div class="move-labels" v-if="showMoveLabels">
        <div
          v-for="(label, index) in moveLabels"
          :key="index"
          class="move-label"
          :style="label.style"
          :class="{ 'current-move': label.isCurrentMove }"
        >
          {{ label.text }}
        </div>
      </div>

      <!-- Score tooltip -->
      <div v-if="tooltipVisible" class="score-tooltip" :style="tooltipStyle">
        <div class="tooltip-move">{{ tooltipData.move }}</div>
        <div class="tooltip-score" :class="tooltipData.scoreClass">
          {{ tooltipData.score }}
        </div>
        <div class="tooltip-time" v-if="tooltipData.time">
          {{ tooltipData.time }}
        </div>
      </div>
    </div>

    <!-- Chart controls -->
    <div class="chart-controls">
      <v-switch
        v-model="showMoveLabels"
        :label="$t('positionChart.showMoveLabels')"
        color="primary"
        hide-details
        density="compact"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
  import { useI18n } from 'vue-i18n'
  import type { HistoryEntry } from '@/composables/useChessGame'

  const { t } = useI18n()

  // Props
  interface Props {
    history: HistoryEntry[]
    currentMoveIndex: number
  }

  const props = defineProps<Props>()

  // Chart state
  const chartCanvas = ref<HTMLCanvasElement | null>(null)
  const chartContainer = ref<HTMLElement | null>(null)
  const chartContext = ref<CanvasRenderingContext2D | null>(null)

  // Chart settings
  const showMoveLabels = ref(true)
  const tooltipVisible = ref(false)
  const tooltipStyle = ref({ left: '0px', top: '0px' })
  const tooltipData = ref({
    move: '',
    score: '',
    scoreClass: '',
    time: '',
  })

  // Chart dimensions
  const chartWidth = ref(0)
  const chartHeight = ref(0)
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }

  // Data processing
  const chartData = computed(() => {
    const data: Array<{
      moveIndex: number
      moveNumber: number
      moveText: string
      score: number | null
      time: number | null
      isRedMove: boolean
    }> = []

    // Add initial position (opening)
    data.push({
      moveIndex: 0,
      moveNumber: 0,
      moveText: t('positionChart.opening'),
      score: null,
      time: null,
      isRedMove: false,
    })

    // Process move history
    let moveCount = 0
    props.history.forEach((entry, index) => {
      if (entry.type === 'move') {
        moveCount++
        const moveNumber = Math.floor((moveCount - 1) / 2) + 1
        const isRedMove = (moveCount - 1) % 2 === 0
        const moveText = `${moveNumber}${isRedMove ? '.' : '...'} ${entry.data}`

        // Convert score to red perspective (black moves have inverted scores)
        let convertedScore = entry.engineScore
        if (
          convertedScore !== null &&
          convertedScore !== undefined &&
          !isRedMove
        ) {
          convertedScore = -convertedScore // Invert score for black moves
        }

        data.push({
          moveIndex: index + 1,
          moveNumber,
          moveText,
          score:
            convertedScore !== null && convertedScore !== undefined
              ? convertedScore
              : null,
          time: entry.engineTime || null,
          isRedMove,
        })
      }
    })

    return data
  })

  // Move labels for overlay
  const moveLabels = computed(() => {
    if (!showMoveLabels.value || !chartData.value.length) return []

    const labels: Array<{
      text: string
      style: { left: string; top: string }
      isCurrentMove: boolean
    }> = []

    const dataPoints = chartData.value
    const xStep =
      (chartWidth.value - padding.left - padding.right) /
      Math.max(1, dataPoints.length - 1)

    dataPoints.forEach((point, index) => {
      if (point.score !== null && point.score !== undefined) {
        const x = padding.left + index * xStep
        const y = padding.top + 10 // Position labels at top

        labels.push({
          text: point.moveText,
          style: {
            left: `${x}px`,
            top: `${y}px`,
          },
          isCurrentMove: point.moveIndex === props.currentMoveIndex,
        })
      }
    })

    return labels
  })

  // Chart drawing
  const drawChart = () => {
    if (!chartCanvas.value || !chartContext.value) return

    const ctx = chartContext.value
    const canvas = chartCanvas.value

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const dataPoints = chartData.value
    if (dataPoints.length < 2) return

    // Calculate chart area
    const chartArea = {
      x: padding.left,
      y: padding.top,
      width: chartWidth.value - padding.left - padding.right,
      height: chartHeight.value - padding.top - padding.bottom,
    }

    // Find score range
    const scores = dataPoints
      .map(p => p.score)
      .filter(s => s !== null) as number[]
    if (scores.length === 0) {
      // Draw empty chart message
      ctx.fillStyle = '#999'
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        t('positionChart.noData') || 'No analysis data available',
        chartArea.x + chartArea.width / 2,
        chartArea.y + chartArea.height / 2
      )
      return
    }

    const minScore = Math.min(...scores)
    const maxScore = Math.max(...scores)
    const scoreRange = maxScore - minScore

    // Add padding to score range
    const scorePadding = Math.max(100, scoreRange * 0.1)
    const displayMinScore = minScore - scorePadding
    const displayMaxScore = maxScore + scorePadding
    const displayScoreRange = displayMaxScore - displayMinScore

    // Draw grid lines
    drawGrid(ctx, chartArea)

    // Draw score axis
    drawScoreAxis(ctx, chartArea, displayMinScore, displayMaxScore)

    // Draw move axis
    drawMoveAxis(ctx, chartArea, dataPoints)

    // Draw score line
    drawScoreLine(
      ctx,
      chartArea,
      dataPoints,
      displayMinScore,
      displayScoreRange
    )

    // Draw data points
    drawDataPoints(
      ctx,
      chartArea,
      dataPoints,
      displayMinScore,
      displayScoreRange
    )
  }

  // Draw grid lines
  const drawGrid = (ctx: CanvasRenderingContext2D, chartArea: any) => {
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1

    // Horizontal grid lines
    const gridLines = 5
    for (let i = 0; i <= gridLines; i++) {
      const y = chartArea.y + (i / gridLines) * chartArea.height
      ctx.beginPath()
      ctx.moveTo(chartArea.x, y)
      ctx.lineTo(chartArea.x + chartArea.width, y)
      ctx.stroke()
    }

    // Vertical grid lines
    const dataPoints = chartData.value
    const xStep = chartArea.width / Math.max(1, dataPoints.length - 1)
    for (let i = 0; i < dataPoints.length; i++) {
      const x = chartArea.x + i * xStep
      ctx.beginPath()
      ctx.moveTo(x, chartArea.y)
      ctx.lineTo(x, chartArea.y + chartArea.height)
      ctx.stroke()
    }
  }

  // Draw score axis
  const drawScoreAxis = (
    ctx: CanvasRenderingContext2D,
    chartArea: any,
    minScore: number,
    maxScore: number
  ) => {
    ctx.fillStyle = '#666'
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    const gridLines = 5
    for (let i = 0; i <= gridLines; i++) {
      const score = minScore + (i / gridLines) * (maxScore - minScore)
      const y =
        chartArea.y +
        chartArea.height -
        ((score - minScore) / (maxScore - minScore)) * chartArea.height

      // Draw score label
      ctx.fillText(formatScore(score), chartArea.x - 10, y)
    }
  }

  // Draw move axis
  const drawMoveAxis = (
    ctx: CanvasRenderingContext2D,
    chartArea: any,
    dataPoints: any[]
  ) => {
    ctx.fillStyle = '#666'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const xStep = chartArea.width / Math.max(1, dataPoints.length - 1)
    for (let i = 0; i < dataPoints.length; i++) {
      const x = chartArea.x + i * xStep
      const y = chartArea.y + chartArea.height + 5

      // Show move number for moves with scores
      if (dataPoints[i].score !== null && dataPoints[i].score !== undefined) {
        ctx.fillText(dataPoints[i].moveNumber.toString(), x, y)
      }
    }
  }

  // Draw score line
  const drawScoreLine = (
    ctx: CanvasRenderingContext2D,
    chartArea: any,
    dataPoints: any[],
    minScore: number,
    scoreRange: number
  ) => {
    ctx.strokeStyle = '#1976d2'
    ctx.lineWidth = 2
    ctx.beginPath()

    const xStep = chartArea.width / Math.max(1, dataPoints.length - 1)
    let firstPoint = true

    dataPoints.forEach((point, index) => {
      if (point.score !== null && point.score !== undefined) {
        const x = chartArea.x + index * xStep
        const y =
          chartArea.y +
          chartArea.height -
          ((point.score - minScore) / scoreRange) * chartArea.height

        if (firstPoint) {
          ctx.moveTo(x, y)
          firstPoint = false
        } else {
          ctx.lineTo(x, y)
        }
      }
    })

    ctx.stroke()
  }

  // Draw data points
  const drawDataPoints = (
    ctx: CanvasRenderingContext2D,
    chartArea: any,
    dataPoints: any[],
    minScore: number,
    scoreRange: number
  ) => {
    const xStep = chartArea.width / Math.max(1, dataPoints.length - 1)

    dataPoints.forEach((point, index) => {
      if (point.score !== null && point.score !== undefined) {
        const x = chartArea.x + index * xStep
        const y =
          chartArea.y +
          chartArea.height -
          ((point.score - minScore) / scoreRange) * chartArea.height

        // Determine point color based on score
        let color = '#666'
        if (point.score > 100)
          color = '#c62828' // Red advantage
        else if (point.score < -100)
          color = '#2e7d32' // Black advantage
        else if (point.score > 50)
          color = '#ef5350' // Slight red advantage
        else if (point.score < -50) color = '#66bb6a' // Slight black advantage

        // Draw point
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()

        // Highlight current move
        if (point.moveIndex === props.currentMoveIndex) {
          ctx.strokeStyle = '#ff9800'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(x, y, 6, 0, 2 * Math.PI)
          ctx.stroke()
        }
      }
    })
  }

  // Format score for display
  const formatScore = (score: number): string => {
    if (score >= 10000) return 'M+'
    if (score <= -10000) return 'M-'
    return Math.round(score).toString()
  }

  // Handle mouse events for tooltip
  const handleMouseMove = (event: MouseEvent) => {
    if (!chartCanvas.value || !chartContainer.value) return

    const rect = chartCanvas.value.getBoundingClientRect()
    const x = event.clientX - rect.left

    const dataPoints = chartData.value
    const xStep =
      (chartWidth.value - padding.left - padding.right) /
      Math.max(1, dataPoints.length - 1)

    // Find closest data point
    let closestPoint: any = null
    let minDistance = Infinity

    dataPoints.forEach((point, index) => {
      if (point.score !== null && point.score !== undefined) {
        const pointX = padding.left + index * xStep
        const distance = Math.abs(x - pointX)

        if (distance < minDistance && distance < 20) {
          minDistance = distance
          closestPoint = { ...point, index }
        }
      }
    })

    if (closestPoint) {
      tooltipVisible.value = true
      tooltipData.value = {
        move: closestPoint.moveText,
        score: formatScore(closestPoint.score),
        scoreClass: getScoreClass(closestPoint.score),
        time: closestPoint.time ? formatTime(closestPoint.time) : '',
      }

      tooltipStyle.value = {
        left: `${event.clientX + 10}px`,
        top: `${event.clientY - 10}px`,
      }
    } else {
      tooltipVisible.value = false
    }
  }

  const handleMouseLeave = () => {
    tooltipVisible.value = false
  }

  // Get score class for styling
  const getScoreClass = (score: number): string => {
    if (score > 100) return 'score-positive'
    if (score < -100) return 'score-negative'
    if (score > 50) return 'score-slight-positive'
    if (score < -50) return 'score-slight-negative'
    return 'score-neutral'
  }

  // Format time for display
  const formatTime = (timeMs: number): string => {
    if (timeMs < 1000) return `${timeMs}ms`
    return `${(timeMs / 1000).toFixed(1)}s`
  }

  // Resize handler
  const handleResize = () => {
    if (!chartCanvas.value || !chartContainer.value) return

    const container = chartContainer.value
    chartWidth.value = container.clientWidth
    chartHeight.value = container.clientHeight

    const canvas = chartCanvas.value
    canvas.width = chartWidth.value
    canvas.height = chartHeight.value

    // Set canvas display size
    canvas.style.width = `${chartWidth.value}px`
    canvas.style.height = `${chartHeight.value}px`

    // Redraw chart
    nextTick(() => {
      drawChart()
    })
  }

  // Watch for data changes
  watch(
    [() => props.history, () => props.currentMoveIndex],
    () => {
      nextTick(() => {
        drawChart()
      })
    },
    { deep: true }
  )

  // Watch for control changes
  watch([showMoveLabels], () => {
    nextTick(() => {
      drawChart()
    })
  })

  // Lifecycle
  onMounted(() => {
    if (chartCanvas.value) {
      chartContext.value = chartCanvas.value.getContext('2d')

      // Add event listeners
      chartCanvas.value.addEventListener('mousemove', handleMouseMove)
      chartCanvas.value.addEventListener('mouseleave', handleMouseLeave)

      // Initial resize
      handleResize()

      // Add resize listener
      window.addEventListener('resize', handleResize)
    }
  })

  onUnmounted(() => {
    if (chartCanvas.value) {
      chartCanvas.value.removeEventListener('mousemove', handleMouseMove)
      chartCanvas.value.removeEventListener('mouseleave', handleMouseLeave)
    }
    window.removeEventListener('resize', handleResize)
  })
</script>

<style lang="scss" scoped>
  .position-chart {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 100%;
    box-sizing: border-box;
  }

  .chart-title {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #333;
    font-weight: 600;
  }

  .chart-container {
    position: relative;
    width: 100%;
    height: 200px; // Increased height for better visibility
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
  }

  .chart-canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .move-labels {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .move-label {
    position: absolute;
    background: rgba(255, 255, 255, 0.9);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    color: #666;
    border: 1px solid #ddd;
    transform: translateX(-50%);
    white-space: nowrap;

    &.current-move {
      background: #ff9800;
      color: white;
      border-color: #f57c00;
    }
  }

  .score-tooltip {
    position: fixed;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 1000;
    white-space: nowrap;

    .tooltip-move {
      font-weight: bold;
      margin-bottom: 4px;
    }

    .tooltip-score {
      font-weight: bold;
      margin-bottom: 2px;

      &.score-positive {
        color: #ef5350;
      }

      &.score-negative {
        color: #66bb6a;
      }

      &.score-slight-positive {
        color: #ffcdd2;
      }

      &.score-slight-negative {
        color: #c8e6c9;
      }

      &.score-neutral {
        color: #fff;
      }
    }

    .tooltip-time {
      color: #ccc;
      font-size: 10px;
    }
  }

  .chart-controls {
    margin-top: 12px;
    display: flex;
    gap: 16px;

    .v-switch {
      margin: 0;
    }
  }

  // Mobile responsive adjustments
  @media (max-width: 768px) {
    .position-chart {
      padding: 12px;
    }

    .chart-container {
      height: 180px; // Adjusted height for mobile
    }

    .chart-controls {
      flex-direction: column;
      gap: 8px;
    }

    .chart-title {
      font-size: 14px;
    }
  }
</style>
