// Template matching based image recognition for Linker (fast, suitable for real-time use)
// Uses PNG templates from public/chess/ to match chess pieces
import { ref } from 'vue'
import { LABELS, type DetectionBox } from './image-recognition/types'

// Configuration constants for template matching
const MATCH_THRESHOLD = 0.5 // Minimum NCC score to consider a valid detection

// Board color detection thresholds (typical xiangqi board colors - brown/tan/beige range)
const BOARD_COLOR = {
  // Dark board color range (brown/tan)
  DARK_R_MIN: 150,
  DARK_R_MAX: 255,
  DARK_G_MIN: 100,
  DARK_G_MAX: 220,
  DARK_B_MIN: 50,
  DARK_B_MAX: 180,
  // Light board color range (lighter boards)
  LIGHT_R_MIN: 180,
  LIGHT_G_MIN: 150,
  LIGHT_B_MIN: 100,
}

// FEN character to piece template filename mapping
const FEN_TO_TEMPLATE: Record<string, string> = {
  K: 'K', // 红帅
  A: 'A', // 红仕
  B: 'B', // 红相
  N: 'N', // 红马
  R: 'R', // 红车
  C: 'C', // 红炮
  P: 'P', // 红兵
  k: 'k', // 黑将
  a: 'a', // 黑士
  b: 'b', // 黑象
  n: 'n', // 黑马
  r: 'r', // 黑车
  c: 'c', // 黑炮
  p: 'p', // 黑卒
  X: 'X', // 红方暗子
  x: 'x', // 黑方暗子
}

// FEN character to LABELS index mapping (for compatibility with existing code)
const FEN_TO_LABEL_INDEX: Record<string, number> = {
  K: 31, // r_general
  A: 27, // r_advisor
  B: 30, // r_elephant
  N: 32, // r_horse
  R: 29, // r_chariot
  C: 28, // r_cannon
  P: 33, // r_soldier
  k: 9, // b_general
  a: 5, // b_advisor
  b: 8, // b_elephant
  n: 10, // b_horse
  r: 7, // b_chariot
  c: 6, // b_cannon
  p: 11, // b_soldier
  X: 24, // dark_r_general (use any dark_r_ for red dark pieces)
  x: 12, // dark (use for black dark pieces)
}

// Board label index
const BOARD_LABEL_INDEX = 4

interface TemplateImage {
  image: HTMLImageElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  imageData: ImageData
  fen: string
}

