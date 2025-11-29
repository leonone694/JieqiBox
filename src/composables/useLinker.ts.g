// src/composables/useLinker.ts
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import {
  useImageRecognition,
  LABELS,
  type DetectionBox,
} from './image-recognition'

type ImageRecognitionInstance = ReturnType<typeof useImageRecognition>
export type LinkerMode = 'auto' | 'watch'
export type LinkerState =
  | 'idle'
  | 'selecting'
  | 'connecting'
  | 'paused'
  | 'error'
export type BoardGrid = (string | null)[][]

export interface WindowInfo {
  id: number
  name: string
  x: number
  y: number
  width: number
  height: number
  is_minimized: boolean
}

export interface CaptureResult {
  image_base64: string
  width: number
  height: number
}

export interface LinkerSettings {
  mouseClickDelay: number
  mouseMoveDelay: number
  scanInterval: number
  animationConfirm: boolean
}

const DEFAULT_SETTINGS: LinkerSettings = {
  mouseClickDelay: 50,
  mouseMoveDelay: 150, // 稍微改快一点点
  scanInterval: 500,   // 平时待机扫描间隔
  animationConfirm: true,
}

// 映射表
const PIECE_TO_FEN: { [key: string]: string } = {
  r_general: 'K', r_advisor: 'A', r_elephant: 'B', r_horse: 'N',
  r_chariot: 'R', r_cannon: 'C', r_soldier: 'P',
  b_general: 'k', b_advisor: 'a', b_elephant: 'b', b_horse: 'n',
  b_chariot: 'r', b_cannon: 'c', b_soldier: 'p',
  dark: 'x',
  dark_r_general: 'X', dark_r_advisor: 'X', dark_r_elephant: 'X',
  dark_r_horse: 'X', dark_r_chariot: 'X', dark_r_cannon: 'X', dark_r_soldier: 'X',
  dark_b_general: 'x', dark_b_advisor: 'x', dark_b_elephant: 'x',
  dark_b_horse: 'x', dark_b_chariot: 'x', dark_b_cannon: 'x', dark_b_soldier: 'x',
}

// 揭棋棋子总量表
const TOTAL_PIECES: { [key: string]: number } = {
  R: 2, N: 2, B: 2, A: 2, C: 2, P: 5,
  r: 2, n: 2, b: 2, a: 2, c: 2, p: 5,
}

const base64ToImage = (base64: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = `data:image/png;base64,${base64}`
  })
}

export interface UseLinkerOptions {
  imageRecognition?: ImageRecognitionInstance
}

