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
      <v-switch
        v-model="useLinearYAxis"
        :label="$t('evaluationChart.linearYAxis')"
        color="primary"
        hide-details
        density="compact"
      />
      <v-switch
        v-model="showOnlyLines"
        :label="$t('evaluationChart.showOnlyLines')"
        color="primary"
        hide-details
        density="compact"
      />
      <v-switch
        v-model="blackPerspective"
        :label="$t('evaluationChart.blackPerspective')"
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
  import { useEvaluationChartSettings } from '@/composables/useEvaluationChartSettings'

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
  // Get persistent settings from the composable
  const { showMoveLabels, useLinearYAxis, showOnlyLines, blackPerspective } =
    useEvaluationChartSettings()
  const tooltipVisible = ref(false)
  const tooltipStyle = ref({ left: '0px', top: '0px' })
  const tooltipData = ref({
    move: '',
    score: '',
    scoreClass: '',
    time: '',
  })

  /* ---------- Zoom & Pan State ---------- */
  const zoomLevel = ref(1.0)
  const minZoom = 1.0
  const maxZoom = 20.0 // Allow zooming in up to 20x
  const panOffset = ref(0) // The starting move index for the visible area
  const isPanning = ref(false)
  const lastPanX = ref(0)

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

        // Flip evaluation if flipEvaluation setting is enabled
        if (converted !== null && converted !== undefined && blackPerspective.value) {
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
    if (
      !showMoveLabels.value ||
      !chartData.value.length ||
      !chartContainer.value
    )
      return []

    const labels: Array<{
      text: string
      style: { left: string; top: string }
      isCurrentMove: boolean
    }> = []

    const points = chartData.value
    const totalMoves = Math.max(1, points.length - 1)
    const visibleMoves = totalMoves / zoomLevel.value
    const startIndex = Math.floor(panOffset.value)
    const endIndex = Math.ceil(panOffset.value + visibleMoves)
    const areaWidth = chartWidth.value - padding.left - padding.right

    // Determine label density to avoid clutter when zoomed out
    const labelStep = Math.max(1, Math.floor(visibleMoves / (areaWidth / 70))) // Show a label roughly every 70px

    for (let i = startIndex; i <= endIndex; i += 1) {
      if (i >= points.length) break
      const p = points[i]
      if (
        p &&
        p.score !== null &&
        p.score !== undefined &&
        p.moveNumber % labelStep === 0
      ) {
        const x =
          padding.left + ((i - panOffset.value) / visibleMoves) * areaWidth
        if (x >= padding.left && x <= chartWidth.value - padding.right) {
          labels.push({
            text: p.moveText,
            style: { left: `${x}px`, top: `${padding.top + 10}px` },
            isCurrentMove: p.moveIndex === props.currentMoveIndex,
          })
        }
      }
    }
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

    // Determine visible range based on zoom and pan
    const totalMoves = points.length - 1
    const visibleMoves = totalMoves / zoomLevel.value
    // Clamp panOffset to ensure the chart stays within bounds
    panOffset.value = Math.max(
      0,
      Math.min(panOffset.value, totalMoves - visibleMoves)
    )
    const startIndex = Math.floor(panOffset.value)
    const endIndex = Math.ceil(panOffset.value + visibleMoves)

    // Get scores only from the visible (plus a small buffer) points for dynamic Y-axis scaling
    const visiblePoints = points.slice(
      Math.max(0, startIndex - 1),
      Math.min(points.length, endIndex + 2)
    )
    const scores = visiblePoints
      .map(p => p.score)
      .filter(s => s !== null) as number[]

    if (!scores.length) {
      ctx.fillStyle = '#999'
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        t('evaluationChart.noData'),
        area.x + area.width / 2,
        area.y + area.height / 2
      )
      return
    }

    // Apply transformation based on linear Y-axis setting
    let transScores: number[]
    let minT: number
    let maxT: number
    let displayMinT: number
    let displayMaxT: number
    let rangeT: number

    if (useLinearYAxis.value) {
      // Linear scaling: use scores directly
      transScores = scores
      minT = Math.min(...transScores)
      maxT = Math.max(...transScores)
      const pad = Math.max(50, (maxT - minT) * 0.1) // Add padding for linear scale
      displayMinT = minT - pad
      displayMaxT = maxT + pad
      rangeT = displayMaxT - displayMinT || 1
    } else {
      // Non-linear scaling: use asinh transformation
      transScores = scores.map(transform)
      minT = Math.min(...transScores)
      maxT = Math.max(...transScores)
      const pad = Math.max(0.5, (maxT - minT) * 0.1)
      displayMinT = minT - pad
      displayMaxT = maxT + pad
      rangeT = displayMaxT - displayMinT || 1
    }

    /* ------- Draw grid / axes / line / points ------- */
    drawGrid(ctx, area, visibleMoves)
    drawScoreAxis(ctx, area, displayMinT, displayMaxT)
    drawMoveAxis(ctx, area, points, visibleMoves)
    drawScoreLine(ctx, area, points, displayMinT, rangeT, visibleMoves)

    // Only draw data points if showOnlyLines is false
    if (!showOnlyLines.value) {
      drawDataPoints(ctx, area, points, displayMinT, rangeT, visibleMoves)
    }
  }

  /* ---------- Drawing Helpers ---------- */
  const getX = (
    index: number,
    areaWidth: number,
    visibleMoves: number
  ): number => {
    return padding.left + ((index - panOffset.value) / visibleMoves) * areaWidth
  }

  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    area: any,
    visibleMoves: number
  ) => {
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1

    // Horizontal grid lines
    const rows = 5
    for (let i = 0; i <= rows; i++) {
      const y = area.y + (i / rows) * area.height
      ctx.beginPath()
      ctx.moveTo(area.x, y)
      ctx.lineTo(area.x + area.width, y)
      ctx.stroke()
    }

    // Vertical grid lines (dynamic based on zoom)
    const startIndex = Math.floor(panOffset.value)
    const endIndex = Math.ceil(panOffset.value + visibleMoves)
    for (let i = startIndex; i <= endIndex; i++) {
      const x = getX(i, area.width, visibleMoves)
      if (x >= area.x && x <= area.x + area.width) {
        ctx.beginPath()
        ctx.moveTo(x, area.y)
        ctx.lineTo(x, area.y + area.height)
        ctx.stroke()
      }
    }
  }

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
    const rangeT = maxT - minT
    for (let i = 0; i <= rows; i++) {
      const tVal = minT + (i / rows) * rangeT
      const y = area.y + area.height - ((tVal - minT) / rangeT) * area.height
      let dispScore: number
      if (useLinearYAxis.value) {
        // For linear scale, use the value directly
        dispScore = tVal
      } else {
        // For non-linear scale, apply inverse transformation
        dispScore = inverseTransform(tVal)
      }
      
      // Flip evaluation for display if flipEvaluation is enabled
      if (blackPerspective.value) {
        dispScore = -dispScore
      }
      
      ctx.fillText(formatScore(dispScore), area.x - 10, y)
    }
  }

  const drawMoveAxis = (
    ctx: CanvasRenderingContext2D,
    area: any,
    points: any[],
    visibleMoves: number
  ) => {
    ctx.fillStyle = '#666'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const startIndex = Math.floor(panOffset.value)
    const endIndex = Math.ceil(panOffset.value + visibleMoves)
    const step = Math.max(1, Math.floor(visibleMoves / (area.width / 40))) // Show label approx every 40px

    for (let i = startIndex; i <= endIndex; i++) {
      if (i >= 0 && i < points.length && points[i].moveNumber % step === 0) {
        const p = points[i]
        const x = getX(i, area.width, visibleMoves)
        ctx.fillText(p.moveNumber.toString(), x, area.y + area.height + 5)
      }
    }
  }

  // Helper function to get color based on score
  const getScoreColor = (score: number): string => {
    // Apply flip evaluation for color determination
    let displayScore = score
    if (blackPerspective.value) {
      displayScore = -displayScore
    }
    
    if (displayScore > 100) return '#c62828' // Strong red for Red advantage
    if (displayScore < -100) return '#2e7d32' // Strong green for Black advantage
    if (displayScore > 50) return '#ef5350' // Light red for slight Red advantage
    if (displayScore < -50) return '#66bb6a' // Light green for slight Black advantage
    return '#666666' // Neutral gray
  }

  const drawScoreLine = (
    ctx: CanvasRenderingContext2D,
    area: any,
    points: any[],
    minT: number,
    rangeT: number,
    visibleMoves: number
  ) => {
    const startIndex = Math.floor(panOffset.value)
    const endIndex = Math.ceil(panOffset.value + visibleMoves)

    if (showOnlyLines.value) {
      // Draw gradient line when showing only lines
      drawGradientLine(
        ctx,
        area,
        points,
        minT,
        rangeT,
        visibleMoves,
        startIndex,
        endIndex
      )
    } else {
      // Draw solid line when showing data points
      ctx.strokeStyle = '#1976d2'
      ctx.lineWidth = 2
      ctx.beginPath()

      let first = true
      for (let i = Math.max(0, startIndex); i <= endIndex + 1; i++) {
        if (i >= points.length) break
        const p = points[i]
        if (p.score !== null && p.score !== undefined) {
          const x = getX(i, area.width, visibleMoves)
          let t: number
          if (useLinearYAxis.value) {
            // For linear scale, use score directly
            t = p.score
          } else {
            // For non-linear scale, apply transformation
            t = transform(p.score)
          }
          const y = area.y + area.height - ((t - minT) / rangeT) * area.height
          first ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          first = false
        }
      }
      ctx.stroke()
    }
  }

  // MODIFIED: This function now draws a gradient for each line segment
  const drawGradientLine = (
    ctx: CanvasRenderingContext2D,
    area: any,
    points: any[],
    minT: number,
    rangeT: number,
    visibleMoves: number,
    startIndex: number,
    endIndex: number
  ) => {
    // Create gradient line segments with different colors based on evaluation
    let lastX = 0
    let lastY = 0
    let lastScore = 0
    let firstPoint = true

    for (let i = Math.max(0, startIndex); i <= endIndex + 1; i++) {
      if (i >= points.length) break
      const p = points[i]
      if (p.score !== null && p.score !== undefined) {
        const x = getX(i, area.width, visibleMoves)
        let t: number
        if (useLinearYAxis.value) {
          // For linear scale, use score directly
          t = p.score
        } else {
          // For non-linear scale, apply transformation
          t = transform(p.score)
        }
        const y = area.y + area.height - ((t - minT) / rangeT) * area.height

        if (!firstPoint) {
          // Create linear gradient for current line segment
          const gradient = ctx.createLinearGradient(lastX, lastY, x, y)

          const startColor = getScoreColor(lastScore)
          const endColor = getScoreColor(p.score)

          gradient.addColorStop(0, startColor)
          gradient.addColorStop(1, endColor)

          // Use gradient as stroke style
          ctx.strokeStyle = gradient
          ctx.lineWidth = 3 // Thicker for better visibility
          ctx.beginPath()
          ctx.moveTo(lastX, lastY)
          ctx.lineTo(x, y)
          ctx.stroke()
        }

        lastX = x
        lastY = y
        lastScore = p.score
        firstPoint = false
      }
    }
  }

  const drawDataPoints = (
    ctx: CanvasRenderingContext2D,
    area: any,
    points: any[],
    minT: number,
    rangeT: number,
    visibleMoves: number
  ) => {
    const startIndex = Math.floor(panOffset.value)
    const endIndex = Math.ceil(panOffset.value + visibleMoves)

    for (let i = startIndex; i <= endIndex; i++) {
      if (i < 0 || i >= points.length) continue
      const p = points[i]
      if (p.score !== null && p.score !== undefined) {
        const x = getX(i, area.width, visibleMoves)
        if (x < area.x || x > area.x + area.width) continue

        let t: number
        if (useLinearYAxis.value) {
          // For linear scale, use score directly
          t = p.score
        } else {
          // For non-linear scale, apply transformation
          t = transform(p.score)
        }
        const y = area.y + area.height - ((t - minT) / rangeT) * area.height

        const color = getScoreColor(p.score)

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
    }
  }

  /* ---------- Utility Functions ---------- */
  const formatScore = (s: number) => {
    if (s >= 10000) return 'M+'
    if (s <= -10000) return 'M-'
    return Math.round(s).toString()
  }

  const getScoreClass = (s: number): string => {
    // Apply flip evaluation for class determination
    let displayScore = s
    if (blackPerspective.value) {
      displayScore = -displayScore
    }
    
    if (displayScore > 100) return 'score-positive'
    if (displayScore < -100) return 'score-negative'
    if (displayScore > 50) return 'score-slight-positive'
    if (displayScore < -50) return 'score-slight-negative'
    return 'score-neutral'
  }
  const formatTime = (ms: number) =>
    ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`

  /* ---------- Event Handlers ---------- */
  const handleWheel = (e: WheelEvent) => {
    if (!chartCanvas.value) return
    e.preventDefault()

    const areaWidth = chartWidth.value - padding.left - padding.right
    if (areaWidth <= 0) return

    const mouseX = e.offsetX
    const totalMoves = Math.max(1, chartData.value.length - 1)
    const currentVisibleMoves = totalMoves / zoomLevel.value

    const mouseProportion = (mouseX - padding.left) / areaWidth
    const moveIndexAtCursor =
      panOffset.value + mouseProportion * currentVisibleMoves

    const zoomFactor = 1.15
    const oldZoomLevel = zoomLevel.value
    let newZoomLevel =
      e.deltaY < 0 ? oldZoomLevel * zoomFactor : oldZoomLevel / zoomFactor
    zoomLevel.value = Math.max(minZoom, Math.min(maxZoom, newZoomLevel))

    const newVisibleMoves = totalMoves / zoomLevel.value
    panOffset.value = moveIndexAtCursor - mouseProportion * newVisibleMoves

    nextTick(drawChart)
  }

  const handleMouseDown = (e: MouseEvent) => {
    isPanning.value = true
    lastPanX.value = e.clientX
    if (chartContainer.value) chartContainer.value.style.cursor = 'grabbing'
  }

  const handlePanEnd = () => {
    isPanning.value = false
    if (chartContainer.value) {
      chartContainer.value.style.cursor =
        zoomLevel.value > 1.0 ? 'grab' : 'default'
    }
  }

  const handleMouseLeave = () => {
    tooltipVisible.value = false
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!chartCanvas.value || !chartContainer.value) return

    if (isPanning.value) {
      tooltipVisible.value = false
      const totalMoves = Math.max(1, chartData.value.length - 1)
      const visibleMoves = totalMoves / zoomLevel.value
      const areaWidth = chartWidth.value - padding.left - padding.right
      const deltaX = e.clientX - lastPanX.value
      lastPanX.value = e.clientX
      const panDelta = (deltaX / areaWidth) * visibleMoves
      panOffset.value -= panDelta
      nextTick(drawChart)
      return
    }

    // Tooltip logic
    const points = chartData.value
    if (points.length < 2) {
      tooltipVisible.value = false
      return
    }

    const areaWidth = chartCanvas.value.width - padding.left - padding.right
    const totalMoves = points.length - 1
    const visibleMoves = totalMoves / zoomLevel.value
    const mouseProportion = (e.offsetX - padding.left) / areaWidth
    const moveIndex = panOffset.value + mouseProportion * visibleMoves
    const closestIndex = Math.round(moveIndex)

    if (closestIndex < 0 || closestIndex >= points.length) {
      tooltipVisible.value = false
      return
    }

    const closestPoint = points[closestIndex]
    const pointX = getX(closestIndex, areaWidth, visibleMoves)
    const distance = Math.abs(e.offsetX - pointX)
    const threshold = areaWidth / visibleMoves / 2 // Half a move's width

    if (closestPoint && closestPoint.score !== null && distance < threshold) {
      tooltipVisible.value = true
      
      // Apply flip evaluation for tooltip display
      let displayScore = closestPoint.score
      if (blackPerspective.value) {
        displayScore = -displayScore
      }
      
      tooltipData.value = {
        move: closestPoint.moveText,
        score: formatScore(displayScore),
        scoreClass: getScoreClass(displayScore),
        time: closestPoint.time ? formatTime(closestPoint.time) : '',
      }
      tooltipStyle.value = {
        left: `${e.offsetX + 15}px`,
        top: `${e.offsetY + 15}px`,
      }
    } else {
      tooltipVisible.value = false
    }
  }

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
    () => {
      // Reset zoom/pan on history change
      zoomLevel.value = 1.0
      panOffset.value = 0
      nextTick(drawChart)
    },
    { deep: true }
  )
  // Watch for settings changes to redraw chart
  watch([showMoveLabels, useLinearYAxis, showOnlyLines, blackPerspective], () =>
    nextTick(drawChart)
  )

  /* ---------- Lifecycle Hooks ---------- */
  onMounted(() => {
    if (chartCanvas.value && chartContainer.value) {
      chartContext.value = chartCanvas.value.getContext('2d')
      chartCanvas.value.addEventListener('wheel', handleWheel, {
        passive: false,
      })
      chartCanvas.value.addEventListener('mousedown', handleMouseDown)
      chartCanvas.value.addEventListener('mousemove', handleMouseMove)
      chartCanvas.value.addEventListener('mouseleave', handleMouseLeave)
      // Listen on container for mouse up/leave to catch events outside canvas
      chartContainer.value.addEventListener('mouseup', handlePanEnd)
      chartContainer.value.addEventListener('mouseleave', handlePanEnd)
      handleResize()
      window.addEventListener('resize', handleResize)
    }
  })

  onUnmounted(() => {
    if (chartCanvas.value && chartContainer.value) {
      chartCanvas.value.removeEventListener('wheel', handleWheel)
      chartCanvas.value.removeEventListener('mousedown', handleMouseDown)
      chartCanvas.value.removeEventListener('mousemove', handleMouseMove)
      chartCanvas.value.removeEventListener('mouseleave', handleMouseLeave)
      chartContainer.value.removeEventListener('mouseup', handlePanEnd)
      chartContainer.value.removeEventListener('mouseleave', handlePanEnd)
    }
    window.removeEventListener('resize', handleResize)
  })
</script>

<style lang="scss" scoped>
  .evaluation-chart {
    border-radius: 8px;
    padding: 12px; /* Reduced padding to make chart more compact */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 100%;
    box-sizing: border-box;
    background-color: rgb(var(--v-theme-surface));
  }
  .chart-title {
    margin: 0 0 12px 0; /* Reduced margin to make chart more compact */
    font-size: 16px;
    font-weight: 600;
  }
  .chart-container {
    position: relative;
    width: 100%;
    height: 150px; /* Reduced height for desktop to prevent unnecessary scrolling */
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 4px;
    overflow: hidden;
    cursor: default; /* Default cursor */
    user-select: none; /* Prevent text selection while panning */
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
    margin-top: 8px; /* Reduced margin to make chart more compact */
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
