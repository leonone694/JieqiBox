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
  mouseMoveDelay: 200,
  scanInterval: 800,
  animationConfirm: true,
}

// 映射表
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

// 揭棋棋子总量表 (不含帅将)
const TOTAL_PIECES: { [key: string]: number } = {
  R: 2,
  N: 2,
  B: 2,
  A: 2,
  C: 2,
  P: 5,
  r: 2,
  n: 2,
  b: 2,
  a: 2,
  c: 2,
  p: 5,
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
  let scanTimer: ReturnType<typeof setInterval> | null = null
  let isProcessingFrame = false
  const stabilityCounter = ref(0)
  const lastStableFen = ref('') // 这个 FEN 包含暗子池信息
  const lastAutoExecutedMove = ref<string | null>(null)

  // ★★★ 新架构：通过轮次控制 ★★★
  // isMyTurn: true表示轮到己方(AI)走棋，false表示对方走棋(仅观察)
  const isMyTurn = ref(false)
  // waitingForExternalConfirm: AI已发送点击指令，等待外部棋盘确认变化
  const waitingForExternalConfirm = ref(false)

  // ★★★ 新增：历史最大明子数量记录 (用于计算暗子池) ★★★
  // 键是 FEN 字符 (如 'R', 'c'), 值是该子同时在场过的最大数量
  const maxRevealedCounts = ref<Record<string, number>>({})

  // 回调接口
  let onBoardUpdated: ((fen: string) => void) | null = null
  let onBoardInitialized: ((fen: string, isReversed: boolean) => void) | null =
    null
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

  // ★★★ 核心修复：生成带有暗子池的 Jieqi FEN ★★★
  const generateJieqiFen = (board: BoardGrid, isRedTurn: boolean): string => {
    // 1. 生成棋盘部分
    const boardFen = board
      .map(row => {
        let empty = 0,
          line = ''
        row.forEach(p => {
          if (p) {
            if (empty) {
              line += empty
              empty = 0
            }
            line += p
          } else empty++
        })
        if (empty) line += empty
        return line
      })
      .join('/')

    // 2. 统计当前盘面上所有的明子
    const currentCounts: Record<string, number> = {}
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c]
        // 只有明子(非X, x)才参与计数
        if (p && p !== 'X' && p !== 'x' && p !== 'K' && p !== 'k') {
          currentCounts[p] = (currentCounts[p] || 0) + 1
        }
      }
    }

    // 3. 更新历史最大明子数 (单调递增，防止死子复活)
    Object.keys(TOTAL_PIECES).forEach(key => {
      const current = currentCounts[key] || 0
      const max = maxRevealedCounts.value[key] || 0
      if (current > max) {
        maxRevealedCounts.value[key] = current
      }
    })

    // 4. 计算暗子池 (总量 - 历史最大明子数)
    // 顺序：R r N n B b A a C c P p
    const order = ['R', 'r', 'N', 'n', 'B', 'b', 'A', 'a', 'C', 'c', 'P', 'p']
    let poolStr = ''

    order.forEach(key => {
      const total = TOTAL_PIECES[key]
      const revealed = maxRevealedCounts.value[key] || 0
      const remainingInPool = Math.max(0, total - revealed)

      // 只有当暗子池里还有该类棋子时，才写入FEN
      if (remainingInPool > 0) {
        poolStr += key + remainingInPool
      }
    })

    // 5. 拼接完整 FEN
    // 格式: [board] [turn] [pool] - [half] [full]
    const turn = isRedTurn ? 'w' : 'b' // 假设 AI 总是执红先行，或者根据 isReversed 判断?
    // 这里的 turn 逻辑可能需要根据实际情况调整。
    // 如果 isReversed=true (AI执黑)，通常意味着黑方在下方。如果此时轮到下方走，那就是 b。
    // 简单起见，我们暂定: 如果棋盘有变动，由 UI 决定轮次；如果是初始化，默认 w。

    return `${boardFen} ${turn} ${poolStr} - 0 1`
  }

  // 原来的 boardToFen 改名为简单版，仅内部对比用
  const boardToSimpleFen = (board: BoardGrid) => {
    return board
      .map(row => {
        let empty = 0,
          line = ''
        row.forEach(p => {
          if (p) {
            if (empty) {
              line += empty
              empty = 0
            }
            line += p
          } else empty++
        })
        if (empty) line += empty
        return line
      })
      .join('/')
  }

  const executeExternalMove = async (move: string): Promise<boolean> => {
    if (!selectedWindow.value || !boardBounds.value) return false
    const fC = move.charCodeAt(0) - 97,
      fR = 9 - parseInt(move[1])
    const tC = move.charCodeAt(2) - 97,
      tR = 9 - parseInt(move[3])
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
    const start = getPos(fC, fR),
      end = getPos(tC, tR)
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

  const scanLoop = async () => {
    if (state.value !== 'connecting' || !isScanning.value) return
    if (isProcessingFrame) {
      return
    }
    isProcessingFrame = true
    try {
      const result = await captureAndProcess()
      if (!result) return

      const currentBoardJson = JSON.stringify(result.board)
      if (
        previousBoard.value &&
        JSON.stringify(previousBoard.value) === currentBoardJson
      ) {
        stabilityCounter.value=1
      } else {
        stabilityCounter.value = 0
        previousBoard.value = result.board
        return
      }

      if (stabilityCounter.value < 1) return

      boardBounds.value = result.boardBox
      isReversed.value = result.isReversed

      // 用于对比变化的简单 FEN
      const simpleFen = boardToSimpleFen(result.board)

      // ★★★ 初始化逻辑 ★★★
      if (!recognizedBoard.value) {
        recognizedBoard.value = result.board
        lastStableFen.value = simpleFen
        // 初始化时，重置最大明子计数
        maxRevealedCounts.value = {}
        // 重新生成一次以确保 maxRevealedCounts 正确
        const initFen = generateJieqiFen(result.board, !result.isReversed)
        if (onBoardInitialized) onBoardInitialized(initFen, result.isReversed)
        // 初始化后，根据isReversed决定谁先手
        // 如果isReversed=true(AI在下方=AI执黑)，则红方先行，AI要等待对方走完
        // 如果isReversed=false(AI在上方=AI执红)，则AI先行
        isMyTurn.value = !result.isReversed
        console.log(
          `[Linker] 初始化完成, AI执${result.isReversed ? '黑' : '红'}, isMyTurn=${isMyTurn.value}`
        )
        return
      }

      // ★★★ 新架构：检测棋盘变化 ★★★
      if (simpleFen !== lastStableFen.value) {
        console.log(`[Linker] 检测到棋盘变化`)
        recognizedBoard.value = result.board
        lastStableFen.value = simpleFen

        // 如果之前在等待AI移动确认，现在棋盘变化了，说明移动成功
        // 先切换轮次，再生成FEN（FEN的turn应该是切换后的下一位行棋方）
        let nextTurnIsRed: boolean
        if (waitingForExternalConfirm.value) {
          console.log(`[Linker] AI移动已确认，切换到对方回合`)
          waitingForExternalConfirm.value = false
          isMyTurn.value = false
          // AI刚走完，下一步是对方走
          // isReversed=false → AI执红，对方执黑，下一步黑方走 (nextTurnIsRed=false)
          // isReversed=true → AI执黑，对方执红，下一步红方走 (nextTurnIsRed=true)
          nextTurnIsRed = isReversed.value
          // 停止引擎，等待对方走完
          if (stopEngine) stopEngine()
        } else {
          // 对方走了一步，切换到己方回合
          console.log(`[Linker] 对方已走棋，切换到己方回合`)
          isMyTurn.value = true
          // 对方刚走完，下一步是AI走
          // isReversed=false → AI执红，下一步红方走 (nextTurnIsRed=true)
          // isReversed=true → AI执黑，下一步黑方走 (nextTurnIsRed=false)
          nextTurnIsRed = !isReversed.value
        }

        // 生成新的FEN，turn字段表示下一位行棋方
        const newFen = generateJieqiFen(result.board, nextTurnIsRed)

        // 通知外部更新棋盘状态
        if (onBoardUpdated) {
          onBoardUpdated(newFen)
        }

        lastAutoExecutedMove.value = null
      }

      // ★★★ 只有在auto模式且轮到己方时才执行AI移动 ★★★
      if (
        mode.value === 'auto' &&
        isMyTurn.value &&
        !waitingForExternalConfirm.value
      ) {
        await tryAiAutoMove()
      }
    } catch (e) {
      console.error('Scan Error:', e)
    } finally {
      isProcessingFrame = false
    }
  }

  const tryAiAutoMove = async () => {
    // 不是己方回合，不执行
    if (!isMyTurn.value) return
    // 正在等待外部确认，不重复执行
    if (waitingForExternalConfirm.value) return
    // 引擎正在思考，等待
    if (isEngineThinking && isEngineThinking()) return

    if (getEngineBestMove) {
      const bestMove = getEngineBestMove()
      if (bestMove && bestMove !== lastAutoExecutedMove.value) {
        console.log(`[Linker] 执行 AI 招法: ${bestMove}`)
        lastAutoExecutedMove.value = bestMove

        // ★★★ 关键改变：只操作外部软件，不更新内部棋盘 ★★★
        // 不调用 playMove，等待扫描外部棋盘后统一更新
        const success = await executeExternalMove(bestMove)
        if (success) {
          // 设置等待确认标志
          waitingForExternalConfirm.value = true
          stabilityCounter.value = -3
          console.log(`[Linker] 已发送移动指令，等待外部棋盘确认`)
        }
        return
      }
    }

    // 没有bestMove，请求引擎开始计算
    if (requestEngineStart) {
      requestEngineStart()
    }
  }

  const captureAndProcess = async () => {
    if (!selectedWindowId.value) return null
    const res = await invoke<CaptureResult>('capture_window', {
      windowId: selectedWindowId.value,
    })
    // Direct base64 to image conversion, skip unnecessary File/Blob conversions
    const img = await base64ToImage(res.image_base64)
    const ir = getImageRecognition()
    // Use the faster direct processing path
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

    previousBoard.value = res.board
    recognizedBoard.value = res.board
    boardBounds.value = res.boardBox
    isReversed.value = res.isReversed

    // 初始化时重置计数器和状态
    maxRevealedCounts.value = {}
    lastStableFen.value = boardToSimpleFen(res.board)
    waitingForExternalConfirm.value = false
    // 根据isReversed决定谁先手
    // 如果isReversed=true(AI在下方=AI执黑)，则红方先行，AI要等待对方走完
    // 如果isReversed=false(AI在上方=AI执红)，则AI先行
    isMyTurn.value = !res.isReversed
    console.log(
      `[Linker] 连接成功, AI执${res.isReversed ? '黑' : '红'}, isMyTurn=${isMyTurn.value}`
    )

    const initFen = generateJieqiFen(res.board, !res.isReversed)

    if (onBoardInitialized) onBoardInitialized(initFen, res.isReversed)

    state.value = 'connecting'
    isScanning.value = true
    scanTimer = setInterval(scanLoop, settings.value.scanInterval)
  }

  const stop = () => {
    state.value = 'idle'
    isScanning.value = false
    if (scanTimer) clearInterval(scanTimer)
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
    isMyTurn,
    isActive,
    statusText,
    start,
    stop,
    connect,
    pause: () => {
      isScanning.value = false
    },
    resume: () => {
      isScanning.value = true
    },
    refreshWindowList,
    selectWindow,
    setCallbacks,
    updateSettings: (s: any) => (settings.value = { ...settings.value, ...s }),
    resetSettings: () => (settings.value = { ...DEFAULT_SETTINGS }),
    initializeModel,
    captureAndProcess,
    executeExternalMove,
    boardToFen: generateJieqiFen, // 导出新的 FEN 生成器供外部调用(如 Capture Preview)
  }
}
