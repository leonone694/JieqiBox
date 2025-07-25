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
    delete: '删除'
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
    gameTitle: '揭棋对局',
    variation: '禁止当前着法',
    noMoreVariations: '已无更多可变的走法',
    darkMode: '暗黑模式',
    lightMode: '亮色模式',
  },

  // UCI选项对话框
  uciOptions: {
    title: 'UCI引擎选项',
    loadingText: '正在加载引擎选项...',
    noEngineLoaded: '当前未加载任何引擎。',
    pleaseLoadEngineFirst: '请先加载引擎以配置其选项。',
    loadEngine: '加载引擎',
    noOptionsAvailable: '该引擎无可用UCI选项。',
    refreshOptions: '刷新选项',
    range: '范围',
    execute: '执行',
    resetToDefaults: '恢复默认',
    clearSettings: '清除配置',
    confirmClearSettings:
      '确定要清除当前引擎的所有UCI选项配置吗？此操作不可恢复。',
    settingsCleared: '已清除UCI选项配置',
    // UCI选项说明
    optionDescriptions: {
      'Debug Log File': '输出的引擎与界面通信的调试文件。',
      Threads:
        '引擎搜索的线程数，推荐将其设置为系统可用的最大线程数减去1或2个线程。',
      Hash: '引擎的哈希表大小（单位MB），推荐将其设置为可用内存的最大值减去1或2 GiB的内存。',
      'Clear Hash': '清除哈希表。',
      MultiPV:
        '多主要变例，可以显示多个推荐的走法。推荐设置为1，如果设为大于1，最优着法的质量会下降，因为程序会将部分资源分配去计算其他可能的走法。',
      NumaPolicy:
        '将线程绑定到特定的NUMA节点以确保执行。在具有多个CPU或具有多个NUMA域的CPU的系统上提高性能。',
      Ponder: '让引擎在对手思考时进行后台思考。',
      'Move Overhead':
        '假设由于网络和GUI开销造成的x毫秒时间延迟。这在避免超时损失时很有用。',
      nodestime:
        '告诉引擎使用搜索的节点数而不是墙钟时间来计算经过的时间。对引擎测试很有用。',
      UCI_ShowWDL:
        '如果启用，在引擎输出中显示近似的WDL统计信息。这些WDL数字模拟了在给定评估和游戏层数下引擎自对弈的预期游戏结果。',
      EvalFile:
        'NNUE评估参数文件的名称。根据GUI的不同，文件名可能需要包含包含该文件的文件夹/目录的完整路径。',
    },
  },

  // 时间对话框
  timeDialog: {
    title: '引擎分析参数设置',
    movetime: '步时 (毫秒)',
    maxThinkTime: '最大思考时间 (毫秒)',
    maxDepth: '最大层数',
    maxNodes: '最大节点数',
    analysisMode: '分析模式',
    resetToDefaults: '恢复默认',
    clearSettings: '清除配置',
    confirmClearSettings: '确定要清除所有分析参数配置吗？此操作不可恢复。',
    settingsCleared: '已清除分析参数配置',
    analysisModes: {
      movetime: '按步时分析',
      maxThinkTime: '按最大思考时间分析',
      depth: '按层数分析',
      nodes: '按节点数分析',
    },
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
      error: '错误: 暗子数量不匹配',
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
      black_unknown: '黑暗子',
    },
  },

  // FEN输入对话框
  fenInput: {
    title: '输入FEN字符串',
    placeholder: '请输入FEN字符串...',
    confirm: '确认',
    cancel: '取消',
  },

  // 翻子提示对话框
  flipPrompt: {
    title: '翻子提示',
    message: '请选择要翻开的棋子',
    confirm: '确认',
    cancel: '取消',
  },

  // 关于对话框
  about: {
    title: '关于JieqiBox',
    version: '版本',
    description:
      '一个现代化的揭棋分析和对弈桌面应用程序，基于 Tauri 和 Vue 3 构建。',
    features: '功能特性',
    featuresList: [
      '揭棋对局支持',
      'UCI引擎分析',
      '棋谱保存和加载',
      '局面编辑',
      'FEN字符串支持',
    ],
    author: '作者',
    license: '许可证',
    github: 'GitHub',
    downloadLatest: '下载最新版本',
    viewLicense: '查看许可证详情',
  },

  // 分析侧边栏
  analysis: {
    title: '引擎分析',
    startAnalysis: '开始分析',
    stopAnalysis: '停止分析',
    engineNotLoaded: '引擎未加载',
    loadEngine: '加载引擎',
    loadEngineSaf: '加载引擎（SAF）',
    analysisResults: '分析结果',
    bestMove: '最佳着法',
    score: '评分',
    depth: '层数',
    nodes: '节点数',
    time: '时间',
    pv: '主要变例',
    engineLoaded: '引擎已加载',
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
    moveComments: '棋步注释',
    noComment: '无注释',
    enterComment: '输入注释...',
    saveComment: '保存',
    cancelComment: '取消',
    opening: '开局',
    adjustment: '调整',
    engineLog: '引擎日志',
    about: '关于',
    flipBoard: '翻转棋盘',
    flipBoardBack: '恢复方向',
    ponderMode: '后台思考',
    selectEngine: '选择引擎',
    manageEngines: '管理',
  },

  // 引擎管理器
  engineManager: {
    title: '引擎管理器',
    addEngine: '添加引擎',
    addEngineAndroid: '添加引擎 (SAF)',
    editEngine: '编辑引擎',
    engineName: '引擎名称',
    enginePath: '引擎路径',
    arguments: '命令行参数',
    actions: '操作',
    confirmDeleteTitle: '确认删除',
    confirmDeleteMessage: '您确定要删除引擎“{name}”吗？此操作无法撤销。',
    promptEngineName: '请输入引擎的唯一名称:',
    promptEngineArgs: '请输入引擎的命令行参数 (可选):',
    nameExists: '该名称已存在，请使用唯一的名称。',
    engineAddedSuccess: '引擎 {name} 添加成功!',
  },

  // 错误消息
  errors: {
    saveNotationFailed: '保存棋谱失败',
    openNotationFailed: '打开棋谱失败',
    engineNotLoaded: '引擎未加载，无法发送命令',
    engineSendUnavailable: '引擎send方法不可用',
    darkPiecesMismatch: '错误: {darkCount}暗子 > {poolCount}池',
    pieceCountExceeded: '错误: {pieceName} 总数超限!',
    engineLoadFailed: '加载引擎 {name} 失败: {error}',
  },

  // 棋盘底部
  chessboard: {
    copyFen: '复制FEN',
    pasteFen: '粘贴FEN',
    inputFen: '输入FEN',
    newGame: '新对局',
    copied: '✓ 已复制',
  },

  // 局势图
  evaluationChart: {
    title: '局势图',
    showMoveLabels: '显示着法标签',
    opening: '开局',
    noData: '暂无分析数据',
    newGame: '新对局',
    copied: '✓ 已复制',
  },

  // 语言选择
  languages: {
    current: '当前语言',
    zh_cn: '简体中文',
    zh_tw: '繁體中文',
    en: 'English',
    vi: 'Tiếng Việt',
    ja: '日本語',
  },

  // 界面设置
  interfaceSettings: {
    title: '界面设置',
    showCoordinates: '显示行列序号',
    parseUciInfo: '解析UCI信息',
    showAnimations: '开启走子动画',
    showPositionChart: '显示局势图',
    darkMode: '暗黑模式',
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
    engineReady: '引擎已就绪',
  },

  // 游戏操作确认
  gameConfirm: {
    clearHistoryTitle: '清空后续棋谱',
    clearHistoryMessage:
      '您正在历史局面中走子，这将清空后续的所有棋谱记录。确定要继续吗？',
    confirm: '确定',
    cancel: '取消',
  },
}
