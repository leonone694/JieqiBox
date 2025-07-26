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
    info: '情報',
    delete: '削除',
    required: 'この項目は必須です',
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
    interfaceSettings: 'インターフェース設定',
    gameTitle: '揭棋ゲーム',
    variation: '現在の手を禁止',
    noMoreVariations: 'これ以上の変化はありません',
    darkMode: 'ダークモード',
    lightMode: 'ライトモード',
  },

  // UCIオプションダイアログ
  uciOptions: {
    title: 'UCIエンジンオプション',
    loadingText: 'エンジンオプションを読み込み中...',
    noEngineLoaded: 'エンジンがロードされていません。',
    pleaseLoadEngineFirst:
      'エンジンのオプションを設定するには、まずエンジンを読み込んでください。',
    loadEngine: 'エンジンを読み込む',
    noOptionsAvailable: 'このエンジンには利用可能なUCIオプションがありません。',
    refreshOptions: 'オプションを更新',
    range: '範囲',
    execute: '実行',
    resetToDefaults: 'デフォルトに戻す',
    clearSettings: '設定をクリア',
    confirmClearSettings:
      '現在のエンジンのすべてのUCIオプション設定をクリアしますか？この操作は元に戻せません。',
    settingsCleared: 'UCIオプション設定をクリアしました',
    // UCIオプション説明
    optionDescriptions: {
      'Debug Log File': 'エンジンとGUIの通信内容を出力するデバッグファイル。',
      Threads:
        'エンジンが探索に使用するスレッド数。システムで利用可能な最大スレッド数から1または2を引いた値に設定することを推奨します。',
      Hash: 'エンジンのハッシュテーブルサイズ（単位：MB）。利用可能な最大メモリから1～2 GiBを差し引いた容量に設定することを推奨します。',
      'Clear Hash': 'ハッシュテーブルをクリアします。',
      MultiPV:
        '複数の推奨手を表示できる「マルチPV」。1に設定することを推奨します。1より大きい値に設定すると、他の候補手の計算にリソースが割かれるため、最善手の質が低下します。',
      NumaPolicy:
        'スレッドを特定のNUMAノードにバインドして実行を確実にします。複数のCPUや、複数のNUMAドメインを持つCPUを搭載したシステムでパフォーマンスを向上させます。',
      Ponder: '対局相手の思考中に、エンジンにバックグラウンドで思考させます。',
      'Move Overhead':
        'ネットワークやGUIのオーバーヘッドによって生じる遅延時間をxミリ秒と想定します。時間切れによる負けを防ぐのに役立ちます。',
      nodestime:
        '経過時間の計算に、実時間ではなく探索ノード数を使用するようエンジンに指示します。エンジンテストに役立ちます。',
      UCI_ShowWDL:
        '有効にすると、エンジンの出力にWDL（勝ち-引き分け-負け）の概算統計情報を表示します。これらのWDL値は、与えられた評価値と探索深度における、エンジンの自己対局での期待されるゲーム結果をシミュレートしたものです。',
      EvalFile:
        'NNUE評価パラメータファイルの名前。GUIによっては、ファイル名にそのファイルを含むフォルダやディレクトリへのフルパスを含める必要がある場合があります。',
    },
  },

  // 時間ダイアログ
  timeDialog: {
    title: 'エンジン解析パラメータ設定',
    movetime: '手の時間 (ミリ秒)',
    maxThinkTime: '最大思考時間 (ミリ秒)',
    maxDepth: '最大深さ',
    maxNodes: '最大ノード数',
    analysisMode: '解析モード',
    resetToDefaults: 'デフォルトに戻す',
    clearSettings: '設定をクリア',
    confirmClearSettings:
      'すべての解析パラメータ設定をクリアしますか？この操作は元に戻せません。',
    settingsCleared: '解析パラメータ設定をクリアしました',
    analysisModes: {
      movetime: '手の時間による解析',
      maxThinkTime: '最大思考時間による解析',
      depth: '深さによる解析',
      nodes: 'ノード数による解析',
    },
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
      error: 'エラー: 暗子の数が一致しません',
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
      black_unknown: '黒暗子',
    },
  },

  // FEN入力ダイアログ
  fenInput: {
    title: 'FEN文字列を入力',
    placeholder: 'FEN文字列を入力してください...',
    confirm: '確認',
    cancel: 'キャンセル',
  },

  // 駒をめくるプロンプトダイアログ
  flipPrompt: {
    title: '駒をめくるプロンプト',
    message: 'めくる駒を選択してください',
    confirm: '確認',
    cancel: 'キャンセル',
  },

  // についてダイアログ
  about: {
    title: 'JieqiBoxについて',
    version: 'バージョン',
    description:
      'TauriとVue 3で構築された現代的な揭棋解析とゲームデスクトップアプリケーション。',
    features: '機能',
    featuresList: [
      '揭棋ゲームサポート',
      'UCIエンジン解析',
      '棋譜の保存と読み込み',
      '局面編集',
      'FEN文字列サポート',
    ],
    author: '作者',
    license: 'ライセンス',
    github: 'GitHub',
    downloadLatest: '最新バージョンをダウンロード',
    viewLicense: 'ライセンス詳細を表示',
  },

  // 解析サイドバー
  analysis: {
    title: 'エンジン解析',
    startAnalysis: '解析開始',
    stopAnalysis: '解析停止',
    engineNotLoaded: 'エンジンが読み込まれていません',
    loadEngine: 'エンジンを読み込み',
    loadEngineSaf: 'エンジン読み込み（SAF）',
    analysisResults: '解析結果',
    bestMove: '最善手',
    score: '評価値',
    depth: '深さ',
    nodes: 'ノード数',
    time: '時間',
    pv: '主な変化',
    engineLoaded: 'エンジン読み込み済み',
    playBestMove: '最善手を指す',
    undoMove: '一手戻す',
    redAiOn: '赤AI(オン)',
    redAiOff: '赤AI(オフ)',
    blackAiOn: '黒AI(オン)',
    blackAiOff: '黒AI(オフ)',
    freeFlipMode: '自由めくりモード',
    darkPiecePool: '暗子プール',
    engineAnalysis: 'エンジン解析',
    notation: '棋譜',
    moveComments: '手のコメント',
    noComment: 'コメントなし',
    enterComment: 'コメントを入力...',
    saveComment: '保存',
    cancelComment: 'キャンセル',
    opening: '開局',
    adjustment: '調整',
    engineLog: 'エンジンログ',
    about: 'について',
    flipBoard: '盤を反転',
    flipBoardBack: '向きを復元',
    ponderMode: 'ポンダーモード',
    unloadEngine: 'エンジンをアンロード',
    noEngineLoaded: '現在、エンジンは読み込まれていません。',
  },

  // エンジンマネージャー
  engineManager: {
    title: 'エンジンマネージャー',
    addEngine: 'エンジンを追加',
    addEngineAndroid: 'エンジンを追加 (SAF)',
    editEngine: 'エンジンを編集',
    engineName: 'エンジン名',
    enginePath: 'エンジンパス',
    arguments: 'コマンドライン引数',
    actions: '操作',
    confirmDeleteTitle: '削除の確認',
    confirmDeleteMessage:
      'エンジン「{name}」を本当に削除しますか？この操作は元に戻せません。',
    promptEngineName: 'エンジンの一意な名前を入力してください：',
    promptEngineArgs:
      'エンジンのコマンドライン引数を入力してください（任意）：',
    nameExists:
      'この名前は既に使用されています。別の一意な名前を使用してください。',
    engineAddedSuccess: 'エンジン{name}が正常に追加されました！',
  },

  // エラーメッセージ
  errors: {
    saveNotationFailed: '棋譜の保存に失敗しました',
    openNotationFailed: '棋譜の読み込みに失敗しました',
    engineNotLoaded:
      'エンジンが読み込まれていないため、コマンドを送信できません',
    engineSendUnavailable: 'エンジンのsendメソッドが利用できません',
    darkPiecesMismatch: 'エラー: {darkCount}暗子 > {poolCount}池',
    pieceCountExceeded: 'エラー: {pieceName} 総数超過!',
    engineUnloadFailed: 'エンジンのアンロードに失敗しました',
    failedToOpenFileSelector:
      'ファイル選択ダイアログを開くことができませんでした',
    failedToProcessEngine: 'エンジンファイルの処理に失敗しました',
  },

  // 盤下部
  chessboard: {
    copyFen: 'FENをコピー',
    pasteFen: 'FENを貼り付け',
    inputFen: 'FENを入力',
    newGame: '新しいゲーム',
    copied: '✓ コピーしました',
  },

  // 形勢グラフ
  evaluationChart: {
    title: '形勢グラフ',
    showMoveLabels: '手のラベルを表示',
    opening: '開始局面',
    noData: '分析データがありません',
    newGame: '新しいゲーム',
    copied: '✓ コピーしました',
  },

  // 言語選択
  languages: {
    current: '現在の言語',
    zh_cn: '简体中文',
    zh_tw: '繁體中文',
    en: 'English',
    vi: 'Tiếng Việt',
    ja: '日本語',
  },

  // インターフェース設定
  interfaceSettings: {
    title: 'インターフェース設定',
    showCoordinates: '行と列の番号を表示',
    parseUciInfo: 'UCI情報を解析',
    showAnimations: '駒の動きのアニメーションを有効にする',
    showPositionChart: '形勢グラフを表示',
    darkMode: 'ダークモード',
  },

  // UCIメッセージ
  uci: {
    depth: '深さ',
    seldepth: '選択深さ',
    multipv: 'マルチPV',
    score: 'スコア',
    mate: '詰み',
    nodes: 'ノード',
    nps: 'NPS',
    hashfull: 'ハッシュ使用率',
    tbhits: 'テーブルベースヒット',
    time: '時間',
    pv: '主変化',
    checkmate: 'チェックメイト！利用可能な動きがありません。',
    bestMove: '最善手: {move}',
    noMoves: '利用可能な動きがありません',
    engineReady: 'エンジンは準備ができました',
  },

  // ゲーム操作確認
  gameConfirm: {
    clearHistoryTitle: '後続の棋譜をクリア',
    clearHistoryMessage:
      '履歴局面で手を指しています。これにより、後続のすべての棋譜記録がクリアされます。続行しますか？',
    confirm: '確認',
    cancel: 'キャンセル',
  },
}
