export default {
  // 通用
  common: {
    confirm: '确定',
    cancel: '取消',
    close: '关闭',
    save: '保存',
    open: '打开',
    refresh: '刷新',
    reset: '重置',
    clear: '清除',
    apply: '应用',
    execute: '执行',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    warning: '警告',
    info: '信息',
  },

  // 顶部工具栏
  toolbar: {
    newGame: '新对局',
    copyFen: '复制FEN',
    inputFen: '输入FEN',
    editPosition: '编辑局面',
    uciSettings: 'UCI设置',
    analysisParams: '分析参数',
    saveNotation: '保存棋谱',
    openNotation: '打开棋谱',
    interfaceSettings: '界面设置',
    gameTitle: '揭棋对局'
  },

  // UCI选项对话框
  uciOptions: {
    title: 'UCI引擎选项',
    loadingText: '正在加载引擎选项...',
    noEngineLoaded: '当前未加载任何引擎。',
    loadEngine: '加载引擎',
    noOptionsAvailable: '该引擎无可用UCI选项。',
    refreshOptions: '刷新选项',
    range: '范围',
    execute: '执行',
    resetToDefaults: '恢复默认',
    clearSettings: '清除配置',
    confirmClearSettings: '确定要清除当前引擎的所有UCI选项配置吗？此操作不可恢复。',
    settingsCleared: '已清除UCI选项配置'
  },

  // 时间对话框
  timeDialog: {
    title: '引擎分析参数设置',
    movetime: '步时 (毫秒)',
    maxDepth: '最大层数',
    maxNodes: '最大节点数',
    analysisMode: '分析模式',
    resetToDefaults: '恢复默认',
    clearSettings: '清除配置',
    confirmClearSettings: '确定要清除所有分析参数配置吗？此操作不可恢复。',
    settingsCleared: '已清除分析参数配置',
    analysisModes: {
      movetime: '按时间分析',
      depth: '按层数分析',
      nodes: '按节点数分析'
    }
  },

  // 局面编辑对话框
  positionEditor: {
    title: '局面编辑',
    flipBoard: '🔄 上下翻转',
    switchSide: '⚡ 切换先手',
    resetPosition: '🔄 重置局面',
    addPieces: '添加棋子',
    brightPieces: '明子',
    darkPieces: '暗子',
    selectedPosition: '选中位置',
    piece: '棋子',
    validationStatus: {
      normal: '正常',
      error: '错误: 暗子数量不匹配'
    },
    cancel: '取消',
    applyChanges: '应用更改',
    pieces: {
      red_chariot: '红车',
      red_horse: '红马',
      red_elephant: '红象',
      red_advisor: '红士',
      red_king: '红帅',
      red_cannon: '红炮',
      red_pawn: '红兵',
      black_chariot: '黑车',
      black_horse: '黑马',
      black_elephant: '黑象',
      black_advisor: '黑士',
      black_king: '黑将',
      black_cannon: '黑炮',
      black_pawn: '黑卒',
      unknown: '暗子',
      red_unknown: '红暗子',
      black_unknown: '黑暗子'
    }
  },

  // FEN输入对话框
  fenInput: {
    title: '输入FEN字符串',
    placeholder: '请输入FEN字符串...',
    confirm: '确认',
    cancel: '取消'
  },

  // 翻子提示对话框
  flipPrompt: {
    title: '翻子提示',
    message: '请选择要翻开的棋子',
    confirm: '确认',
    cancel: '取消'
  },

  // 关于对话框
  about: {
    title: '关于JieqiBox',
    version: '版本',
    description: '一个现代化的揭棋分析和对弈桌面应用程序，基于 Tauri 和 Vue 3 构建。',
    features: '功能特性',
    featuresList: [
      '揭棋对局支持',
      'UCI引擎分析',
      '棋谱保存和加载',
      '局面编辑',
      'FEN字符串支持'
    ],
    author: '作者',
    license: '许可证',
    github: 'GitHub',
    downloadLatest: '下载最新版本',
    viewLicense: '查看许可证详情'
  },

  // 分析侧边栏
  analysis: {
    title: '引擎分析',
    startAnalysis: '开始分析',
    stopAnalysis: '停止分析',
    engineNotLoaded: '引擎未加载',
    loadEngine: '加载引擎',
    analysisResults: '分析结果',
    bestMove: '最佳着法',
    score: '评分',
    depth: '层数',
    nodes: '节点数',
    time: '时间',
    pv: '主要变例',
    engineLoaded: '引擎已加载',
    thinking: '思考中...',
    playBestMove: '走最佳着',
    undoMove: '悔棋',
    redAiOn: '红方电脑(开)',
    redAiOff: '红方电脑(关)',
    blackAiOn: '黑方电脑(开)',
    blackAiOff: '黑方电脑(关)',
    freeFlipMode: '自由翻子模式',
    darkPiecePool: '暗子池',
    engineAnalysis: '引擎分析',
    notation: '棋谱',
    opening: '开局',
    adjustment: '调整',
    engineLog: '引擎日志',
    about: '关于',
    flipBoard: '翻转棋盘',
    flipBoardBack: '恢复方向'
  },

  // 错误消息
  errors: {
    saveNotationFailed: '保存棋谱失败',
    openNotationFailed: '打开棋谱失败',
    engineNotLoaded: '引擎未加载，无法发送命令',
    engineSendUnavailable: '引擎send方法不可用',
    darkPiecesMismatch: '错误: {darkCount}暗子 > {poolCount}池',
    pieceCountExceeded: '错误: {pieceName} 总数超限!'
  },

  // 棋盘底部
  chessboard: {
    copyFen: '复制FEN',
    inputFen: '输入FEN',
    newGame: '新对局',
    copied: '✓ 已复制'
  },

  // 语言选择
  languages: {
    current: '当前语言',
    zh_cn: '简体中文',
    zh_tw: '繁體中文',
    en: 'English',
    vi: 'Tiếng Việt',
    ja: '日本語'
  },
  
  // 界面设置
  interfaceSettings: {
    title: '界面设置',
    showCoordinates: '显示行列序号',
    parseUciInfo: '解析UCI信息',
    showAnimations: '开启走子动画'
  },
  
  // UCI消息
  uci: {
    depth: '深度',
    seldepth: '选择深度',
    multipv: '多PV',
    score: '分数',
    mate: '绝杀',
    nodes: '节点数',
    nps: 'NPS',
    hashfull: 'Hash占用',
    tbhits: '库命中',
    time: '用时',
    pv: '主变',
    checkmate: '绝杀！无着可走',
    bestMove: '最佳着法: {move}',
    noMoves: '无着可走',
    engineReady: '引擎已就绪'
  },

  // 游戏操作确认
  gameConfirm: {
    clearHistoryTitle: '清空后续棋谱',
    clearHistoryMessage: '您正在历史局面中走子，这将清空后续的所有棋谱记录。确定要继续吗？',
    confirm: '确定',
    cancel: '取消'
  }
} 