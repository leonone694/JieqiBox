<template>
  <div class="evaluation-chart">
    <h3 class="chart-title">{{ $t('evaluationChart.title') }}</h3>

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
        :label="$t('evaluationChart.showMoveLabels')"
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

  /* ---------- Component Props ---------- */
  interface Props {
    history: HistoryEntry[]
    currentMoveIndex: number
  }
  const props = defineProps<Props>()

  /* ---------- Canvas-related Refs ---------- */
  const chartCanvas = ref<HTMLCanvasElement | null>(null)
  const chartContainer = ref<HTMLElement | null>(null)
  const chartContext = ref<CanvasRenderingContext2D | null>(null)

  /* ---------- Display State ---------- */
  const showMoveLabels = ref(true)
  const tooltipVisible = ref(false)
  const tooltipStyle = ref({ left: '0px', top: '0px' })
  const tooltipData = ref({
    move: '',
    score: '',
    scoreClass: '',
    time: '',
  })

  /* ---------- Dimensions ---------- */
  const chartWidth = ref(0)
  const chartHeight = ref(0)
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }

  /* ---------- Parameter: asinh Scaling Factor ---------- */
  const scaleFactor = 100 // <- Key parameter
  const transform = (s: number) => Math.asinh(s / scaleFactor) // Original -> Compressed
  const inverseTransform = (v: number) => Math.sinh(v) * scaleFactor // Compressed -> Original

  /* ---------- Data Preprocessing ---------- */
  const chartData = computed(() => {
    const data: Array<{
      moveIndex: number
      moveNumber: number
      moveText: string
      score: number | null
      time: number | null
      isRedMove: boolean
    }> = []

    // Initial position
    data.push({
      moveIndex: 0,
      moveNumber: 0,
      moveText: t('evaluationChart.opening'),
      score: null,
      time: null,
      isRedMove: false,
    })

    // Moves
    let moveCount = 0
    props.history.forEach((entry, index) => {
      if (entry.type === 'move') {
        moveCount++
        const moveNumber = Math.floor((moveCount - 1) / 2) + 1
        const isRedMove = (moveCount - 1) % 2 === 0
        const moveText = `${moveNumber}${isRedMove ? '.' : '...'} ${entry.data}`

        // Convert engine score to Red's perspective
        let converted = entry.engineScore
        if (converted !== null && converted !== undefined && !isRedMove) {
          converted = -converted
        }

        data.push({
          moveIndex: index + 1,
          moveNumber,
          moveText,
          score: converted ?? null,
          time: entry.engineTime ?? null,
          isRedMove,
        })
      }
    })
    return data
  })

  /* ---------- Move Labels ---------- */
  const moveLabels = computed(() => {
    if (!showMoveLabels.value || !chartData.value.length) return []

    const labels: Array<{
      text: string
      style: { left: string; top: string }
      isCurrentMove: boolean
    }> = []

    const points = chartData.value
    const xStep =
      (chartWidth.value - padding.left - padding.right) /
      Math.max(1, points.length - 1)

    points.forEach((p, i) => {
      if (p.score !== null && p.score !== undefined) {
        const x = padding.left + i * xStep
        labels.push({
          text: p.moveText,
          style: { left: `${x}px`, top: `${padding.top + 10}px` },
          isCurrentMove: p.moveIndex === props.currentMoveIndex,
        })
      }
    })
    return labels
  })

  /* ---------- Main Drawing Function ---------- */
  const drawChart = () => {
    if (!chartCanvas.value || !chartContext.value) return
    const ctx = chartContext.value
    ctx.clearRect(0, 0, chartCanvas.value.width, chartCanvas.value.height)

    const points = chartData.value
    if (points.length < 2) return

    const area = {
      x: padding.left,
      y: padding.top,
      width: chartWidth.value - padding.left - padding.right,
      height: chartHeight.value - padding.top - padding.bottom,
    }

    /* ------- Calculate range after asinh transform ------- */
    const scores = points.map(p => p.score).filter(s => s !== null) as number[]
    if (!scores.length) {
      ctx.fillStyle = '#999'
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        t('evaluationChart.noData') || 'No analysis data available',
        area.x + area.width / 2,
        area.y + area.height / 2
      )
      return
    }

    const transScores = scores.map(transform)
    const minT = Math.min(...transScores)
    const maxT = Math.max(...transScores)
    const pad = Math.max(0.5, (maxT - minT) * 0.1)
    const displayMinT = minT - pad
    const displayMaxT = maxT + pad
    const rangeT = displayMaxT - displayMinT

    /* ------- Draw grid / axes / line / points ------- */
    drawGrid(ctx, area)
    drawScoreAxis(ctx, area, displayMinT, displayMaxT)
    drawMoveAxis(ctx, area, points)
    drawScoreLine(ctx, area, points, displayMinT, rangeT)
    drawDataPoints(ctx, area, points, displayMinT, rangeT)
  }

  /* ---------- Grid ---------- */
  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    area: { x: number; y: number; width: number; height: number }
  ) => {
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1

    const rows = 5
    for (let i = 0; i <= rows; i++) {
      const y = area.y + (i / rows) * area.height
      ctx.beginPath()
      ctx.moveTo(area.x, y)
      ctx.lineTo(area.x + area.width, y)
      ctx.stroke()
    }

    const cols = chartData.value.length
    const xStep = area.width / Math.max(1, cols - 1)
    for (let i = 0; i < cols; i++) {
      const x = area.x + i * xStep
      ctx.beginPath()
      ctx.moveTo(x, area.y)
      ctx.lineTo(x, area.y + area.height)
      ctx.stroke()
    }
  }

  /* ---------- Score Axis (asinh) ---------- */
  const drawScoreAxis = (
    ctx: CanvasRenderingContext2D,
    area: any,
    minT: number,
    maxT: number
  ) => {
    ctx.fillStyle = '#666'
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    const rows = 5
    for (let i = 0; i <= rows; i++) {
      const tVal = minT + (i / rows) * (maxT - minT)
      const y =
        area.y + area.height - ((tVal - minT) / (maxT - minT)) * area.height
      const dispScore = inverseTransform(tVal)
      ctx.fillText(formatScore(dispScore), area.x - 10, y)
    }
  }

  /* ---------- Move Axis ---------- */
  const drawMoveAxis = (
    ctx: CanvasRenderingContext2D,
    area: any,
    points: any[]
  ) => {
    ctx.fillStyle = '#666'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const xStep = area.width / Math.max(1, points.length - 1)
    points.forEach((p, i) => {
      if (p.score !== null && p.score !== undefined) {
        const x = area.x + i * xStep
        ctx.fillText(p.moveNumber.toString(), x, area.y + area.height + 5)
      }
    })
  }

  /* ---------- Score Line ---------- */
  const drawScoreLine = (
    ctx: CanvasRenderingContext2D,
    area: any,
    points: any[],
    minT: number,
    rangeT: number
  ) => {
    ctx.strokeStyle = '#1976d2'
    ctx.lineWidth = 2
    ctx.beginPath()

    const xStep = area.width / Math.max(1, points.length - 1)
    let first = true

    points.forEach((p, i) => {
      if (p.score !== null && p.score !== undefined) {
        const x = area.x + i * xStep
        const t = transform(p.score)
        const y = area.y + area.height - ((t - minT) / rangeT) * area.height
        first ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        first = false
      }
    })
    ctx.stroke()
  }

  /* ---------- Data Points ---------- */
  const drawDataPoints = (
    ctx: CanvasRenderingContext2D,
    area: any,
    points: any[],
    minT: number,
    rangeT: number
  ) => {
    const xStep = area.width / Math.max(1, points.length - 1)

    points.forEach((p, i) => {
      if (p.score !== null && p.score !== undefined) {
        const x = area.x + i * xStep
        const t = transform(p.score)
        const y = area.y + area.height - ((t - minT) / rangeT) * area.height

        /* Color logic is still based on the original score */
        let color = '#666'
        if (p.score > 100) color = '#c62828'
        else if (p.score < -100) color = '#2e7d32'
        else if (p.score > 50) color = '#ef5350'
        else if (p.score < -50) color = '#66bb6a'

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()

        if (p.moveIndex === props.currentMoveIndex) {
          ctx.strokeStyle = '#ff9800'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(x, y, 6, 0, 2 * Math.PI)
          ctx.stroke()
        }
      }
    })
  }

  /* ---------- Utility Functions ---------- */
  const formatScore = (s: number) => {
    if (s >= 10000) return 'M+'
    if (s <= -10000) return 'M-'
    return Math.round(s).toString()
  }

  const getScoreClass = (s: number): string => {
    if (s > 100) return 'score-positive'
    if (s < -100) return 'score-negative'
    if (s > 50) return 'score-slight-positive'
    if (s < -50) return 'score-slight-negative'
    return 'score-neutral'
  }
  const formatTime = (ms: number) =>
    ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`

  /* ---------- Tooltip ---------- */
  const handleMouseMove = (e: MouseEvent) => {
    if (!chartCanvas.value || !chartContainer.value) {
      tooltipVisible.value = false
      return
    }

    // Use event.offsetX to get mouse coordinates relative to the canvas, this method is more stable and less affected by scaling
    const x = e.offsetX

    const points = chartData.value
    if (points.length < 2) {
      tooltipVisible.value = false
      return
    }

    // Use the canvas's width attribute, which is the actual width of its drawing surface
    const plotAreaWidth = chartCanvas.value.width - padding.left - padding.right

    if (plotAreaWidth <= 0) {
      tooltipVisible.value = false
      return
    }

    const xStep = plotAreaWidth / (points.length - 1)

    const closestIndex = Math.round((x - padding.left) / xStep)
    const clampedIndex = Math.max(0, Math.min(points.length - 1, closestIndex))

    const closestPoint = points[clampedIndex]

    if (closestPoint && closestPoint.score !== null) {
      const pointX = padding.left + clampedIndex * xStep
      const distance = Math.abs(x - pointX)

      if (distance < xStep / 2) {
        tooltipVisible.value = true
        tooltipData.value = {
          move: closestPoint.moveText,
          score: formatScore(closestPoint.score!),
          scoreClass: getScoreClass(closestPoint.score!),
          time: closestPoint.time ? formatTime(closestPoint.time) : '',
        }

        // Use a combination of offsetLeft and offsetX/Y for precise positioning
        const left = chartCanvas.value.offsetLeft + e.offsetX - 15
        const top = chartCanvas.value.offsetTop + e.offsetY + 15
        tooltipStyle.value = { left: `${left}px`, top: `${top}px` }
      } else {
        tooltipVisible.value = false
      }
    } else {
      tooltipVisible.value = false
    }
  }
  const handleMouseLeave = () => (tooltipVisible.value = false)

  /* ---------- Resize Listener ---------- */
  const handleResize = () => {
    if (!chartCanvas.value || !chartContainer.value) return
    const ctn = chartContainer.value
    chartWidth.value = ctn.clientWidth
    chartHeight.value = ctn.clientHeight
    chartCanvas.value.width = chartWidth.value
    chartCanvas.value.height = chartHeight.value
    chartCanvas.value.style.width = `${chartWidth.value}px`
    chartCanvas.value.style.height = `${chartHeight.value}px`
    nextTick(drawChart)
  }

  /* ---------- Watchers for Data / Controls ---------- */
  watch(
    [() => props.history, () => props.currentMoveIndex],
    () => nextTick(drawChart),
    { deep: true }
  )
  watch([showMoveLabels], () => nextTick(drawChart))

  /* ---------- Lifecycle Hooks ---------- */
  onMounted(() => {
    if (chartCanvas.value) {
      chartContext.value = chartCanvas.value.getContext('2d')
      chartCanvas.value.addEventListener('mousemove', handleMouseMove)
      chartCanvas.value.addEventListener('mouseleave', handleMouseLeave)
      handleResize()
      window.addEventListener('resize', handleResize)
    }
  })
  onUnmounted(() => {
    chartCanvas.value?.removeEventListener('mousemove', handleMouseMove)
    chartCanvas.value?.removeEventListener('mouseleave', handleMouseLeave)
    window.removeEventListener('resize', handleResize)
  })
</script>

<style lang="scss" scoped>
  .evaluation-chart {
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 100%;
    box-sizing: border-box;
    background-color: rgb(var(--v-theme-surface));
  }
  .chart-title {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
  }
  .chart-container {
    position: relative;
    width: 100%;
    height: 200px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
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
    background: rgba(var(--v-theme-surface), 0.9);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    transform: translateX(-50%);
    white-space: nowrap;
    &.current-move {
      background: #ff9800;
      color: #fff;
      border-color: #f57c00;
    }
  }
  .score-tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
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
  @media (max-width: 768px) {
    .evaluation-chart {
      padding: 12px;
    }
    .chart-container {
      height: 180px;
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
