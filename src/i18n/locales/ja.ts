export default {
  // 共通
  common: {
    confirm: '確認',
    cancel: 'キャンセル',
    close: '閉じる',
    save: '保存',
    open: '開く',
    refresh: '更新',
    reset: 'リセット',
    clear: 'クリア',
    apply: '適用',
    execute: '実行',
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功',
    warning: '警告',
    info: '情報'
  },

  // 上部ツールバー
  toolbar: {
    newGame: '新しいゲーム',
    copyFen: 'FENをコピー',
    inputFen: 'FENを入力',
    editPosition: '局面を編集',
    uciSettings: 'UCI設定',
    analysisParams: '解析パラメータ',
    saveNotation: '棋譜を保存',
    openNotation: '棋譜を開く',
    gameTitle: '揭棋ゲーム'
  },

  // UCIオプションダイアログ
  uciOptions: {
    title: 'UCIエンジンオプション設定',
    loadingText: 'エンジンオプションを読み込み中...',
    noEngineLoaded: '先にエンジンを読み込んでください',
    noOptionsAvailable: '設定可能なUCIオプションがありません',
    refreshOptions: 'オプションを更新',
    range: '範囲',
    execute: '実行',
    resetToDefaults: 'デフォルトに戻す',
    clearSettings: '設定をクリア',
    confirmClearSettings: '現在のエンジンのすべてのUCIオプション設定をクリアしますか？この操作は元に戻せません。',
    settingsCleared: 'UCIオプション設定をクリアしました'
  },

  // 時間ダイアログ
  timeDialog: {
    title: 'エンジン解析パラメータ設定',
    movetime: '手の時間 (ミリ秒)',
    maxDepth: '最大深さ',
    maxNodes: '最大ノード数',
    analysisMode: '解析モード',
    resetToDefaults: 'デフォルトに戻す',
    clearSettings: '設定をクリア',
    confirmClearSettings: 'すべての解析パラメータ設定をクリアしますか？この操作は元に戻せません。',
    settingsCleared: '解析パラメータ設定をクリアしました',
    analysisModes: {
      movetime: '時間による解析',
      depth: '深さによる解析',
      nodes: 'ノード数による解析'
    }
  },

  // 局面編集ダイアログ
  positionEditor: {
    title: '局面編集',
    flipBoard: '🔄 盤を反転',
    switchSide: '⚡ 手番を切り替え',
    resetPosition: '🔄 局面をリセット',
    addPieces: '駒を追加',
    brightPieces: '明子',
    darkPieces: '暗子',
    selectedPosition: '選択された位置',
    piece: '駒',
    validationStatus: {
      normal: '正常',
      error: 'エラー: 暗子の数が一致しません'
    },
    cancel: 'キャンセル',
    applyChanges: '変更を適用',
    pieces: {
      red_chariot: '赤車',
      red_horse: '赤馬',
      red_elephant: '赤象',
      red_advisor: '赤士',
      red_king: '赤帥',
      red_cannon: '赤砲',
      red_pawn: '赤兵',
      black_chariot: '黒車',
      black_horse: '黒馬',
      black_elephant: '黒象',
      black_advisor: '黒士',
      black_king: '黒将',
      black_cannon: '黒砲',
      black_pawn: '黒卒',
      unknown: '暗子',
      red_unknown: '赤暗子',
      black_unknown: '黒暗子'
    }
  },

  // FEN入力ダイアログ
  fenInput: {
    title: 'FEN文字列を入力',
    placeholder: 'FEN文字列を入力してください...',
    confirm: '確認',
    cancel: 'キャンセル'
  },

  // 駒をめくるプロンプトダイアログ
  flipPrompt: {
    title: '駒をめくるプロンプト',
    message: 'めくる駒を選択してください',
    confirm: '確認',
    cancel: 'キャンセル'
  },

  // についてダイアログ
  about: {
    title: 'JieqiBoxについて',
    version: 'バージョン',
    description: 'TauriとVue 3で構築された現代的な揭棋解析とゲームデスクトップアプリケーション。',
    features: '機能',
    featuresList: [
      '揭棋ゲームサポート',
      'UCIエンジン解析',
      '棋譜の保存と読み込み',
      '局面編集',
      'FEN文字列サポート'
    ],
    author: '作者',
    license: 'ライセンス',
    github: 'GitHub',
    downloadLatest: '最新バージョンをダウンロード',
    viewLicense: 'ライセンス詳細を表示'
  },

  // 解析サイドバー
  analysis: {
    title: 'エンジン解析',
    startAnalysis: '解析開始',
    stopAnalysis: '解析停止',
    engineNotLoaded: 'エンジンが読み込まれていません',
    loadEngine: 'エンジンを読み込み',
    analysisResults: '解析結果',
    bestMove: '最善手',
    score: '評価値',
    depth: '深さ',
    nodes: 'ノード数',
    time: '時間',
    pv: '主な変化',
    engineLoaded: 'エンジン読み込み済み',
    thinking: '思考中...',
    playBestMove: '最善手を指す',
    redAiOn: '赤AI(オン)',
    redAiOff: '赤AI(オフ)',
    blackAiOn: '黒AI(オン)',
    blackAiOff: '黒AI(オフ)',
    freeFlipMode: '自由めくりモード',
    darkPiecePool: '暗子プール',
    engineAnalysis: 'エンジン解析',
    notation: '棋譜',
    opening: '開局',
    adjustment: '調整',
    engineLog: 'エンジンログ',
    about: 'について',
    flipBoard: '盤を反転',
    flipBoardBack: '向きを復元'
  },

  // エラーメッセージ
  errors: {
    saveNotationFailed: '棋譜の保存に失敗しました',
    openNotationFailed: '棋譜の読み込みに失敗しました',
    engineNotLoaded: 'エンジンが読み込まれていないため、コマンドを送信できません',
    engineSendUnavailable: 'エンジンのsendメソッドが利用できません',
    darkPiecesMismatch: 'エラー: {darkCount}暗子 > {poolCount}池',
    pieceCountExceeded: 'エラー: {pieceName} 総数超過!'
  },

  // 盤下部
  chessboard: {
    copyFen: 'FENをコピー',
    inputFen: 'FENを入力',
    newGame: '新しいゲーム',
    copied: '✓ コピーしました'
  },

  // 言語選択
  languages: {
    current: '現在の言語',
    zh_cn: '简体中文',
    zh_tw: '繁體中文',
    en: 'English',
    vi: 'Tiếng Việt',
    ja: '日本語'
  }
} 