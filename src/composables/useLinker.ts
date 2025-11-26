import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import { useImageRecognition, LABELS, type DetectionBox } from './image-recognition'

// Linker operation modes
export type LinkerMode = 'auto' | 'watch'

// Linker state
export type LinkerState = 'idle' | 'selecting' | 'connecting' | 'paused' | 'error'

// Board cell type (for 10x9 chess board)
export type BoardGrid = (string | null)[][]

// Window info from Tauri
export interface WindowInfo {
  id: number
  name: string
  x: number
  y: number
  width: number
  height: number
  is_minimized: boolean
}

// Capture result from Tauri
export interface CaptureResult {
  image_base64: string
  width: number
  height: number
}

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
  dark: 'x',
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

// Helper function: Convert board coordinates to UCI notation
const coordsToNotation = (row: number, col: number): string => {
  return `${String.fromCharCode(97 + col)}${9 - row}`
}

// Helper: Convert base64 to image
const base64ToImage = (base64: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = `data:image/png;base64,${base64}`
  })
}

export function useLinker() {
  const { t } = useI18n()

  // Lazy initialization of image recognition
  let imageRecognition: ReturnType<typeof useImageRecognition> | null = null
  const getImageRecognition = () => {
    if (!imageRecognition) {
      imageRecognition = useImageRecognition()
    }
    return imageRecognition
  }

  // State
  const state = ref<LinkerState>('idle')
  const mode = ref<LinkerMode>('auto')
  const settings = ref<LinkerSettings>({ ...DEFAULT_SETTINGS })
  const errorMessage = ref<string>('')
  const isScanning = ref(false)

  // Window selection
  const availableWindows = ref<WindowInfo[]>([])
  const selectedWindowId = ref<number | null>(null)
  const selectedWindow = ref<WindowInfo | null>(null)

  // Board state from image recognition
  const recognizedBoard = ref<BoardGrid | null>(null)
  const previousBoard = ref<BoardGrid | null>(null)
  const boardBounds = ref<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  // Board position in screen coordinates (for clicking)
  const screenBoardBounds = ref<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  // Scanning control
  let scanTimer: ReturnType<typeof setInterval> | null = null

  // Game state integration callbacks
  let onMoveDetected: ((from: string, to: string) => void) | null = null
  let onBoardInitialized: ((fen: string, isReversed: boolean) => void) | null = null
  let getEngineBoard: (() => BoardGrid | null) | null = null
  let getEngineBestMove: (() => string | null) | null = null
  let isEngineThinking: (() => boolean) | null = null
  let playMove: ((from: string, to: string) => void) | null = null

  // Board orientation
  const isReversed = ref(false)

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
      case 'paused':
        return t('linker.status.paused')
      case 'error':
        return errorMessage.value || t('linker.status.error')
      default:
        return ''
    }
  })

  // List available windows
  const refreshWindowList = async (): Promise<void> => {
    try {
      const windows = await invoke<WindowInfo[]>('list_windows')
      availableWindows.value = windows
    } catch (error) {
      console.error('Failed to list windows:', error)
      errorMessage.value = t('linker.error.listWindowsFailed')
    }
  }

  // Select a window for linking
  const selectWindow = async (windowId: number): Promise<void> => {
    try {
      const windowInfo = await invoke<WindowInfo>('get_window_info', { windowId })
      selectedWindowId.value = windowId
      selectedWindow.value = windowInfo
    } catch (error) {
      console.error('Failed to get window info:', error)
      errorMessage.value = t('linker.error.windowNotFound')
    }
  }

  // Initialize image recognition model
  const initializeModel = async (): Promise<boolean> => {
    try {
      await getImageRecognition().initializeModel()
      return true
    } catch (error) {
      console.error('Failed to initialize image recognition model:', error)
      errorMessage.value = t('linker.error.modelInitFailed')
      state.value = 'error'
      return false
    }
  }

  // Label index to piece name
  const labelIndexToPieceName = (labelIndex: number): string | null => {
    const label = LABELS[labelIndex]
    if (!label || label.name === 'Board') return null
    if (['2', '3', '4', '5'].includes(label.name)) return null
    return label.name
  }

  // Piece name to FEN character
  const pieceNameToFen = (pieceName: string): string | null => {
    return PIECE_TO_FEN[pieceName] || null
  }

  // Process detection boxes into a board grid
  const processDetectionsToBoard = (
    boxes: DetectionBox[],
    imageWidth: number,
    imageHeight: number
  ): { board: BoardGrid; boardBox: { x: number; y: number; width: number; height: number }; isReversed: boolean } | null => {
    // Find board bounding box
    const boardBox = boxes
      .filter(b => LABELS[b.labelIndex]?.name === 'Board')
      .sort((a, b) => b.score - a.score)[0]

    if (!boardBox) {
      console.warn('No board detected in image')
      return null
    }

    const [bx, by, bw, bh] = boardBox.box

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

      // Calculate grid position (9 columns means 8 intervals, 10 rows means 9 intervals)
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
    let reversed = false
    for (let row = 0; row < 3; row++) {
      for (let col = 3; col < 6; col++) {
        if (board[row][col] === 'K') {
          reversed = true
          break
        }
      }
    }
    for (let row = 7; row < 10; row++) {
      for (let col = 3; col < 6; col++) {
        if (board[row][col] === 'k') {
          reversed = true
          break
        }
      }
    }

    // If reversed, flip the board
    if (reversed) {
      const flippedBoard: BoardGrid = Array(10)
        .fill(null)
        .map(() => Array(9).fill(null))
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          flippedBoard[r][c] = board[9 - r][8 - c]
        }
      }
      return { board: flippedBoard, boardBox: { x: bx, y: by, width: bw, height: bh }, isReversed: reversed }
    }

    return { board, boardBox: { x: bx, y: by, width: bw, height: bh }, isReversed: reversed }
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

  // Compare boards and find the move that was made
  const compareBoardsAndFindMove = (
    oldBoard: BoardGrid,
    newBoard: BoardGrid
  ): { from: string; to: string } | null => {
    const differences: { row: number; col: number; old: string | null; new: string | null }[] = []

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        if (oldBoard[r][c] !== newBoard[r][c]) {
          differences.push({
            row: r,
            col: c,
            old: oldBoard[r][c],
            new: newBoard[r][c],
          })
        }
      }
    }

    // A move typically creates 2 differences: source becomes empty, destination gets the piece
    if (differences.length === 2) {
      const [d1, d2] = differences
      // Source: had piece, now empty
      // Destination: was empty or had different piece, now has the moved piece
      if (d1.old && !d1.new && d2.new) {
        return {
          from: coordsToNotation(d1.row, d1.col),
          to: coordsToNotation(d2.row, d2.col),
        }
      }
      if (d2.old && !d2.new && d1.new) {
        return {
          from: coordsToNotation(d2.row, d2.col),
          to: coordsToNotation(d1.row, d1.col),
        }
      }
      // Capture: source becomes empty, destination changes piece
      if (d1.old && !d1.new && d2.old && d2.new && d2.new === d1.old) {
        return {
          from: coordsToNotation(d1.row, d1.col),
          to: coordsToNotation(d2.row, d2.col),
        }
      }
      if (d2.old && !d2.new && d1.old && d1.new && d1.new === d2.old) {
        return {
          from: coordsToNotation(d2.row, d2.col),
          to: coordsToNotation(d1.row, d1.col),
        }
      }
    }

    return null
  }

  // Convert UCI move to screen coordinates for clicking
  const moveToScreenCoords = (
    move: string,
    windowInfo: WindowInfo,
    boardBox: { x: number; y: number; width: number; height: number },
    reversed: boolean
  ): { fromX: number; fromY: number; toX: number; toY: number } | null => {
    if (move.length < 4) return null

    const fromCol = move.charCodeAt(0) - 97 // 'a' = 0
    const fromRow = 9 - parseInt(move[1]) // '9' = row 0
    const toCol = move.charCodeAt(2) - 97
    const toRow = 9 - parseInt(move[3])

    if (fromCol < 0 || fromCol > 8 || fromRow < 0 || fromRow > 9) return null
    if (toCol < 0 || toCol > 8 || toRow < 0 || toRow > 9) return null

    // Cell dimensions
    const cellWidth = boardBox.width / 8
    const cellHeight = boardBox.height / 9

    // Calculate positions in board coordinates
    let fx = boardBox.x + fromCol * cellWidth
    let fy = boardBox.y + fromRow * cellHeight
    let tx = boardBox.x + toCol * cellWidth
    let ty = boardBox.y + toRow * cellHeight

    // If reversed, flip the coordinates
    if (reversed) {
      fx = boardBox.x + boardBox.width - fromCol * cellWidth
      fy = boardBox.y + boardBox.height - fromRow * cellHeight
      tx = boardBox.x + boardBox.width - toCol * cellWidth
      ty = boardBox.y + boardBox.height - toRow * cellHeight
    }

    // Convert to screen coordinates (add window position)
    return {
      fromX: Math.round(windowInfo.x + fx),
      fromY: Math.round(windowInfo.y + fy),
      toX: Math.round(windowInfo.x + tx),
      toY: Math.round(windowInfo.y + ty),
    }
  }

  // Capture and process the target window
  const captureAndProcess = async (): Promise<{
    board: BoardGrid
    boardBox: { x: number; y: number; width: number; height: number }
    isReversed: boolean
  } | null> => {
    if (!selectedWindowId.value) {
      return null
    }

    try {
      // Capture the window
      const result = await invoke<CaptureResult>('capture_window', {
        windowId: selectedWindowId.value,
      })

      // Convert base64 to image
      const img = await base64ToImage(result.image_base64)

      // Create canvas and draw image
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      // Convert to blob and File for image recognition
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to create blob'))), 'image/png')
      })
      const file = new File([blob], 'capture.png', { type: 'image/png' })

      // Process with image recognition
      const ir = getImageRecognition()
      await ir.processImage(file)
      const boxes = ir.detectedBoxes.value

      // Process detections to board
      return processDetectionsToBoard(boxes, result.width, result.height)
    } catch (error) {
      console.error('Capture and process failed:', error)
      return null
    }
  }

  // Execute a move on the external application
  const executeExternalMove = async (move: string): Promise<boolean> => {
    if (!selectedWindow.value || !boardBounds.value) {
      return false
    }

    const coords = moveToScreenCoords(
      move,
      selectedWindow.value,
      boardBounds.value,
      isReversed.value
    )

    if (!coords) {
      console.error('Failed to calculate move coordinates')
      return false
    }

    try {
      await invoke('simulate_move', {
        fromX: coords.fromX,
        fromY: coords.fromY,
        toX: coords.toX,
        toY: coords.toY,
        clickDelayMs: settings.value.mouseClickDelay,
        moveDelayMs: settings.value.mouseMoveDelay,
      })
      return true
    } catch (error) {
      console.error('Failed to simulate move:', error)
      return false
    }
  }

  // Main scan loop
  const scanLoop = async () => {
    if (state.value !== 'connecting' || !isScanning.value) {
      return
    }

    try {
      const result = await captureAndProcess()
      if (!result) {
        return
      }

      const { board, boardBox, isReversed: reversed } = result
      boardBounds.value = boardBox
      isReversed.value = reversed

      // First scan - initialize the board
      if (!previousBoard.value) {
        previousBoard.value = board
        recognizedBoard.value = board
        const fen = boardToFen(board) + ' w - - 0 1'
        if (onBoardInitialized) {
          onBoardInitialized(fen, reversed)
        }
        return
      }

      // Compare with previous board to detect moves
      const detectedMove = compareBoardsAndFindMove(previousBoard.value, board)
      if (detectedMove) {
        // Update boards
        previousBoard.value = board
        recognizedBoard.value = board

        // Notify about the detected move (opponent's move)
        if (onMoveDetected) {
          onMoveDetected(detectedMove.from, detectedMove.to)
        }

        // If in auto mode, get and play the best move
        if (mode.value === 'auto' && getEngineBestMove) {
          // Wait a bit for the engine to calculate
          await new Promise(resolve => setTimeout(resolve, 100))

          const bestMove = getEngineBestMove()
          if (bestMove && bestMove.length >= 4) {
            // Play the move on our board
            if (playMove) {
              playMove(bestMove.substring(0, 2), bestMove.substring(2, 4))
            }

            // Wait for the move to be played locally
            await new Promise(resolve => setTimeout(resolve, 50))

            // Execute the move on the external application
            await executeExternalMove(bestMove)

            // Update previous board to include our move
            const afterMoveResult = await captureAndProcess()
            if (afterMoveResult) {
              previousBoard.value = afterMoveResult.board
              recognizedBoard.value = afterMoveResult.board
            }
          }
        }
      } else {
        // No move detected, update recognized board
        recognizedBoard.value = board
      }
    } catch (error) {
      console.error('Scan loop error:', error)
    }
  }

  // Start the linker
  const start = async (): Promise<void> => {
    if (state.value === 'connecting') {
      return
    }

    // Don't initialize model here - defer to connect() when actually needed
    // This avoids initialization failures when just listing windows

    // Refresh window list
    await refreshWindowList()

    state.value = 'selecting'
    errorMessage.value = ''
  }

  // Connect to the selected window and start scanning
  const connect = async (): Promise<void> => {
    if (!selectedWindowId.value || !selectedWindow.value) {
      errorMessage.value = t('linker.error.noWindowSelected')
      return
    }

    // Initialize model when connecting (deferred from start)
    const modelReady = await initializeModel()
    if (!modelReady) {
      return
    }

    // Initial capture to get board position
    const result = await captureAndProcess()
    if (!result) {
      errorMessage.value = t('linker.error.noBoardDetected')
      return
    }

    boardBounds.value = result.boardBox
    previousBoard.value = result.board
    recognizedBoard.value = result.board
    isReversed.value = result.isReversed

    // Notify about initial board
    const fen = boardToFen(result.board) + ' w - - 0 1'
    if (onBoardInitialized) {
      onBoardInitialized(fen, result.isReversed)
    }

    // Start scanning
    state.value = 'connecting'
    isScanning.value = true

    scanTimer = setInterval(scanLoop, settings.value.scanInterval)
  }

  // Pause scanning
  const pause = (): void => {
    if (state.value !== 'connecting') return
    state.value = 'paused'
    isScanning.value = false
    if (scanTimer) {
      clearInterval(scanTimer)
      scanTimer = null
    }
  }

  // Resume scanning
  const resume = (): void => {
    if (state.value !== 'paused') return
    state.value = 'connecting'
    isScanning.value = true
    scanTimer = setInterval(scanLoop, settings.value.scanInterval)
  }

  // Stop the linker
  const stop = (): void => {
    state.value = 'idle'
    isScanning.value = false
    selectedWindowId.value = null
    selectedWindow.value = null
    recognizedBoard.value = null
    previousBoard.value = null
    boardBounds.value = null
    screenBoardBounds.value = null

    if (scanTimer) {
      clearInterval(scanTimer)
      scanTimer = null
    }
  }

  // Set callbacks for integration with game state
  const setCallbacks = (callbacks: {
    onMoveDetected?: (from: string, to: string) => void
    onBoardInitialized?: (fen: string, isReversed: boolean) => void
    getEngineBoard?: () => BoardGrid | null
    getEngineBestMove?: () => string | null
    isEngineThinking?: () => boolean
    playMove?: (from: string, to: string) => void
  }): void => {
    if (callbacks.onMoveDetected) onMoveDetected = callbacks.onMoveDetected
    if (callbacks.onBoardInitialized) onBoardInitialized = callbacks.onBoardInitialized
    if (callbacks.getEngineBoard) getEngineBoard = callbacks.getEngineBoard
    if (callbacks.getEngineBestMove) getEngineBestMove = callbacks.getEngineBestMove
    if (callbacks.isEngineThinking) isEngineThinking = callbacks.isEngineThinking
    if (callbacks.playMove) playMove = callbacks.playMove
  }

  // Update settings
  const updateSettings = (newSettings: Partial<LinkerSettings>): void => {
    settings.value = { ...settings.value, ...newSettings }

    // Restart scan timer if running
    if (scanTimer && state.value === 'connecting') {
      clearInterval(scanTimer)
      scanTimer = setInterval(scanLoop, settings.value.scanInterval)
    }
  }

  // Reset settings to defaults
  const resetSettings = (): void => {
    settings.value = { ...DEFAULT_SETTINGS }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stop()
  })

  return {
    // State
    state,
    mode,
    settings,
    errorMessage,
    isScanning,
    availableWindows,
    selectedWindowId,
    selectedWindow,
    recognizedBoard,
    boardBounds,
    isReversed,

    // Computed
    isActive,
    statusText,

    // Actions
    start,
    stop,
    connect,
    pause,
    resume,
    refreshWindowList,
    selectWindow,
    setCallbacks,
    updateSettings,
    resetSettings,
    initializeModel,
    captureAndProcess,
    executeExternalMove,

    // Utilities
    boardToFen,
  }
}
