import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useImageRecognition, LABELS, type DetectionBox } from './image-recognition'

// Linker operation modes
export type LinkerMode = 'auto' | 'watch'

// Linker state
export type LinkerState = 'idle' | 'selecting' | 'connecting' | 'error'

// Board cell type (for 10x9 chess board)
export type BoardGrid = (string | null)[][]

// Linker settings
export interface LinkerSettings {
  mouseClickDelay: number // ms between mouse press and release
  mouseMoveDelay: number // ms between two clicks
  scanInterval: number // ms between scans
  animationConfirm: boolean // confirm animation before acting
}

// Default settings
const DEFAULT_SETTINGS: LinkerSettings = {
  mouseClickDelay: 50,
  mouseMoveDelay: 200,
  scanInterval: 500,
  animationConfirm: true,
}

// Chess piece FEN character mapping
const PIECE_TO_FEN: { [key: string]: string } = {
  r_general: 'K',
  r_advisor: 'A',
  r_elephant: 'B',
  r_horse: 'N',
  r_chariot: 'R',
  r_cannon: 'C',
  r_soldier: 'P',
  b_general: 'k',
  b_advisor: 'a',
  b_elephant: 'b',
  b_horse: 'n',
  b_chariot: 'r',
  b_cannon: 'c',
  b_soldier: 'p',
  dark: 'x', // Dark piece placeholder
  dark_r_general: 'X',
  dark_r_advisor: 'X',
  dark_r_elephant: 'X',
  dark_r_horse: 'X',
  dark_r_chariot: 'X',
  dark_r_cannon: 'X',
  dark_r_soldier: 'X',
  dark_b_general: 'x',
  dark_b_advisor: 'x',
  dark_b_elephant: 'x',
  dark_b_horse: 'x',
  dark_b_chariot: 'x',
  dark_b_cannon: 'x',
  dark_b_soldier: 'x',
}

