export default {
  // Chung
  common: {
    confirm: 'Xác nhận',
    cancel: 'Hủy',
    close: 'Đóng',
    save: 'Lưu',
    open: 'Mở',
    refresh: 'Làm mới',
    reset: 'Đặt lại',
    clear: 'Xóa',
    apply: 'Áp dụng',
    execute: 'Thực hiện',
    loading: 'Đang tải...',
    error: 'Lỗi',
    success: 'Thành công',
    warning: 'Cảnh báo',
    info: 'Thông tin',
    delete: 'Xóa',
    required: 'Trường này là bắt buộc',
  },

  // Thanh công cụ trên cùng
  toolbar: {
    newGame: 'Ván mới',
    copyFen: 'Sao chép FEN',
    inputFen: 'Nhập FEN',
    editPosition: 'Chỉnh sửa vị trí',
    uciSettings: 'Cài đặt UCI',
    analysisParams: 'Tham số phân tích',
    saveNotation: 'Lưu biên bản',
    openNotation: 'Mở biên bản',
    gameTitle: 'Ván Cờ úp',
    interfaceSettings: 'Cài đặt giao diện',
    variation: 'Cấm nước đi hiện tại',
    noMoreVariations: 'Không còn biến thể nào khả dụng',
    darkMode: 'Chế độ tối',
    lightMode: 'Chế độ sáng',
  },

  // Hộp thoại tùy chọn UCI
  uciOptions: {
    title: 'Tùy chọn engine UCI',
    loadingText: 'Đang tải tùy chọn engine...',
    noEngineLoaded: 'Chưa có engine nào được tải.',
    pleaseLoadEngineFirst:
      'Vui lòng tải engine trước để cấu hình các tùy chọn của nó.',
    loadEngine: 'Tải engine',
    noOptionsAvailable: 'Không có tùy chọn UCI nào cho engine này.',
    refreshOptions: 'Làm mới tùy chọn',
    range: 'Phạm vi',
    execute: 'Thực hiện',
    resetToDefaults: 'Đặt lại mặc định',
    clearSettings: 'Xóa cài đặt',
    confirmClearSettings:
      'Bạn có chắc chắn muốn xóa tất cả cấu hình tùy chọn UCI cho động cơ hiện tại không? Hành động này không thể hoàn tác.',
    settingsCleared: 'Đã xóa cấu hình tùy chọn UCI',
    // Mô tả tùy chọn UCI
    optionDescriptions: {
      'Debug Log File':
        'Tệp gỡ lỗi để ghi lại giao tiếp giữa engine và giao diện.',
      Threads:
        'Số luồng tìm kiếm của engine. Khuyến nghị đặt thành số luồng tối đa có sẵn của hệ thống trừ đi 1 hoặc 2 luồng.',
      Hash: 'Kích thước bảng băm của engine (đơn vị: MB). Khuyến nghị đặt giá trị này bằng tổng bộ nhớ khả dụng trừ đi 1 hoặc 2 GiB.',
      'Clear Hash': 'Xóa bảng băm.',
      MultiPV:
        'Đa biến thể chính, có thể hiển thị nhiều nước đi được đề xuất. Khuyến nghị đặt là 1. Nếu đặt lớn hơn 1, chất lượng của nước đi tốt nhất sẽ giảm, vì chương trình sẽ phân bổ một phần tài nguyên để tính toán các nước đi khả dĩ khác.',
      NumaPolicy:
        'Gán các luồng vào các nút NUMA cụ thể để đảm bảo việc thực thi. Cải thiện hiệu suất trên các hệ thống có nhiều CPU hoặc CPU có nhiều miền NUMA.',
      Ponder:
        'Cho phép engine suy nghĩ trong nền trong khi đối thủ đang suy nghĩ.',
      'Move Overhead':
        'Giả định độ trễ thời gian là x mili giây do chi phí mạng và GUI. Hữu ích trong việc tránh thua do hết giờ.',
      nodestime:
        'Yêu cầu engine sử dụng số lượng nút đã tìm kiếm thay vì thời gian thực để tính toán thời gian đã trôi qua. Hữu ích cho việc kiểm tra engine.',
      UCI_ShowWDL:
        'Nếu được bật, sẽ hiển thị thống kê WDL (Thắng-Hòa-Thua) gần đúng trong đầu ra của engine. Những con số WDL này mô phỏng kết quả ván cờ dự kiến khi engine tự đấu với chính nó ở một mức đánh giá và độ sâu nhất định.',
      EvalFile:
        'Tên của tệp tham số đánh giá NNUE. Tùy thuộc vào GUI, tên tệp có thể cần bao gồm đường dẫn đầy đủ đến thư mục chứa tệp.',
    },
  },

  // Hộp thoại thời gian
  timeDialog: {
    title: 'Cài đặt tham số phân tích engine',
    movetime: 'Thời gian nước đi (ms)',
    maxThinkTime: 'Thời gian suy nghĩ tối đa (ms)',
    maxDepth: 'Độ sâu tối đa',
    maxNodes: 'Số nút tối đa',
    analysisMode: 'Chế độ phân tích',
    resetToDefaults: 'Đặt lại mặc định',
    clearSettings: 'Xóa cài đặt',
    confirmClearSettings:
      'Bạn có chắc chắn muốn xóa tất cả cấu hình tham số phân tích không? Hành động này không thể hoàn tác.',
    settingsCleared: 'Đã xóa cấu hình tham số phân tích',
    analysisModes: {
      movetime: 'Phân tích theo thời gian nước đi',
      maxThinkTime: 'Phân tích theo thời gian suy nghĩ tối đa',
      depth: 'Phân tích theo độ sâu',
      nodes: 'Phân tích theo số nút',
    },
  },

  // Hộp thoại chỉnh sửa vị trí
  positionEditor: {
    title: 'Chỉnh sửa vị trí',
    flipBoard: '🔄 Lật bàn cờ',
    switchSide: '⚡ Chuyển bên',
    resetPosition: '🔄 Đặt lại vị trí',
    clearPosition: '🔄 Xóa vị trí',
    addPieces: 'Thêm quân cờ',
    brightPieces: 'Quân cờ sáng',
    darkPieces: 'Quân úp',
    selectedPosition: 'Vị trí đã chọn',
    selectedPiece: 'Quân cờ đã chọn',
    clickToPlace: 'Nhấp vị trí để đặt',
    piece: 'Quân cờ',
    currentSide: 'Bên hiện tại',
    redToMove: 'Đỏ đi',
    blackToMove: 'Đen đi',
    validationStatus: {
      normal: 'Bình thường',
      error: 'Lỗi: Số lượng quân úp không khớp',
      noRedKing: 'Lỗi: Không có tướng đỏ',
      noBlackKing: 'Lỗi: Không có tướng đen',
      kingOutOfPalace: 'Lỗi: Tướng ngoài cung',
      kingFacing: 'Lỗi: Hai tướng đối mặt',
      inCheck: 'Lỗi: Bên đi bị chiếu',
      tooManyPieces: 'Lỗi: Quá nhiều quân loại này',
      tooManyTotalPieces: 'Lỗi: Tổng số quân vượt quá 16',
      darkPieceInvalidPosition: 'Lỗi: Quân úp ở vị trí không hợp lệ',
      duplicatePosition: 'Lỗi: Vị trí quân trùng lặp',
    },
    cancel: 'Hủy',
    applyChanges: 'Áp dụng thay đổi',
    pieces: {
      red_chariot: 'Xe đỏ',
      red_horse: 'Mã đỏ',
      red_elephant: 'Tượng đỏ',
      red_advisor: 'Sĩ đỏ',
      red_king: 'Tướng đỏ',
      red_cannon: 'Pháo đỏ',
      red_pawn: 'Tốt đỏ',
      black_chariot: 'Xe đen',
      black_horse: 'Mã đen',
      black_elephant: 'Tượng đen',
      black_advisor: 'Sĩ đen',
      black_king: 'Tướng đen',
      black_cannon: 'Pháo đen',
      black_pawn: 'Tốt đen',
      unknown: 'Quân úp',
      red_unknown: 'Quân úp đỏ',
      black_unknown: 'Quân úp đen',
    },
  },

  // Hộp thoại nhập FEN
  fenInput: {
    title: 'Nhập chuỗi FEN',
    placeholder: 'Vui lòng nhập chuỗi FEN...',
    confirm: 'Xác nhận',
    cancel: 'Hủy',
  },

  // Hộp thoại nhắc lật quân
  flipPrompt: {
    title: 'Nhắc lật quân',
    message: 'Vui lòng chọn quân cờ để lật',
    confirm: 'Xác nhận',
    cancel: 'Hủy',
  },

  // Hộp thoại về
  about: {
    title: 'Về JieqiBox',
    version: 'Phiên bản',
    description:
      'Một ứng dụng desktop phân tích và chơi Cờ úp hiện đại được xây dựng với Tauri và Vue 3.',
    author: 'Tác giả',
    license: 'Giấy phép',
    github: 'GitHub',
    downloadLatest: 'Tải xuống phiên bản mới nhất',
    viewLicense: 'Xem chi tiết giấy phép',
  },

  // Thanh bên phân tích
  analysis: {
    title: 'Phân tích engine',
    startAnalysis: 'Bắt đầu phân tích',
    stopAnalysis: 'Dừng phân tích',
    engineNotLoaded: 'Chưa tải engine',
    loadEngine: 'Tải engine',
    loadEngineSaf: 'Tải engine (SAF)',
    analysisResults: 'Kết quả phân tích',
    bestMove: 'Nước đi tốt nhất',
    score: 'Điểm số',
    depth: 'Độ sâu',
    nodes: 'Số nút',
    time: 'Thời gian',
    pv: 'Biến chính',
    engineLoaded: 'Đã tải động cơ',
    playBestMove: 'Đi nước tốt nhất',
    undoMove: 'Lùi một nước',
    redAiOn: 'AI Đỏ (Bật)',
    redAiOff: 'AI Đỏ (Tắt)',
    blackAiOn: 'AI Đen (Bật)',
    blackAiOff: 'AI Đen (Tắt)',
    freeFlipMode: 'Chế độ lật tự do',
    darkPiecePool: 'Kho quân úp',
    engineAnalysis: 'Phân tích engine',
    notation: 'Biên bản',
    moveComments: 'Ghi chú nước đi',
    noComment: 'Không có ghi chú',
    enterComment: 'Nhập ghi chú...',
    saveComment: 'Lưu',
    cancelComment: 'Hủy',
    opening: 'Khai cuộc',
    adjustment: 'Điều chỉnh',
    engineLog: 'Nhật ký engine',
    about: 'Về',
    undockPanel: 'Tách panel',
    dockPanel: 'Ghép panel',
    restorePanels: 'Khôi phục bố cục panel',
    flipBoard: 'Lật bàn cờ',
    flipBoardBack: 'Khôi phục hướng',
    ponderMode: 'Chế độ suy nghĩ nền',
    selectEngine: 'Chọn engine',
    manageEngines: 'Quản lý',
    unloadEngine: 'Gỡ bỏ engine',
    noEngineLoaded: 'Hiện tại chưa có engine nào được tải.',
    // Nút điều hướng
    goToFirst: 'Đi đến nước đầu tiên',
    goToPrevious: 'Đi đến nước trước',
    goToNext: 'Đi đến nước tiếp theo',
    goToLast: 'Đi đến nước cuối cùng',
    play: 'Phát',
    pause: 'Tạm dừng',
  },

  // Trình quản lý Engine
  engineManager: {
    title: 'Trình quản lý Engine',
    addEngine: 'Thêm Engine',
    addEngineAndroid: 'Thêm Engine (SAF)',
    editEngine: 'Chỉnh sửa Engine',
    engineName: 'Tên Engine',
    enginePath: 'Đường dẫn Engine',
    arguments: 'Tham số dòng lệnh',
    actions: 'Hành động',
    confirmDeleteTitle: 'Xác nhận xóa',
    confirmDeleteMessage:
      'Bạn có chắc muốn xóa engine "{name}" không? Hành động này không thể hoàn tác.',
    promptEngineName: 'Vui lòng nhập tên duy nhất cho engine:',
    promptEngineArgs:
      'Vui lòng nhập tham số dòng lệnh cho engine (tùy chọn, để trống nếu không biết):',
    promptHasNnue: 'Engine này có sử dụng file NNUE không? (y/n):',
    promptNnueFile: 'Vui lòng chọn file NNUE cho engine:',
    nameExists: 'Tên này đã tồn tại. Vui lòng sử dụng một tên khác.',
    engineAddedSuccess: 'Đã thêm thành công engine {name}!',
  },

  // Thông báo lỗi
  errors: {
    saveNotationFailed: 'Lưu biên bản thất bại',
    openNotationFailed: 'Mở biên bản thất bại',
    engineNotLoaded: 'Chưa tải engine, không thể gửi lệnh',
    engineSendUnavailable: 'Phương thức send của engine không khả dụng',
    redDarkPiecesMismatch:
      'Lỗi: Bên đỏ {darkCount} quân úp > {poolCount} trong kho',
    blackDarkPiecesMismatch:
      'Lỗi: Bên đen {darkCount} quân úp > {poolCount} trong kho',
    pieceCountExceeded: 'Lỗi: Tổng số {pieceName} vượt giới hạn!',
    engineLoadFailed: 'Không thể tải engine {name}: {error}',
    engineUnloadFailed: 'Gỡ bỏ engine thất bại',
    failedToOpenFileSelector: 'Không thể mở trình chọn tệp',
    failedToProcessEngine: 'Không thể xử lý tệp engine',
  },

  // Phần dưới bàn cờ
  chessboard: {
    copyFen: 'Sao chép FEN',
    pasteFen: 'Dán FEN',
    inputFen: 'Nhập FEN',
    newGame: 'Ván mới',
    copied: '✓ Đã sao chép',
  },

  // Biểu đồ đánh giá
  evaluationChart: {
    title: 'Biểu đồ đánh giá',
    showMoveLabels: 'Hiển thị nhãn nước đi',
    linearYAxis: 'Trục Y tuyến tính',
    showOnlyLines: 'Chỉ hiển thị đường',
    blackPerspective: 'Góc nhìn Đen',
    opening: 'Khai cuộc',
    noData: 'Không có dữ liệu phân tích',
    newGame: 'Ván mới',
    copied: '✓ Đã sao chép',
  },

  // Lựa chọn ngôn ngữ
  languages: {
    current: 'Ngôn ngữ hiện tại',
    zh_cn: '简体中文',
    zh_tw: '繁體中文',
    en: 'English',
    vi: 'Tiếng Việt',
    ja: '日本語',
  },

  // Hộp thoại cài đặt giao diện
  interfaceSettings: {
    title: 'Cài đặt giao diện',
    showCoordinates: 'Hiển thị số hàng và cột',
    parseUciInfo: 'Phân tích thông tin UCI',
    showAnimations: 'Bật hoạt ảnh di chuyển quân cờ',
    showPositionChart: 'Hiển thị biểu đồ cục diện',
    darkMode: 'Chế độ tối',
    autosave: 'Tự động lưu ván cờ vào Autosave.json',
    useNewFenFormat: 'Sử dụng định dạng FEN mới',
    engineLogLineLimit: 'Giới hạn dòng nhật ký động cơ',
  },

  // Tin nhắn UCI
  uci: {
    depth: 'Độ sâu',
    seldepth: 'Độ sâu chọn',
    multipv: 'MultiPV',
    score: 'Điểm',
    mate: 'Chiếu hết',
    wdl: 'Thắng/Hòa/Thua',
    nodes: 'Số nút',
    nps: 'NPS',
    hashfull: 'Hash đầy',
    tbhits: 'Bảng truy cập',
    time: 'Thời gian',
    pv: 'Biến chính',
    checkmate: 'Chiếu hết! Không có nước đi nào.',
    bestMove: 'Nước đi tốt nhất: {move}',
    noMoves: 'Không có nước đi nào',
    engineReady: 'Engine đã sẵn sàng',
  },

  // Xác nhận thao tác trò chơi
  gameConfirm: {
    clearHistoryTitle: 'Xóa lịch sử tiếp theo',
    clearHistoryMessage:
      'Bạn đang thực hiện nước đi trong vị trí lịch sử. Điều này sẽ xóa tất cả lịch sử nước đi tiếp theo. Bạn có chắc chắn muốn tiếp tục không?',
    confirm: 'Xác nhận',
    cancel: 'Hủy',
  },
}
