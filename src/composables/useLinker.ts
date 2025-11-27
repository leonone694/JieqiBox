// src/composables/useLinker.ts
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import { useImageRecognition, LABELS, type DetectionBox } from './image-recognition'

type ImageRecognitionInstance = ReturnType<typeof useImageRecognition>
export type LinkerMode = 'auto' | 'watch'
export type LinkerState = 'idle' | 'selecting' | 'connecting' | 'paused' | 'error'
export type BoardGrid = (string | null)[][]

export interface WindowInfo {
  id: number; name: string; x: number; y: number; width: number; height: number; is_minimized: boolean
}

export interface CaptureResult {
  image_base64: string; width: number; height: number
}

export interface LinkerSettings {
  mouseClickDelay: number; mouseMoveDelay: number; scanInterval: number; animationConfirm: boolean
}

const DEFAULT_SETTINGS: LinkerSettings = {
  mouseClickDelay: 50, mouseMoveDelay: 200, scanInterval: 800, animationConfirm: true,
}

// 映射表
const PIECE_TO_FEN: { [key: string]: string } = {
  r_general: 'K', r_advisor: 'A', r_elephant: 'B', r_horse: 'N', r_chariot: 'R', r_cannon: 'C', r_soldier: 'P',
  b_general: 'k', b_advisor: 'a', b_elephant: 'b', b_horse: 'n', b_chariot: 'r', b_cannon: 'c', b_soldier: 'p',
  dark: 'x', dark_r_general: 'X', dark_r_advisor: 'X', dark_r_elephant: 'X', dark_r_horse: 'X',
  dark_r_chariot: 'X', dark_r_cannon: 'X', dark_r_soldier: 'X', dark_b_general: 'x', dark_b_advisor: 'x',
  dark_b_elephant: 'x', dark_b_horse: 'x', dark_b_chariot: 'x', dark_b_cannon: 'x', dark_b_soldier: 'x',
}

// 揭棋棋子总量表 (不含帅将)
const TOTAL_PIECES: { [key: string]: number } = {
  R:2, N:2, B:2, A:2, C:2, P:5,
  r:2, n:2, b:2, a:2, c:2, p:5
}