export function useLinker() {
  const { t } = useI18n()
  const imageRecognition = useImageRecognition()

  // State
  const state = ref<LinkerState>('idle')
  const mode = ref<LinkerMode>('auto')
  const settings = ref<LinkerSettings>({ ...DEFAULT_SETTINGS })
  const errorMessage = ref<string>('')
  const isScanning = ref(false)

  // Board state from image recognition
  const recognizedBoard = ref<BoardGrid | null>(null)
  const boardPosition = ref<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  // Scanning control
  let scanTimer: ReturnType<typeof setTimeout> | null = null

  // Callbacks for integration with game state
  let onMoveDetected: ((from: string, to: string) => void) | null = null
  let onBoardInitialized: ((fen: string, isReversed: boolean) => void) | null =
    null
  let getEngineBoard: (() => BoardGrid | null) | null = null
  let isEngineThinking: (() => boolean) | null = null
  let executeMove: ((from: string, to: string) => void) | null = null

  // Computed
  const isActive = computed(() => state.value === 'connecting')
  const statusText = computed(() => {
    switch (state.value) {
      case 'idle':
        return t('linker.status.idle')
      case 'selecting':
        return t('linker.status.selecting')
      case 'connecting':
        return isScanning.value
          ? t('linker.status.scanning')
          : t('linker.status.connected')
      case 'error':
        return errorMessage.value || t('linker.status.error')
      default:
        return ''
    }
  })

  // Initialize image recognition model
  const initializeModel = async (): Promise<boolean> => {
    try {
      await imageRecognition.initializeModel()
      return true
    } catch (error) {
      console.error('Failed to initialize image recognition model:', error)
      errorMessage.value = t('linker.error.modelInitFailed')
      state.value = 'error'
      return false
    }
  }

  // Convert label index to piece name
  const labelIndexToPieceName = (labelIndex: number): string | null => {
    const label = LABELS[labelIndex]
    if (!label || label.name === 'Board') return null
    // Handle numbered labels (2-5) which might be for selection markers
    if (['2', '3', '4', '5'].includes(label.name)) return null
    return label.name
  }

  // Convert piece name to FEN character
  const pieceNameToFen = (pieceName: string): string | null => {
    return PIECE_TO_FEN[pieceName] || null
  }

  // Process detection boxes into a board grid
  const processDetectionsToBoard = (
    boxes: DetectionBox[]
  ): { board: BoardGrid; isReversed: boolean } | null => {
    // Find board bounding box
    const boardBox = boxes
      .filter(b => LABELS[b.labelIndex]?.name === 'Board')
      .sort((a, b) => b.score - a.score)[0]

    if (!boardBox) {
      console.warn('No board detected in image')
      return null
    }

    const [bx, by, bw, bh] = boardBox.box
    boardPosition.value = { x: bx, y: by, width: bw, height: bh }

    // Initialize empty board (10 rows x 9 columns)
    const board: BoardGrid = Array(10)
      .fill(null)
      .map(() => Array(9).fill(null))

    // Process pieces
    const pieces = boxes.filter(b => {
      const label = LABELS[b.labelIndex]
      if (!label || label.name === 'Board') return false
      if (['2', '3', '4', '5'].includes(label.name)) return false
      return true
    })

    // Place pieces on the board
    for (const piece of pieces) {
      const [px, py, pw, ph] = piece.box
      const pieceCenterX = px + pw / 2
      const pieceCenterY = py + ph / 2

      // Check if piece is within board bounds
      if (
        pieceCenterX < bx ||
        pieceCenterX > bx + bw ||
        pieceCenterY < by ||
        pieceCenterY > by + bh
      ) {
        continue
      }

      // Calculate grid position
      const cellWidth = bw / 8
      const cellHeight = bh / 9
      const col = Math.round((pieceCenterX - bx) / cellWidth)
      const row = Math.round((pieceCenterY - by) / cellHeight)

      if (row >= 0 && row < 10 && col >= 0 && col < 9) {
        const pieceName = labelIndexToPieceName(piece.labelIndex)
        if (pieceName) {
          const fenChar = pieceNameToFen(pieceName)
          if (fenChar && (!board[row][col] || piece.score > 0.5)) {
            board[row][col] = fenChar
          }
        }
      }
    }

    // Detect if board is reversed (red on top)
    let isReversed = false
    for (let row = 0; row < 3; row++) {
      for (let col = 3; col < 6; col++) {
        if (board[row][col] === 'K') {
          isReversed = true
          break
        }
      }
    }
    for (let row = 7; row < 10; row++) {
      for (let col = 3; col < 6; col++) {
        if (board[row][col] === 'k') {
          isReversed = true
          break
        }
      }
    }

    // If reversed, flip the board
    if (isReversed) {
      const flippedBoard: BoardGrid = Array(10)
        .fill(null)
        .map(() => Array(9).fill(null))
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          flippedBoard[r][c] = board[9 - r][8 - c]
        }
      }
      return { board: flippedBoard, isReversed }
    }

    return { board, isReversed }
  }

  // Convert board grid to FEN string
  const boardToFen = (board: BoardGrid): string => {
    const rows: string[] = []
    for (let r = 0; r < 10; r++) {
      let row = ''
      let emptyCount = 0
      for (let c = 0; c < 9; c++) {
        const piece = board[r][c]
        if (piece) {
          if (emptyCount > 0) {
            row += emptyCount.toString()
            emptyCount = 0
          }
          row += piece
        } else {
          emptyCount++
        }
      }
      if (emptyCount > 0) {
        row += emptyCount.toString()
      }
      rows.push(row)
    }
    return rows.join('/')
  }

  // Compare two boards and find the move
  const compareBoardsAndFindMove = (
    linkBoard: BoardGrid,
    engineBoard: BoardGrid,
    _isReversed: boolean,
    _isWatchMode: boolean
  ): { flag: number; from?: string; to?: string } | null => {
    // Count differences
    const differences: {
      row: number
      col: number
      linkPiece: string | null
      enginePiece: string | null
    }[] = []

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        if (linkBoard[r][c] !== engineBoard[r][c]) {
          differences.push({
            row: r,
            col: c,
            linkPiece: linkBoard[r][c],
            enginePiece: engineBoard[r][c],
          })
        }
      }
    }

    // If more than 2 significant differences, might be a new game
    if (differences.length > 4) {
      return { flag: 3 } // New game detected
    }

    // Try to find a valid move
    for (let i = 0; i < differences.length; i++) {
      for (let j = i + 1; j < differences.length; j++) {
        const d1 = differences[i]
        const d2 = differences[j]

        // Check if this could be a move from d1 to d2
        if (
          d1.enginePiece &&
          !d1.linkPiece &&
          d2.linkPiece === d1.enginePiece &&
          !d2.enginePiece
        ) {
          // Piece moved from d1 to d2 (opponent's move)
          const from = `${String.fromCharCode(97 + d1.col)}${9 - d1.row}`
          const to = `${String.fromCharCode(97 + d2.col)}${9 - d2.row}`
          return { flag: 1, from, to }
        }

        // Check if this could be a move from d2 to d1
        if (
          d2.enginePiece &&
          !d2.linkPiece &&
          d1.linkPiece === d2.enginePiece &&
          !d1.enginePiece
        ) {
          // Piece moved from d2 to d1 (opponent's move)
          const from = `${String.fromCharCode(97 + d2.col)}${9 - d2.row}`
          const to = `${String.fromCharCode(97 + d1.col)}${9 - d1.row}`
          return { flag: 1, from, to }
        }

        // Check for capture moves
        if (
          d1.enginePiece &&
          !d1.linkPiece &&
          d2.linkPiece &&
          d2.enginePiece &&
          d2.linkPiece === d1.enginePiece
        ) {
          // Capture: piece from d1 captured piece at d2
          const from = `${String.fromCharCode(97 + d1.col)}${9 - d1.row}`
          const to = `${String.fromCharCode(97 + d2.col)}${9 - d2.row}`
          return { flag: 1, from, to }
        }

        if (
          d2.enginePiece &&
          !d2.linkPiece &&
          d1.linkPiece &&
          d1.enginePiece &&
          d1.linkPiece === d2.enginePiece
        ) {
          // Capture: piece from d2 captured piece at d1
          const from = `${String.fromCharCode(97 + d2.col)}${9 - d2.row}`
          const to = `${String.fromCharCode(97 + d1.col)}${9 - d1.row}`
          return { flag: 1, from, to }
        }
      }
    }

    // If we couldn't find a move but have differences, might need to wait
    if (differences.length > 0 && differences.length <= 4) {
      return { flag: 4 } // Possible move in progress
    }

    return null
  }

  // Process a screenshot and recognize the board
  const processScreenshot = async (
    imageData: ImageData | Blob | HTMLCanvasElement
  ): Promise<{
    board: BoardGrid
    isReversed: boolean
    fen: string
  } | null> => {
    try {
      // Convert to image element
      let img: HTMLImageElement

      if (imageData instanceof ImageData) {
        const canvas = document.createElement('canvas')
        canvas.width = imageData.width
        canvas.height = imageData.height
        const ctx = canvas.getContext('2d')!
        ctx.putImageData(imageData, 0, 0)
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to create blob'))), 'image/png')
        })
        imageData = blob
      }

      if (imageData instanceof Blob) {
        img = new Image()
        const url = URL.createObjectURL(imageData)
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            URL.revokeObjectURL(url)
            resolve()
          }
          img.onerror = reject
          img.src = url
        })
      } else if (imageData instanceof HTMLCanvasElement) {
        img = new Image()
        img.src = imageData.toDataURL()
        await new Promise<void>(resolve => {
          img.onload = () => resolve()
        })
      } else {
        throw new Error('Unsupported image data type')
      }

      // Create a File object for the image recognition
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to create blob'))), 'image/png')
      })
      const file = new File([blob], 'screenshot.png', { type: 'image/png' })

      // Process image
      await imageRecognition.processImage(file)

      // Get detected boxes
      const boxes = imageRecognition.detectedBoxes.value

      // Process detections to board
      const result = processDetectionsToBoard(boxes)
      if (!result) return null

      const { board, isReversed } = result
      const fen = boardToFen(board)

      recognizedBoard.value = board

      return { board, isReversed, fen }
    } catch (error) {
      console.error('Failed to process screenshot:', error)
      return null
    }
  }

  // Start the linker
  const start = async () => {
    if (state.value === 'connecting') {
      return
    }

    // Initialize model if not already done
    const modelReady = await initializeModel()
    if (!modelReady) {
      return
    }

    state.value = 'selecting'
    errorMessage.value = ''
  }

  // Stop the linker
  const stop = () => {
    state.value = 'idle'
    isScanning.value = false
    recognizedBoard.value = null
    boardPosition.value = null

    if (scanTimer) {
      clearTimeout(scanTimer)
      scanTimer = null
    }
  }

  // Start scanning (called after board is selected/detected)
  const startScanning = () => {
    if (state.value !== 'selecting') {
      return
    }

    state.value = 'connecting'
    isScanning.value = true

    // The actual scanning loop would be implemented here
    // In a web environment, this would need platform-specific screen capture
    // For now, this provides the interface for manual image input
  }

  // Process a single scan frame
  const processScanFrame = async (
    imageData: ImageData | Blob | HTMLCanvasElement
  ): Promise<void> => {
    if (state.value !== 'connecting' || !isScanning.value) {
      return
    }

    const result = await processScreenshot(imageData)
    if (!result) {
      return
    }

    const { board, isReversed, fen } = result

    // If this is the first scan, initialize the board
    if (!recognizedBoard.value) {
      recognizedBoard.value = board
      if (onBoardInitialized) {
        onBoardInitialized(fen + ' w - - 0 1', isReversed)
      }
      return
    }

    // Compare with engine board
    const engineBoard = getEngineBoard?.()
    if (!engineBoard) {
      return
    }

    // Skip if engine is thinking
    if (isEngineThinking?.()) {
      return
    }

    // Compare boards
    const moveResult = compareBoardsAndFindMove(
      board,
      engineBoard,
      isReversed,
      mode.value === 'watch'
    )

    if (!moveResult) {
      return
    }

    switch (moveResult.flag) {
      case 1: // Opponent moved, sync to engine
        if (onMoveDetected && moveResult.from && moveResult.to) {
          onMoveDetected(moveResult.from, moveResult.to)
        }
        break

      case 2: // Engine moved, need to click on target
        if (
          mode.value === 'auto' &&
          executeMove &&
          moveResult.from &&
          moveResult.to
        ) {
          executeMove(moveResult.from, moveResult.to)
        }
        break

      case 3: // New game detected
        recognizedBoard.value = board
        if (onBoardInitialized) {
          onBoardInitialized(fen + ' w - - 0 1', isReversed)
        }
        break

      case 4: // Possible move in progress, wait
        break
    }

    // Update recognized board
    recognizedBoard.value = board
  }

  // Set callbacks
  const setCallbacks = (callbacks: {
    onMoveDetected?: (from: string, to: string) => void
    onBoardInitialized?: (fen: string, isReversed: boolean) => void
    getEngineBoard?: () => BoardGrid | null
    isEngineThinking?: () => boolean
    executeMove?: (from: string, to: string) => void
  }) => {
    if (callbacks.onMoveDetected)
      onMoveDetected = callbacks.onMoveDetected
    if (callbacks.onBoardInitialized)
      onBoardInitialized = callbacks.onBoardInitialized
    if (callbacks.getEngineBoard)
      getEngineBoard = callbacks.getEngineBoard
    if (callbacks.isEngineThinking)
      isEngineThinking = callbacks.isEngineThinking
    if (callbacks.executeMove)
      executeMove = callbacks.executeMove
  }

  // Update settings
  const updateSettings = (newSettings: Partial<LinkerSettings>) => {
    settings.value = { ...settings.value, ...newSettings }
  }

  // Reset settings to defaults
  const resetSettings = () => {
    settings.value = { ...DEFAULT_SETTINGS }
  }

  return {
    // State
    state,
    mode,
    settings,
    errorMessage,
    isScanning,
    recognizedBoard,
    boardPosition,

    // Computed
    isActive,
    statusText,

    // Actions
    start,
    stop,
    startScanning,
    processScreenshot,
    processScanFrame,
    setCallbacks,
    updateSettings,
    resetSettings,
    initializeModel,

    // Utilities
    boardToFen,
    processDetectionsToBoard,
  }
}
