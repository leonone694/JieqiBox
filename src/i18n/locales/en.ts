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
    info: 'Info',
    delete: 'Delete',
    required: 'This field is required',
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
    interfaceSettings: 'Interface Settings',
    variation: 'Forbid Current Move',
    noMoreVariations: 'No more variations available',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
  },

  // UCI options dialog
  uciOptions: {
    title: 'UCI Engine Options',
    loadingText: 'Loading engine options...',
    noEngineLoaded: 'No engine is currently loaded.',
    pleaseLoadEngineFirst:
      'Please load an engine first to configure its options.',
    loadEngine: 'Load Engine',
    noOptionsAvailable: 'No UCI options available for this engine.',
    refreshOptions: 'Refresh Options',
    range: 'Range',
    execute: 'Execute',
    resetToDefaults: 'Reset to Defaults',
    clearSettings: 'Clear Settings',
    confirmClearSettings:
      'Are you sure you want to clear all UCI option configurations for the current engine? This action cannot be undone.',
    settingsCleared: 'UCI option configurations cleared',
    // UCI option descriptions
    optionDescriptions: {
      'Debug Log File':
        'The debug file that records communication between the engine and the GUI.',
      Threads:
        'Number of threads used for engine search. It is recommended to set this to the number of available system threads minus one or two.',
      Hash: "Engine's hash table size (in MB). It is recommended to set this value to the total available memory minus 1 to 2 GiB.",
      'Clear Hash': 'Clears the hash table.',
      MultiPV:
        'Multi-Principal Variation. Allows the engine to show multiple recommended moves. It is recommended to set this to 1. If set higher, the quality of the best move may decrease because resources will be allocated to evaluating alternative lines.',
      NumaPolicy:
        'Binds threads to specific NUMA nodes to ensure execution. Improves performance on systems with multiple CPUs or CPUs with multiple NUMA domains.',
      Ponder: 'Allows the engine to think during the opponent’s turn.',
      'Move Overhead':
        'Assumes an x-millisecond delay due to network and GUI overhead. Useful for avoiding time losses due to delays.',
      nodestime:
        'Instructs the engine to use the number of searched nodes instead of wall clock time to calculate elapsed time. Useful for engine testing.',
      UCI_ShowWDL:
        'If enabled, displays approximate WDL (Win/Draw/Loss) statistics in the engine output. These WDL numbers estimate expected outcomes based on evaluation and depth from self-play simulations.',
      EvalFile:
        'The name of the NNUE evaluation parameter file. Depending on the GUI, the filename may need to include the full path to the folder containing the file.',
    },
  },

  // Time dialog
  timeDialog: {
    title: 'Engine Analysis Parameters Settings',
    movetime: 'Move Time (ms)',
    maxThinkTime: 'Max Think Time (ms)',
    maxDepth: 'Max Depth',
    maxNodes: 'Max Nodes',
    analysisMode: 'Analysis Mode',
    resetToDefaults: 'Reset to Defaults',
    clearSettings: 'Clear Settings',
    confirmClearSettings:
      'Are you sure you want to clear all analysis parameter configurations? This action cannot be undone.',
    settingsCleared: 'Analysis parameter configurations cleared',
    analysisModes: {
      movetime: 'Analyze by Move Time',
      maxThinkTime: 'Analyze by Max Think Time',
      depth: 'Analyze by Depth',
      nodes: 'Analyze by Nodes',
    },
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
      error: 'Error: Dark piece count mismatch',
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
      black_unknown: 'Black Dark Piece',
    },
  },

  // FEN input dialog
  fenInput: {
    title: 'Input FEN String',
    placeholder: 'Please input FEN string...',
    confirm: 'Confirm',
    cancel: 'Cancel',
  },

  // Flip prompt dialog
  flipPrompt: {
    title: 'Flip Piece Prompt',
    message: 'Please select the piece to flip',
    confirm: 'Confirm',
    cancel: 'Cancel',
  },

  // About dialog
  about: {
    title: 'About JieqiBox',
    version: 'Version',
    description:
      'A modern Jieqi analysis and game desktop application built with Tauri and Vue 3.',
    features: 'Features',
    featuresList: [
      'Jieqi Game Support',
      'UCI Engine Analysis',
      'Notation Save and Load',
      'Position Editor',
      'FEN String Support',
    ],
    author: 'Author',
    license: 'License',
    github: 'GitHub',
    downloadLatest: 'Download Latest Version',
    viewLicense: 'View License Details',
  },

  // Analysis related
  analysis: {
    title: 'Engine Analysis',
    startAnalysis: 'Start Analysis',
    stopAnalysis: 'Stop Analysis',
    engineNotLoaded: 'Engine Not Loaded',
    loadEngine: 'Load Engine',
    loadEngineSaf: 'Load Engine (SAF)',
    analysisResults: 'Analysis Results',
    bestMove: 'Best Move',
    score: 'Score',
    depth: 'Depth',
    nodes: 'Nodes',
    time: 'Time',
    pv: 'Principal Variation',
    engineLoaded: 'Engine Loaded',
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
    moveComments: 'Move Comments',
    noComment: 'No comment',
    enterComment: 'Enter comment...',
    saveComment: 'Save',
    cancelComment: 'Cancel',
    opening: 'Opening',
    adjustment: 'Adjustment',
    engineLog: 'Engine Log',
    about: 'About',
    undockPanel: 'Undock Panel',
    dockPanel: 'Dock Panel',
    restorePanels: 'Restore Panels Layout',
    flipBoard: 'Flip Board',
    flipBoardBack: 'Restore Orientation',
    ponderMode: 'Ponder Mode',
    selectEngine: 'Select Engine',
    manageEngines: 'Manage',
    unloadEngine: 'Unload Engine',
    noEngineLoaded: 'No engine is currently loaded.',
  },

  // Engine Manager
  engineManager: {
    title: 'Engine Manager',
    addEngine: 'Add Engine',
    addEngineAndroid: 'Add Engine (SAF)',
    editEngine: 'Edit Engine',
    engineName: 'Engine Name',
    enginePath: 'Engine Path',
    arguments: 'Command-line Arguments',
    actions: 'Actions',
    confirmDeleteTitle: 'Confirm Deletion',
    confirmDeleteMessage:
      'Are you sure you want to delete the engine "{name}"? This action cannot be undone.',
    promptEngineName: 'Please enter a unique name for the engine:',
    promptEngineArgs:
      'Please enter command-line arguments for the engine (optional):',
    nameExists: 'This name already exists. Please use a unique name.',
    engineAddedSuccess: 'Engine {name} was added successfully!',
  },

  // Error messages
  errors: {
    saveNotationFailed: 'Failed to save notation',
    openNotationFailed: 'Failed to open notation',
    engineNotLoaded: 'Engine not loaded, cannot send command',
    engineSendUnavailable: 'Engine send method unavailable',
    darkPiecesMismatch: 'Error: {darkCount} dark pieces > {poolCount} pool',
    pieceCountExceeded: 'Error: {pieceName} total count exceeded!',
    engineLoadFailed: 'Failed to load engine {name}: {error}',
    engineUnloadFailed: 'Failed to unload engine',
    failedToOpenFileSelector: 'Failed to open file selector',
    failedToProcessEngine: 'Failed to process engine file',
  },

  // Chessboard bottom
  chessboard: {
    copyFen: 'Copy FEN',
    pasteFen: 'Paste FEN',
    inputFen: 'Input FEN',
    newGame: 'New Game',
    copied: '✓ Copied',
  },

  // Evaluation Chart
  evaluationChart: {
    title: 'Evaluation Chart',
    showMoveLabels: 'Show Move Labels',
    opening: 'Opening',
    noData: 'No analysis data available',
    newGame: 'New Game',
    copied: '✓ Copied',
  },

  // Language selection
  languages: {
    current: 'Current Language',
    zh_cn: '简体中文',
    zh_tw: '繁體中文',
    en: 'English',
    vi: 'Tiếng Việt',
    ja: '日本語',
  },

  // Interface settings dialog
  interfaceSettings: {
    title: 'Interface Settings',
    showCoordinates: 'Show rank and file numbers',
    parseUciInfo: 'Parse UCI Info',
    showAnimations: 'Enable move animations',
    showPositionChart: 'Show evaluation chart',
    darkMode: 'Dark Mode',
    autosave: 'Auto-save game to Autosave.json',
    useNewFenFormat: 'Use New FEN Format',
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
    engineReady: 'Engine is ready',
  },

  // Game operation confirmation
  gameConfirm: {
    clearHistoryTitle: 'Clear Subsequent History',
    clearHistoryMessage:
      'You are making a move in a historical position. This will clear all subsequent move history. Are you sure you want to continue?',
    confirm: 'Confirm',
    cancel: 'Cancel',
  },
}