const coordsToNotation = (row: number, col: number): string => {
  return `${String.fromCharCode(97 + col)}${9 - row}`
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
  let imageRecognition: ImageRecognitionInstance | null = options.imageRecognition || null
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
  const boardBounds = ref<{ x: number; y: number; width: number; height: number } | null>(null)
  const isReversed = ref(false)

  // 核心控制变量
  let scanTimer: ReturnType<typeof setInterval> | null = null
  let isProcessingFrame = false
  const stabilityCounter = ref(0)
  const lastStableFen = ref('') // 这个 FEN 包含暗子池信息
  const pendingMyMove = ref<string | null>(null)
  const lastAutoExecutedMove = ref<string | null>(null)

  // ★★★ 新增：历史最大明子数量记录 (用于计算暗子池) ★★★
  // 键是 FEN 字符 (如 'R', 'c'), 值是该子同时在场过的最大数量
  const maxRevealedCounts = ref<Record<string, number>>({})

  // 回调接口
  let onMoveDetected: ((from: string, to: string) => void) | null = null
  let onBoardInitialized: ((fen: string, isReversed: boolean) => void) | null = null
  let getEngineBestMove: (() => string | null) | null = null
  let isEngineThinking: (() => boolean) | null = null
  let playMove: ((from: string, to: string) => void) | null = null
  let requestEngineStart: (() => void) | null = null

  const isActive = computed(() => state.value === 'connecting')
  const statusText = computed(() => {
    if (state.value === 'error') return errorMessage.value
    if (state.value === 'connecting') return isScanning.value ? t('linker.status.scanning') : t('linker.status.connected')
    return t(`linker.status.${state.value}`)
  })

  // --- 核心逻辑 ---

  const refreshWindowList = async () => {
    try { availableWindows.value = await invoke<WindowInfo[]>('list_windows') }
    catch (e) { errorMessage.value = t('linker.error.listWindowsFailed') }
  }

  const selectWindow = async (windowId: number) => {
    try {
      selectedWindowId.value = windowId
      selectedWindow.value = await invoke<WindowInfo>('get_window_info', { windowId })
    } catch (e) { errorMessage.value = t('linker.error.windowNotFound') }
  }

  const initializeModel = async () => {
    try { await getImageRecognition().initializeModel(); return true }
    catch (e) { state.value = 'error'; errorMessage.value = t('linker.error.modelInitFailed'); return false }
  }

  const processDetectionsToBoard = (boxes: DetectionBox[]) => {
    const ir = getImageRecognition()
    const grid = ir.updateBoardGrid(boxes)
    const boardBox = boxes.filter(b => LABELS[b.labelIndex]?.name === 'Board').sort((a, b) => b.score - a.score)[0]
    
    if (!boardBox) return null
    const [bx, by, bw, bh] = boardBox.box

    const board: BoardGrid = Array(10).fill(null).map(() => Array(9).fill(null))
    
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
    for(let r=0; r<3; r++) for(let c=3; c<6; c++) if(board[r][c] === 'K') reversed = true
    for(let r=7; r<10; r++) for(let c=3; c<6; c++) if(board[r][c] === 'k') reversed = true

    if (reversed) {
      const flipped: BoardGrid = Array(10).fill(null).map(() => Array(9).fill(null))
      for(let r=0; r<10; r++) for(let c=0; c<9; c++) flipped[r][c] = board[9-r][8-c]
      return { board: flipped, boardBox: { x: bx, y: by, width: bw, height: bh }, isReversed: reversed }
    }
    return { board, boardBox: { x: bx, y: by, width: bw, height: bh }, isReversed: reversed }
  }

  // ★★★ 核心修复：生成带有暗子池的 Jieqi FEN ★★★
  const generateJieqiFen = (board: BoardGrid, isRedTurn: boolean): string => {
    // 1. 生成棋盘部分
    const boardFen = board.map(row => {
      let empty = 0, line = ''
      row.forEach(p => {
        if (p) { if (empty) { line += empty; empty = 0 } line += p } else empty++
      })
      if (empty) line += empty
      return line
    }).join('/')

    // 2. 统计当前盘面上所有的明子
    const currentCounts: Record<string, number> = {}
    for(let r=0; r<10; r++) {
      for(let c=0; c<9; c++) {
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
     return board.map(row => {
      let empty = 0, line = ''
      row.forEach(p => {
        if (p) { if (empty) { line += empty; empty = 0 } line += p } else empty++
      })
      if (empty) line += empty
      return line
    }).join('/')
  }

  const findMove = (oldB: BoardGrid, newB: BoardGrid) => {
    const diffs: {r:number, c:number, old:string|null, new:string|null}[] = []
    for(let r=0; r<10; r++) for(let c=0; c<9; c++) if(oldB[r][c] !== newB[r][c]) diffs.push({r,c,old:oldB[r][c], new:newB[r][c]})
    if (diffs.length === 2) {
      const [d1, d2] = diffs
      const isSrc = (d: typeof d1) => d.old && !d.new
      const isDst = (d: typeof d1) => d.new
      let src = isSrc(d1) ? d1 : (isSrc(d2) ? d2 : null)
      let dst = isDst(d1) && d1 !== src ? d1 : (isDst(d2) && d2 !== src ? d2 : null)
      if (src && dst) return { from: coordsToNotation(src.r, src.c), to: coordsToNotation(dst.r, dst.c) }
    }
    return null
  }

  const executeExternalMove = async (move: string): Promise<boolean> => {
    if (!selectedWindow.value || !boardBounds.value) return false
    const fC = move.charCodeAt(0)-97, fR = 9-parseInt(move[1])
    const tC = move.charCodeAt(2)-97, tR = 9-parseInt(move[3])
    const cw = boardBounds.value.width / 8
    const ch = boardBounds.value.height / 9
    const getPos = (c: number, r: number) => {
      if (isReversed.value) return { x: boardBounds.value!.width - c*cw, y: boardBounds.value!.height - r*ch }
      return { x: c*cw, y: r*ch }
    }
    const start = getPos(fC, fR), end = getPos(tC, tR)
    const winX = selectedWindow.value.x + boardBounds.value.x
    const winY = selectedWindow.value.y + boardBounds.value.y

    try {
      console.log(`[Linker] 发送点击指令: ${move}`)
      await invoke('simulate_move', {
        fromX: Math.round(winX + start.x), fromY: Math.round(winY + start.y),
        toX: Math.round(winX + end.x), toY: Math.round(winY + end.y),
        clickDelayMs: settings.value.mouseClickDelay, moveDelayMs: settings.value.mouseMoveDelay
      })
      return true
    } catch (e) { console.error(e); return false }
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
      if (previousBoard.value && JSON.stringify(previousBoard.value) === currentBoardJson) {
        stabilityCounter.value++
      } else {
        stabilityCounter.value = 0
        previousBoard.value = result.board
        return
      }

      if (stabilityCounter.value < 1) return 

      boardBounds.value = result.boardBox
      isReversed.value = result.isReversed
      
      // 生成带有暗子池信息的 Jieqi FEN
      // 这里的 turn 默认 w (红)，实际游戏中由 onMoveDetected 驱动引擎换边，
      // 但如果是第一次初始化，我们需要一个合法的 FEN
      const fullFen = generateJieqiFen(result.board, !result.isReversed) // 假设不翻转红先，翻转黑先(AI先)
      
      // 用于对比变化的简单 FEN
      const simpleFen = boardToSimpleFen(result.board)

      if (!recognizedBoard.value) {
        recognizedBoard.value = result.board
        lastStableFen.value = simpleFen
        // 初始化时，重置最大明子计数
        maxRevealedCounts.value = {}
        // 重新生成一次以确保 maxRevealedCounts 正确
        const initFen = generateJieqiFen(result.board, !result.isReversed)
        if (onBoardInitialized) onBoardInitialized(initFen, result.isReversed)
        return
      }

      if (simpleFen !== lastStableFen.value) {
        const move = findMove(recognizedBoard.value, result.board)
        recognizedBoard.value = result.board
        lastStableFen.value = simpleFen

        if (move) {
          const moveStr = move.from + move.to
          if (pendingMyMove.value === moveStr) {
            console.log(`[Linker] 确认己方移动: ${moveStr}`)
            pendingMyMove.value = null 
          } else {
            if (onMoveDetected) onMoveDetected(move.from, move.to)
            lastAutoExecutedMove.value = null
          }
        } else {
          // 棋盘重置/非法移动，强制重置状态
          maxRevealedCounts.value = {}
          const resetFen = generateJieqiFen(result.board, !result.isReversed)
          if (onBoardInitialized) onBoardInitialized(resetFen, result.isReversed)
          lastAutoExecutedMove.value = null
        }
      }

      if (mode.value === 'auto') {
        await tryAiAutoMove()
      }

    } catch (e) { console.error('Scan Error:', e) }
    finally {
        isProcessingFrame = false
    }
  }

  const tryAiAutoMove = async () => {
    if (isEngineThinking && isEngineThinking()) return

    if (getEngineBestMove) {
      const bestMove = getEngineBestMove()
      if (bestMove && bestMove !== lastAutoExecutedMove.value) {
        console.log(`[Linker] 执行 AI 招法: ${bestMove}`)
        pendingMyMove.value = bestMove 
        lastAutoExecutedMove.value = bestMove
        
        if (playMove) playMove(bestMove.substring(0,2), bestMove.substring(2,4))
        
        const success = await executeExternalMove(bestMove)
        if (success) {
           stabilityCounter.value = -3 
        }
        return
      }
    }

    if (requestEngineStart) {
      requestEngineStart()
    }
  }

  const captureAndProcess = async () => {
    if (!selectedWindowId.value) return null
    const res = await invoke<CaptureResult>('capture_window', { windowId: selectedWindowId.value })
    const img = await base64ToImage(res.image_base64)
    const cvs = document.createElement('canvas'); cvs.width = img.width; cvs.height = img.height
    cvs.getContext('2d')!.drawImage(img, 0, 0)
    const blob = await new Promise<Blob>(r => cvs.toBlob(b => r(b!), 'image/png'))
    const ir = getImageRecognition()
    await ir.processImage(new File([blob], 'cap.png', { type: 'image/png' }))
    return processDetectionsToBoard(ir.detectedBoxes.value)
  }

  const start = async () => { 
    if(state.value === 'connecting') return
    await refreshWindowList(); state.value = 'selecting'; errorMessage.value = '' 
  }
  
  const connect = async () => {
    if (!selectedWindowId.value) return
    if (!await initializeModel()) return
    const res = await captureAndProcess()
    if (!res) { errorMessage.value = t('linker.error.noBoardDetected'); return }
    
    previousBoard.value = res.board
    recognizedBoard.value = res.board
    boardBounds.value = res.boardBox
    isReversed.value = res.isReversed
    
    // 初始化时重置计数器
    maxRevealedCounts.value = {}
    lastStableFen.value = boardToSimpleFen(res.board)
    const initFen = generateJieqiFen(res.board, !res.isReversed)
    
    if (onBoardInitialized) onBoardInitialized(initFen, res.isReversed)
    
    state.value = 'connecting'; isScanning.value = true
    scanTimer = setInterval(scanLoop, settings.value.scanInterval)
  }

  const stop = () => {
    state.value = 'idle'; isScanning.value = false; if(scanTimer) clearInterval(scanTimer)
    scanTimer = null; recognizedBoard.value = null; previousBoard.value = null
    lastAutoExecutedMove.value = null
  }

  const setCallbacks = (cbs: any) => {
    if(cbs.onMoveDetected) onMoveDetected = cbs.onMoveDetected
    if(cbs.onBoardInitialized) onBoardInitialized = cbs.onBoardInitialized
    if(cbs.getEngineBestMove) getEngineBestMove = cbs.getEngineBestMove
    if(cbs.isEngineThinking) isEngineThinking = cbs.isEngineThinking
    if(cbs.playMove) playMove = cbs.playMove
    if(cbs.requestEngineStart) requestEngineStart = cbs.requestEngineStart
  }

  onUnmounted(stop)

  return {
    state, mode, settings, errorMessage, isScanning, availableWindows, selectedWindowId,
    selectedWindow, recognizedBoard, boardBounds, isReversed, isActive, statusText,
    start, stop, connect, pause: () => { isScanning.value = false }, resume: () => { isScanning.value = true },
    refreshWindowList, selectWindow, setCallbacks, updateSettings: (s:any) => settings.value = {...settings.value, ...s},
    resetSettings: () => settings.value = {...DEFAULT_SETTINGS}, initializeModel, captureAndProcess, executeExternalMove, 
    boardToFen: generateJieqiFen // 导出新的 FEN 生成器供外部调用(如 Capture Preview)
  }
}
