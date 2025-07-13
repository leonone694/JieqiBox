export default {
  // Common
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    open: 'Open',
    refresh: 'Refresh',
    reset: 'Reset',
    clear: 'Clear',
    apply: 'Apply',
    execute: 'Execute',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info'
  },

  // Top toolbar
  toolbar: {
    newGame: 'New Game',
    copyFen: 'Copy FEN',
    inputFen: 'Input FEN',
    editPosition: 'Edit Position',
    uciSettings: 'UCI Settings',
    analysisParams: 'Analysis Parameters',
    saveNotation: 'Save Notation',
    openNotation: 'Open Notation',
    gameTitle: 'Jieqi Game',
    interfaceSettings: 'Interface Settings'
  },

  // UCI options dialog
  uciOptions: {
    title: 'UCI Engine Options Configuration',
    loadingText: 'Loading engine options...',
    noEngineLoaded: 'Please load engine first',
    noOptionsAvailable: 'No configurable UCI options available',
    refreshOptions: 'Refresh Options',
    range: 'Range',
    execute: 'Execute',
    resetToDefaults: 'Reset to Defaults',
    clearSettings: 'Clear Settings',
    confirmClearSettings: 'Are you sure you want to clear all UCI option configurations for the current engine? This action cannot be undone.',
    settingsCleared: 'UCI option configurations cleared'
  },

  // Time dialog
  timeDialog: {
    title: 'Engine Analysis Parameters Settings',
    movetime: 'Move Time (ms)',
    maxDepth: 'Max Depth',
    maxNodes: 'Max Nodes',
    analysisMode: 'Analysis Mode',
    resetToDefaults: 'Reset to Defaults',
    clearSettings: 'Clear Settings',
    confirmClearSettings: 'Are you sure you want to clear all analysis parameter configurations? This action cannot be undone.',
    settingsCleared: 'Analysis parameter configurations cleared',
    analysisModes: {
      movetime: 'Analyze by Time',
      depth: 'Analyze by Depth',
      nodes: 'Analyze by Nodes'
    }
  },

  // Position editor dialog
  positionEditor: {
    title: 'Position Editor',
    flipBoard: '🔄 Flip Board',
    switchSide: '⚡ Switch Side',
    resetPosition: '🔄 Reset Position',
    addPieces: 'Add Pieces',
    brightPieces: 'Bright Pieces',
    darkPieces: 'Dark Pieces',
    selectedPosition: 'Selected Position',
    piece: 'Piece',
    validationStatus: {
      normal: 'Normal',
      error: 'Error: Dark piece count mismatch'
    },
    cancel: 'Cancel',
    applyChanges: 'Apply Changes',
    pieces: {
      red_chariot: 'Red Chariot',
      red_horse: 'Red Horse',
      red_elephant: 'Red Elephant',
      red_advisor: 'Red Advisor',
      red_king: 'Red King',
      red_cannon: 'Red Cannon',
      red_pawn: 'Red Pawn',
      black_chariot: 'Black Chariot',
      black_horse: 'Black Horse',
      black_elephant: 'Black Elephant',
      black_advisor: 'Black Advisor',
      black_king: 'Black King',
      black_cannon: 'Black Cannon',
      black_pawn: 'Black Pawn',
      unknown: 'Dark Piece',
      red_unknown: 'Red Dark Piece',
      black_unknown: 'Black Dark Piece'
    }
  },

  // FEN input dialog
  fenInput: {
    title: 'Input FEN String',
    placeholder: 'Please input FEN string...',
    confirm: 'Confirm',
    cancel: 'Cancel'
  },

  // Flip prompt dialog
  flipPrompt: {
    title: 'Flip Piece Prompt',
    message: 'Please select the piece to flip',
    confirm: 'Confirm',
    cancel: 'Cancel'
  },

  // About dialog
  about: {
    title: 'About JieqiBox',
    version: 'Version',
    description: 'A modern Jieqi analysis and game desktop application built with Tauri and Vue 3.',
    features: 'Features',
    featuresList: [
      'Jieqi Game Support',
      'UCI Engine Analysis',
      'Notation Save and Load',
      'Position Editor',
      'FEN String Support'
    ],
    author: 'Author',
    license: 'License',
    github: 'GitHub',
    downloadLatest: 'Download Latest Version',
    viewLicense: 'View License Details'
  },

  // Analysis sidebar
  analysis: {
    title: 'Engine Analysis',
    startAnalysis: 'Start Analysis',
    stopAnalysis: 'Stop Analysis',
    engineNotLoaded: 'Engine Not Loaded',
    loadEngine: 'Load Engine',
    analysisResults: 'Analysis Results',
    bestMove: 'Best Move',
    score: 'Score',
    depth: 'Depth',
    nodes: 'Nodes',
    time: 'Time',
    pv: 'Principal Variation',
    engineLoaded: 'Engine Loaded',
    thinking: 'Thinking...',
    playBestMove: 'Play Best Move',
    undoMove: 'Undo Move',
    redAiOn: 'Red AI (On)',
    redAiOff: 'Red AI (Off)',
    blackAiOn: 'Black AI (On)',
    blackAiOff: 'Black AI (Off)',
    freeFlipMode: 'Free Flip Mode',
    darkPiecePool: 'Dark Piece Pool',
    engineAnalysis: 'Engine Analysis',
    notation: 'Notation',
    opening: 'Opening',
    adjustment: 'Adjustment',
    engineLog: 'Engine Log',
    about: 'About',
    flipBoard: 'Flip Board',
    flipBoardBack: 'Restore Orientation'
  },

  // Error messages
  errors: {
    saveNotationFailed: 'Failed to save notation',
    openNotationFailed: 'Failed to open notation',
    engineNotLoaded: 'Engine not loaded, cannot send command',
    engineSendUnavailable: 'Engine send method unavailable',
    darkPiecesMismatch: 'Error: {darkCount} dark pieces > {poolCount} pool',
    pieceCountExceeded: 'Error: {pieceName} total count exceeded!'
  },

  // Chessboard bottom
  chessboard: {
    copyFen: 'Copy FEN',
    inputFen: 'Input FEN',
    newGame: 'New Game',
    copied: '✓ Copied'
  },

  // Language selection
  languages: {
    current: 'Current Language',
    zh_cn: '简体中文',
    zh_tw: '繁體中文',
    en: 'English',
    vi: 'Tiếng Việt',
    ja: '日本語'
  },

  // Interface settings dialog
  interfaceSettings: {
    title: 'Interface Settings',
    showCoordinates: 'Show rank and file numbers',
    parseUciInfo: 'Parse UCI Info'
  },

  // UCI messages
  uci: {
    depth: 'Depth',
    seldepth: 'SelDepth',
    multipv: 'MultiPV',
    score: 'Score',
    mate: 'Mate',
    nodes: 'Nodes',
    nps: 'NPS',
    hashfull: 'HashFull',
    tbhits: 'TBHits',
    time: 'Time',
    pv: 'PV',
    checkmate: 'Checkmate! No moves available.',
    bestMove: 'Best Move: {move}',
    noMoves: 'No moves available',
    engineReady: 'Engine is ready'
  },

  // Game operation confirmation
  gameConfirm: {
    clearHistoryTitle: 'Clear Subsequent History',
    clearHistoryMessage: 'You are making a move in a historical position. This will clear all subsequent move history. Are you sure you want to continue?',
    confirm: 'Confirm',
    cancel: 'Cancel'
  }
} 