export const useTemplateMatching = () => {
  const templates = ref<Map<string, TemplateImage>>(new Map())
  const isLoading = ref(false)
  const isLoaded = ref(false)
  const detectedBoxes = ref<DetectionBox[]>([])

  // Load all templates
  const loadTemplates = async (): Promise<void> => {
    if (isLoaded.value) return
    if (isLoading.value) return

    isLoading.value = true
    try {
      const base = import.meta.env?.BASE_URL || '/'
      const loadPromises: Promise<void>[] = []

      for (const [fen, filename] of Object.entries(FEN_TO_TEMPLATE)) {
        const promise = new Promise<void>(resolve => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0)
            const imageData = ctx.getImageData(0, 0, img.width, img.height)

            templates.value.set(fen, {
              image: img,
              canvas,
              ctx,
              imageData,
              fen,
            })
            resolve()
          }
          img.onerror = () => {
            console.warn(`Failed to load template: ${filename}.png`)
            resolve() // Don't fail the whole load
          }
          img.src = `${base}chess/${filename}.png`
        })
        loadPromises.push(promise)
      }

      await Promise.all(loadPromises)
      isLoaded.value = true
    } finally {
      isLoading.value = false
    }
  }

  // Initialize (alias for loadTemplates)
  const initializeModel = async (): Promise<void> => {
    return loadTemplates()
  }

  // Compute normalized cross correlation between template and region
  const computeNCC = (
    sourceData: Uint8ClampedArray,
    sourceWidth: number,
    sx: number,
    sy: number,
    templateData: Uint8ClampedArray,
    templateWidth: number,
    templateHeight: number
  ): number => {
    let sumST = 0
    let sumSS = 0
    let sumTT = 0
    let sumS = 0
    let sumT = 0
    let count = 0

    for (let ty = 0; ty < templateHeight; ty++) {
      for (let tx = 0; tx < templateWidth; tx++) {
        const tIdx = (ty * templateWidth + tx) * 4
        const sIdx = ((sy + ty) * sourceWidth + (sx + tx)) * 4

        // Use grayscale values
        const tGray =
          0.299 * templateData[tIdx] +
          0.587 * templateData[tIdx + 1] +
          0.114 * templateData[tIdx + 2]
        const sGray =
          0.299 * sourceData[sIdx] +
          0.587 * sourceData[sIdx + 1] +
          0.114 * sourceData[sIdx + 2]

        sumST += sGray * tGray
        sumSS += sGray * sGray
        sumTT += tGray * tGray
        sumS += sGray
        sumT += tGray
        count++
      }
    }

    const meanS = sumS / count
    const meanT = sumT / count
    const numerator = sumST - count * meanS * meanT
    const denominator = Math.sqrt(
      (sumSS - count * meanS * meanS) * (sumTT - count * meanT * meanT)
    )

    if (denominator === 0) return 0
    return numerator / denominator
  }

  // Detect board boundaries from the image
  const detectBoard = (
    sourceCanvas: HTMLCanvasElement,
    sourceCtx: CanvasRenderingContext2D
  ): { x: number; y: number; width: number; height: number } | null => {
    const width = sourceCanvas.width
    const height = sourceCanvas.height
    const imageData = sourceCtx.getImageData(0, 0, width, height)
    const data = imageData.data

    // Simple edge detection to find board boundaries
    // Look for rectangular region with consistent background
    let minX = width,
      maxX = 0,
      minY = height,
      maxY = 0

    // Scan for board region by finding areas with board-like colors
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]

        // Check for typical xiangqi board colors using configured thresholds
        const isDarkBoardColor =
          r > BOARD_COLOR.DARK_R_MIN &&
          r < BOARD_COLOR.DARK_R_MAX &&
          g > BOARD_COLOR.DARK_G_MIN &&
          g < BOARD_COLOR.DARK_G_MAX &&
          b > BOARD_COLOR.DARK_B_MIN &&
          b < BOARD_COLOR.DARK_B_MAX
        const isLightBoardColor =
          r > BOARD_COLOR.LIGHT_R_MIN &&
          g > BOARD_COLOR.LIGHT_G_MIN &&
          b > BOARD_COLOR.LIGHT_B_MIN
        const isBoardColor = isDarkBoardColor || isLightBoardColor

        if (isBoardColor) {
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
    }

    if (maxX <= minX || maxY <= minY) {
      // Fallback: use entire image
      return { x: 0, y: 0, width, height }
    }

    // Add some margin
    const margin = 5
    return {
      x: Math.max(0, minX - margin),
      y: Math.max(0, minY - margin),
      width: Math.min(width - minX + margin, maxX - minX + 2 * margin),
      height: Math.min(height - minY + margin, maxY - minY + 2 * margin),
    }
  }

  // Process image using template matching
  const processImageDirect = async (img: HTMLImageElement): Promise<void> => {
    if (!isLoaded.value) {
      await loadTemplates()
    }

    const boxes: DetectionBox[] = []

    // Create canvas from source image
    const sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = img.naturalWidth || img.width
    sourceCanvas.height = img.naturalHeight || img.height
    const sourceCtx = sourceCanvas.getContext('2d')!
    sourceCtx.drawImage(img, 0, 0)

    const imgWidth = sourceCanvas.width
    const imgHeight = sourceCanvas.height
    const sourceImageData = sourceCtx.getImageData(0, 0, imgWidth, imgHeight)

    // Detect board region
    const boardBounds = detectBoard(sourceCanvas, sourceCtx)
    if (boardBounds) {
      // Add board detection box
      boxes.push({
        box: [
          boardBounds.x,
          boardBounds.y,
          boardBounds.width,
          boardBounds.height,
        ],
        score: 0.95,
        labelIndex: BOARD_LABEL_INDEX,
      })
    }

    // If no board detected, use full image
    const boardX = boardBounds?.x ?? 0
    const boardY = boardBounds?.y ?? 0
    const boardWidth = boardBounds?.width ?? imgWidth
    const boardHeight = boardBounds?.height ?? imgHeight

    // Calculate cell size based on 9x10 grid
    const cellWidth = boardWidth / 9
    const cellHeight = boardHeight / 10

    // Get one template to determine typical piece size
    const firstTemplate = templates.value.values().next().value as
      | TemplateImage
      | undefined
    if (!firstTemplate) {
      detectedBoxes.value = boxes
      return
    }

    // For each grid position, find the best matching piece
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        // Calculate search region center
        const centerX = boardX + (col + 0.5) * cellWidth
        const centerY = boardY + (row + 0.5) * cellHeight

        // Search region around the grid intersection
        const searchSize = Math.min(cellWidth, cellHeight) * 0.8
        const searchX = Math.max(0, centerX - searchSize / 2)
        const searchY = Math.max(0, centerY - searchSize / 2)

        let bestScore = -1
        let bestFen = ''
        let bestBox: [number, number, number, number] = [0, 0, 0, 0]

        // Try each template
        for (const [fen, template] of templates.value) {
          // Scale template to match cell size
          const targetSize = Math.min(cellWidth, cellHeight) * 0.85
          const scale =
            targetSize / Math.max(template.image.width, template.image.height)
          const scaledWidth = Math.round(template.image.width * scale)
          const scaledHeight = Math.round(template.image.height * scale)

          if (scaledWidth <= 0 || scaledHeight <= 0) continue

          // Create scaled template
          const scaledCanvas = document.createElement('canvas')
          scaledCanvas.width = scaledWidth
          scaledCanvas.height = scaledHeight
          const scaledCtx = scaledCanvas.getContext('2d')!
          scaledCtx.drawImage(template.image, 0, 0, scaledWidth, scaledHeight)
          const scaledImageData = scaledCtx.getImageData(
            0,
            0,
            scaledWidth,
            scaledHeight
          )

          // Calculate match position
          const matchX = Math.round(
            Math.max(
              0,
              Math.min(imgWidth - scaledWidth, centerX - scaledWidth / 2)
            )
          )
          const matchY = Math.round(
            Math.max(
              0,
              Math.min(imgHeight - scaledHeight, centerY - scaledHeight / 2)
            )
          )

          // Compute NCC at this position
          const score = computeNCC(
            sourceImageData.data,
            imgWidth,
            matchX,
            matchY,
            scaledImageData.data,
            scaledWidth,
            scaledHeight
          )

          if (score > bestScore) {
            bestScore = score
            bestFen = fen
            bestBox = [matchX, matchY, scaledWidth, scaledHeight]
          }
        }

        // If we found a good match, add it
        if (bestScore > MATCH_THRESHOLD && bestFen) {
          const labelIndex = FEN_TO_LABEL_INDEX[bestFen]
          if (labelIndex !== undefined) {
            boxes.push({
              box: bestBox,
              score: bestScore,
              labelIndex,
            })
          }
        }
      }
    }

    detectedBoxes.value = boxes
  }

  // Update board grid from detected boxes (compatible with ONNX version)
  const updateBoardGrid = (
    boxes: DetectionBox[]
  ): (DetectionBox | null)[][] => {
    const boardBox = boxes
      .filter(b => LABELS[b.labelIndex]?.name === 'Board')
      .sort((a, b) => b.score - a.score)[0]

    if (!boardBox) {
      return Array(10)
        .fill(null)
        .map(() => Array(9).fill(null))
    }

    const doBoxesOverlap = (
      boxA: [number, number, number, number],
      boxB: [number, number, number, number]
    ): boolean => {
      const [x1A, y1A, wA, hA] = boxA
      const [x1B, y1B, wB, hB] = boxB
      const x2A = x1A + wA,
        y2A = y1A + hA
      const x2B = x1B + wB,
        y2B = y1B + hB

      return !(x2A < x1B || x1A > x2B || y2A < y1B || y1A > y2B)
    }

    const piecesOnBoard = boxes.filter(p => {
      if (LABELS[p.labelIndex]?.name === 'Board') return false
      return doBoxesOverlap(p.box, boardBox.box)
    })

    const [bx, by, bw, bh] = boardBox.box
    const p_tl = { x: bx, y: by }
    const p_tr = { x: bx + bw, y: by }
    const p_bl = { x: bx, y: by + bh }
    const p_br = { x: bx + bw, y: by + bh }

    const grid: Array<Array<DetectionBox | null>> = Array(10)
      .fill(null)
      .map(() => Array(9).fill(null))

    for (const piece of piecesOnBoard) {
      const [px, py, pw, ph] = piece.box
      const pieceCenter = { x: px + pw / 2, y: py + ph / 2 }
      let bestPos = { i: -1, j: -1, dist: Infinity }

      for (let j = 0; j < 10; j++) {
        for (let i = 0; i < 9; i++) {
          const u = i / 8
          const v = j / 9

          const topX = (1 - u) * p_tl.x + u * p_tr.x
          const topY = (1 - u) * p_tl.y + u * p_tr.y
          const botX = (1 - u) * p_bl.x + u * p_br.x
          const botY = (1 - u) * p_bl.y + u * p_br.y
          const gridX = (1 - v) * topX + v * botX
          const gridY = (1 - v) * topY + v * botY

          const dist = Math.hypot(pieceCenter.x - gridX, pieceCenter.y - gridY)
          if (dist < bestPos.dist) bestPos = { i, j, dist }
        }
      }

      const { i, j } = bestPos
      if (i !== -1 && (!grid[j][i] || piece.score > grid[j][i]!.score)) {
        grid[j][i] = piece
      }
    }

    return grid
  }

  return {
    templates,
    isLoading,
    isLoaded,
    detectedBoxes,
    loadTemplates,
    initializeModel,
    processImageDirect,
    updateBoardGrid,
  }
}