export function useLinker(options: UseLinkerOptions = {}) {
  const { t } = useI18n()
  let imageRecognition: ImageRecognitionInstance | null =
    options.imageRecognition || null
  const getImageRecognition = () => {
    if (!imageRecognition) imageRecognition = useImageRecognition()
    return imageRecognition
  }

  // --- 状态 ---
  const state = ref<LinkerState>('idle')
  const mode = ref<LinkerMode>('auto')
  const settings = ref<LinkerSettings>({ ...DEFAULT_SETTINGS })
  const errorMessage = ref<string>('')
  const isScanning = ref(false)

  const availableWindows = ref<WindowInfo[]>([])
  const selectedWindowId = ref<number | null>(null)
  const selectedWindow = ref<WindowInfo | null>(null)

  const recognizedBoard = ref<BoardGrid | null>(null)
  const previousBoard = ref<BoardGrid | null>(null)
  const boardBounds = ref<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  const isReversed = ref(false)

  // 核心控制变量
  let scanTimer: ReturnType<typeof setTimeout> | null = null // 改为 setTimeout
  let isProcessingFrame = false
  const stabilityCounter = ref(0)
  const lastStableFen = ref('')
  const lastAutoExecutedMove = ref<string | null>(null)

  const isMyTurn = ref(false)
  const waitingForExternalConfirm = ref(false)
  const maxRevealedCounts = ref<Record<string, number>>({})

  // 回调接口
  let onBoardUpdated: ((fen: string) => void) | null = null
  let onBoardInitialized: ((fen: string, isReversed: boolean) => void) | null = null
  let getEngineBestMove: (() => string | null) | null = null
  let isEngineThinking: (() => boolean) | null = null
  let requestEngineStart: (() => void) | null = null
  let stopEngine: (() => void) | null = null

  const isActive = computed(() => state.value === 'connecting')
  const statusText = computed(() => {
    if (state.value === 'error') return errorMessage.value
    if (state.value === 'connecting')
      return isScanning.value
        ? t('linker.status.scanning')
        : t('linker.status.connected')
    return t(`linker.status.${state.value}`)
  })

  // --- 核心逻辑 ---

  const refreshWindowList = async () => {
    try {
      availableWindows.value = await invoke<WindowInfo[]>('list_windows')
    } catch (e) {
      errorMessage.value = t('linker.error.listWindowsFailed')
    }
  }

  const selectWindow = async (windowId: number) => {
    try {
      selectedWindowId.value = windowId
      selectedWindow.value = await invoke<WindowInfo>('get_window_info', {
        windowId,
      })
    } catch (e) {
      errorMessage.value = t('linker.error.windowNotFound')
    }
  }

  const initializeModel = async () => {
    try {
      await getImageRecognition().initializeModel()
      return true
    } catch (e) {
      state.value = 'error'
      errorMessage.value = t('linker.error.modelInitFailed')
      return false
    }
  }

  const processDetectionsToBoard = (boxes: DetectionBox[]) => {
    const ir = getImageRecognition()
    const grid = ir.updateBoardGrid(boxes)
    const boardBox = boxes
      .filter(b => LABELS[b.labelIndex]?.name === 'Board')
      .sort((a, b) => b.score - a.score)[0]

    if (!boardBox) return null
    const [bx, by, bw, bh] = boardBox.box

    const board: BoardGrid = Array(10)
      .fill(null)
      .map(() => Array(9).fill(null))

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = grid[r][c]
        if (piece) {
          const name = LABELS[piece.labelIndex]?.name
          if (name && PIECE_TO_FEN[name]) {
            board[r][c] = PIECE_TO_FEN[name]
          }
        }
      }
    }

    let reversed = false
    for (let r = 0; r < 3; r++)
      for (let c = 3; c < 6; c++) if (board[r][c] === 'K') reversed = true
    for (let r = 7; r < 10; r++)
      for (let c = 3; c < 6; c++) if (board[r][c] === 'k') reversed = true

    if (reversed) {
      const flipped: BoardGrid = Array(10)
        .fill(null)
        .map(() => Array(9).fill(null))
      for (let r = 0; r < 10; r++)
        for (let c = 0; c < 9; c++) flipped[r][c] = board[9 - r][8 - c]
      return {
        board: flipped,
        boardBox: { x: bx, y: by, width: bw, height: bh },
        isReversed: reversed,
      }
    }
    return {
      board,
      boardBox: { x: bx, y: by, width: bw, height: bh },
      isReversed: reversed,
    }
  }

  const generateJieqiFen = (board: BoardGrid, isRedTurn: boolean): string => {
    const boardFen = board
      .map(row => {
        let empty = 0, line = ''
        row.forEach(p => {
          if (p) {
            if (empty) { line += empty; empty = 0 }
            line += p
          } else empty++
        })
        if (empty) line += empty
        return line
      })
      .join('/')

    const currentCounts: Record<string, number> = {}
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c]
        if (p && p !== 'X' && p !== 'x' && p !== 'K' && p !== 'k') {
          currentCounts[p] = (currentCounts[p] || 0) + 1
        }
      }
    }

    Object.keys(TOTAL_PIECES).forEach(key => {
      const current = currentCounts[key] || 0
      const max = maxRevealedCounts.value[key] || 0
      if (current > max) maxRevealedCounts.value[key] = current
    })

    const order = ['R', 'r', 'N', 'n', 'B', 'b', 'A', 'a', 'C', 'c', 'P', 'p']
    let poolStr = ''
    order.forEach(key => {
      const total = TOTAL_PIECES[key]
      const revealed = maxRevealedCounts.value[key] || 0
      const remainingInPool = Math.max(0, total - revealed)
      if (remainingInPool > 0) poolStr += key + remainingInPool
    })

    const turn = isRedTurn ? 'w' : 'b'
    return `${boardFen} ${turn} ${poolStr} - 0 1`
  }

  const boardToSimpleFen = (board: BoardGrid) => {
    return board.map(row => {
        let empty = 0, line = ''
        row.forEach(p => {
          if (p) {
            if (empty) { line += empty; empty = 0 }
            line += p
          } else empty++
        })
        if (empty) line += empty
        return line
      }).join('/')
  }

  const executeExternalMove = async (move: string): Promise<boolean> => {
    if (!selectedWindow.value || !boardBounds.value) return false
    const fC = move.charCodeAt(0) - 97, fR = 9 - parseInt(move[1])
    const tC = move.charCodeAt(2) - 97, tR = 9 - parseInt(move[3])
    const cw = boardBounds.value.width / 8
    const ch = boardBounds.value.height / 9
    const getPos = (c: number, r: number) => {
      if (isReversed.value)
        return {
          x: boardBounds.value!.width - c * cw,
          y: boardBounds.value!.height - r * ch,
        }
      return { x: c * cw, y: r * ch }
    }
    const start = getPos(fC, fR), end = getPos(tC, tR)
    const winX = selectedWindow.value.x + boardBounds.value.x
    const winY = selectedWindow.value.y + boardBounds.value.y

    try {
      console.log(`[Linker] 发送点击指令: ${move}`)
      await invoke('simulate_move', {
        fromX: Math.round(winX + start.x),
        fromY: Math.round(winY + start.y),
        toX: Math.round(winX + end.x),
        toY: Math.round(winY + end.y),
        clickDelayMs: settings.value.mouseClickDelay,
        moveDelayMs: settings.value.mouseMoveDelay,
      })
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  // ★★★ 核心重构：自适应极速循环 ★★★
  const scanLoop = async () => {
    if (state.value !== 'connecting' || !isScanning.value) {
      scanTimer = null
      return
    }
    
    // 如果上一帧处理太慢，稍微让渡一下
    if (isProcessingFrame) {
      scanTimer = setTimeout(scanLoop, 50)
      return
    }

    isProcessingFrame = true
    // 默认使用用户设置的慢速间隔
    let nextScanDelay = settings.value.scanInterval

    try {
      const result = await captureAndProcess()
      
      if (result) {
        const currentBoardJson = JSON.stringify(result.board)
        
        // --- 极速防抖逻辑 ---
        if (previousBoard.value && JSON.stringify(previousBoard.value) === currentBoardJson) {
          // 画面稳定
          stabilityCounter.value++
        } else {
          // 画面变了！重置计数，并要求下一帧【立刻】扫描
          // console.log('[Linker] 视觉检测到变化，进入极速模式')
          stabilityCounter.value = 0
          previousBoard.value = result.board
          nextScanDelay = 50 // 极速模式：50ms后立刻确认
        }

        // 如果还没稳定（计数器小），或者刚处理完变化，保持极速模式
        // 阈值设置为1即可，因为现在频率快，连续两次50ms一致就算稳定
        if (stabilityCounter.value < 1) {
           nextScanDelay = 50
        } else {
           // 稳定后的逻辑
           boardBounds.value = result.boardBox
           isReversed.value = result.isReversed
           const simpleFen = boardToSimpleFen(result.board)

           // 1. 初始化
           if (!recognizedBoard.value) {
             recognizedBoard.value = result.board
             lastStableFen.value = simpleFen
             maxRevealedCounts.value = {}
             const initFen = generateJieqiFen(result.board, !result.isReversed)
             if (onBoardInitialized) onBoardInitialized(initFen, result.isReversed)
             isMyTurn.value = !result.isReversed
             console.log(`[Linker] 初始化完成, isMyTurn=${isMyTurn.value}`)
           }
           // 2. 检测到稳定变化
           else if (simpleFen !== lastStableFen.value) {
             console.log(`[Linker] 棋盘变化确认`)
             recognizedBoard.value = result.board
             lastStableFen.value = simpleFen

             let nextTurnIsRed: boolean
             if (waitingForExternalConfirm.value) {
               console.log(`[Linker] AI移动已确认`)
               waitingForExternalConfirm.value = false
               isMyTurn.value = false
               nextTurnIsRed = isReversed.value
               if (stopEngine) stopEngine()
             } else {
               console.log(`[Linker] 对方已走棋`)
               isMyTurn.value = true
               nextTurnIsRed = !isReversed.value
             }

             if (onBoardUpdated) {
               onBoardUpdated(generateJieqiFen(result.board, nextTurnIsRed))
             }
             lastAutoExecutedMove.value = null
             
             // 变化刚确认，保险起见下一帧还是快一点
             nextScanDelay = 100
           }

           // 3. 尝试AI走棋
           if (mode.value === 'auto' && isMyTurn.value && !waitingForExternalConfirm.value) {
             await tryAiAutoMove()
             // 如果触发了移动，tryAiAutoMove 内部会调整逻辑，这里不需要额外操作
             // 但如果刚才触发了移动，我们希望尽快看到结果，所以下面会根据 waitingForExternalConfirm 调整频率
           }
        }
      }
      
      // 如果正在等待外部棋盘响应AI的走棋，始终保持极速扫描
      // 这样能最快速度捕捉到棋子落下的瞬间
      if (waitingForExternalConfirm.value) {
        nextScanDelay = 50
      }

    } catch (e) {
      console.error('Scan Error:', e)
    } finally {
      isProcessingFrame = false
      if (state.value === 'connecting' && isScanning.value) {
        // 使用 setTimeout 递归调用
        scanTimer = setTimeout(scanLoop, nextScanDelay)
      }
    }
  }

  const tryAiAutoMove = async () => {
    if (!isMyTurn.value || waitingForExternalConfirm.value) return
    if (isEngineThinking && isEngineThinking()) return

    if (getEngineBestMove) {
      const bestMove = getEngineBestMove()
      if (bestMove && bestMove !== lastAutoExecutedMove.value) {
        console.log(`[Linker] 执行 AI 招法: ${bestMove}`)
        lastAutoExecutedMove.value = bestMove

        const success = await executeExternalMove(bestMove)
        if (success) {
          waitingForExternalConfirm.value = true
          // 设为负数是为了等待动画，但通过 scanLoop 里的 nextScanDelay 控制
          // 我们可以让它以 50ms 的频率快速度过这 -3 的计数
          stabilityCounter.value = -3 
          console.log(`[Linker] 指令已发送，进入极速等待模式`)
        }
        return
      }
    }

    if (requestEngineStart) requestEngineStart()
  }

  const captureAndProcess = async () => {
    if (!selectedWindowId.value) return null
    // 捕获和识别尽量使用高效模式
    const res = await invoke<CaptureResult>('capture_window', {
      windowId: selectedWindowId.value,
    })
    const img = await base64ToImage(res.image_base64)
    const ir = getImageRecognition()
    await ir.processImageDirect(img)
    return processDetectionsToBoard(ir.detectedBoxes.value)
  }

  const start = async () => {
    if (state.value === 'connecting') return
    await refreshWindowList()
    state.value = 'selecting'
    errorMessage.value = ''
  }

  const connect = async () => {
    if (!selectedWindowId.value) return
    if (!(await initializeModel())) return
    const res = await captureAndProcess()
    if (!res) {
      errorMessage.value = t('linker.error.noBoardDetected')
      return
    }

    // 初始化状态
    previousBoard.value = res.board
    recognizedBoard.value = res.board
    boardBounds.value = res.boardBox
    isReversed.value = res.isReversed
    
    // 刚连接认为直接稳定
    stabilityCounter.value = 1 
    maxRevealedCounts.value = {}
    lastStableFen.value = boardToSimpleFen(res.board)
    waitingForExternalConfirm.value = false
    isMyTurn.value = !res.isReversed

    const initFen = generateJieqiFen(res.board, !res.isReversed)
    if (onBoardInitialized) onBoardInitialized(initFen, res.isReversed)

    state.value = 'connecting'
    isScanning.value = true
    
    // 启动递归循环
    scanLoop()
    console.log(`[Linker] 连接成功, AI执${res.isReversed ? '黑' : '红'}`)
  }

  const stop = () => {
    state.value = 'idle'
    isScanning.value = false
    if (scanTimer) clearTimeout(scanTimer) // 清理 timeout
    scanTimer = null
    recognizedBoard.value = null
    previousBoard.value = null
    lastAutoExecutedMove.value = null
    waitingForExternalConfirm.value = false
    isMyTurn.value = false
  }

  const setCallbacks = (cbs: any) => {
    if (cbs.onBoardUpdated) onBoardUpdated = cbs.onBoardUpdated
    if (cbs.onBoardInitialized) onBoardInitialized = cbs.onBoardInitialized
    if (cbs.getEngineBestMove) getEngineBestMove = cbs.getEngineBestMove
    if (cbs.isEngineThinking) isEngineThinking = cbs.isEngineThinking
    if (cbs.requestEngineStart) requestEngineStart = cbs.requestEngineStart
    if (cbs.stopEngine) stopEngine = cbs.stopEngine
  }

  onUnmounted(stop)

  return {
    state, mode, settings, errorMessage, isScanning,
    availableWindows, selectedWindowId, selectedWindow,
    recognizedBoard, boardBounds, isReversed, isMyTurn,
    isActive, statusText,
    start, stop, connect,
    pause: () => { isScanning.value = false },
    resume: () => { isScanning.value = true; scanLoop() }, // resume 时重新触发
    refreshWindowList, selectWindow, setCallbacks,
    updateSettings: (s: any) => (settings.value = { ...settings.value, ...s }),
    resetSettings: () => (settings.value = { ...DEFAULT_SETTINGS }),
    initializeModel, captureAndProcess, executeExternalMove,
    boardToFen: generateJieqiFen,
  }
}
