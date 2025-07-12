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
    interfaceSettings: 'Cài đặt giao diện'
  },

  // Hộp thoại tùy chọn UCI
  uciOptions: {
    title: 'Cấu hình tùy chọn động cơ UCI',
    loadingText: 'Đang tải tùy chọn động cơ...',
    noEngineLoaded: 'Vui lòng tải động cơ trước',
    noOptionsAvailable: 'Không có tùy chọn UCI có thể cấu hình',
    refreshOptions: 'Làm mới tùy chọn',
    range: 'Phạm vi',
    execute: 'Thực hiện',
    resetToDefaults: 'Đặt lại mặc định',
    clearSettings: 'Xóa cài đặt',
    confirmClearSettings:
      'Bạn có chắc chắn muốn xóa tất cả cấu hình tùy chọn UCI cho động cơ hiện tại không? Hành động này không thể hoàn tác.',
    settingsCleared: 'Đã xóa cấu hình tùy chọn UCI'
  },

  // Hộp thoại thời gian
  timeDialog: {
    title: 'Cài đặt tham số phân tích động cơ',
    movetime: 'Thời gian nước đi (ms)',
    maxDepth: 'Độ sâu tối đa',
    maxNodes: 'Số nút tối đa',
    analysisMode: 'Chế độ phân tích',
    resetToDefaults: 'Đặt lại mặc định',
    clearSettings: 'Xóa cài đặt',
    confirmClearSettings:
      'Bạn có chắc chắn muốn xóa tất cả cấu hình tham số phân tích không? Hành động này không thể hoàn tác.',
    settingsCleared: 'Đã xóa cấu hình tham số phân tích',
    analysisModes: {
      movetime: 'Phân tích theo thời gian',
      depth: 'Phân tích theo độ sâu',
      nodes: 'Phân tích theo số nút'
    }
  },

  // Hộp thoại chỉnh sửa vị trí
  positionEditor: {
    title: 'Chỉnh sửa vị trí',
    flipBoard: '🔄 Lật bàn cờ',
    switchSide: '⚡ Chuyển bên',
    resetPosition: '🔄 Đặt lại vị trí',
    addPieces: 'Thêm quân cờ',
    brightPieces: 'Quân cờ sáng',
    darkPieces: 'Quân úp',
    selectedPosition: 'Vị trí đã chọn',
    piece: 'Quân cờ',
    validationStatus: {
      normal: 'Bình thường',
      error: 'Lỗi: Số lượng quân úp không khớp'
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
      black_unknown: 'Quân úp đen'
    }
  },

  // Hộp thoại nhập FEN
  fenInput: {
    title: 'Nhập chuỗi FEN',
    placeholder: 'Vui lòng nhập chuỗi FEN...',
    confirm: 'Xác nhận',
    cancel: 'Hủy'
  },

  // Hộp thoại nhắc lật quân
  flipPrompt: {
    title: 'Nhắc lật quân',
    message: 'Vui lòng chọn quân cờ để lật',
    confirm: 'Xác nhận',
    cancel: 'Hủy'
  },

  // Hộp thoại về
  about: {
    title: 'Về JieqiBox',
    version: 'Phiên bản',
    description:
      'Một ứng dụng desktop phân tích và chơi Cờ úp hiện đại được xây dựng với Tauri và Vue 3.',
    features: 'Tính năng',
    featuresList: [
      'Hỗ trợ ván Cờ úp',
      'Phân tích động cơ UCI',
      'Lưu và tải biên bản',
      'Chỉnh sửa vị trí',
      'Hỗ trợ chuỗi FEN'
    ],
    author: 'Tác giả',
    license: 'Giấy phép',
    github: 'GitHub',
    downloadLatest: 'Tải xuống phiên bản mới nhất',
    viewLicense: 'Xem chi tiết giấy phép'
  },

  // Thanh bên phân tích
  analysis: {
    title: 'Phân tích động cơ',
    startAnalysis: 'Bắt đầu phân tích',
    stopAnalysis: 'Dừng phân tích',
    engineNotLoaded: 'Chưa tải động cơ',
    loadEngine: 'Tải động cơ',
    analysisResults: 'Kết quả phân tích',
    bestMove: 'Nước đi tốt nhất',
    score: 'Điểm số',
    depth: 'Độ sâu',
    nodes: 'Số nút',
    time: 'Thời gian',
    pv: 'Biến chính',
    engineLoaded: 'Đã tải động cơ',
    thinking: 'Đang suy nghĩ...',
    playBestMove: 'Đi nước tốt nhất',
    undoMove: 'Lùi một nước',
    redAiOn: 'AI Đỏ (Bật)',
    redAiOff: 'AI Đỏ (Tắt)',
    blackAiOn: 'AI Đen (Bật)',
    blackAiOff: 'AI Đen (Tắt)',
    freeFlipMode: 'Chế độ lật tự do',
    darkPiecePool: 'Kho quân úp',
    engineAnalysis: 'Phân tích động cơ',
    notation: 'Biên bản',
    opening: 'Khai cuộc',
    adjustment: 'Điều chỉnh',
    engineLog: 'Nhật ký động cơ',
    about: 'Về',
    flipBoard: 'Lật bàn cờ',
    flipBoardBack: 'Khôi phục hướng'
  },

  // Thông báo lỗi
  errors: {
    saveNotationFailed: 'Lưu biên bản thất bại',
    openNotationFailed: 'Mở biên bản thất bại',
    engineNotLoaded: 'Chưa tải động cơ, không thể gửi lệnh',
    engineSendUnavailable: 'Phương thức send của động cơ không khả dụng',
    darkPiecesMismatch: 'Lỗi: {darkCount} quân úp > {poolCount} trong kho',
    pieceCountExceeded: 'Lỗi: Tổng số {pieceName} vượt giới hạn!'
  },

  // Phần dưới bàn cờ
  chessboard: {
    copyFen: 'Sao chép FEN',
    inputFen: 'Nhập FEN',
    newGame: 'Ván mới',
    copied: '✓ Đã sao chép'
  },

  // Lựa chọn ngôn ngữ
  languages: {
    current: 'Ngôn ngữ hiện tại',
    zh_cn: '简体中文',
    zh_tw: '繁體中文',
    en: 'English',
    vi: 'Tiếng Việt',
    ja: '日本語'
  },

  interfaceSettings: {
    title: 'Cài đặt giao diện',
    showCoordinates: 'Hiển thị số hàng và cột',
  },

  // Tin nhắn UCI
  uci: {
    checkmate: 'Chiếu hết! Không có nước đi nào.',
    bestMove: 'Nước đi tốt nhất: {move}',
    noMoves: 'Không có nước đi nào',
    engineReady: 'Engine đã sẵn sàng'
  }
}
