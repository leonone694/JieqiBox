import { ref, computed } from 'vue';

export interface Piece {
  id: number;
  name: string;
  row: number;
  col: number;
  isKnown: boolean;
  initialRole: string;
  initialRow: number;
  initialCol: number;
  zIndex?: number; // for controlling piece layering, cannon pieces are brought to top when capturing
}

export type HistoryEntry = {
  type: 'move' | 'adjust';
  data: string;
  fen: string;
  lastMove?: { from: { row: number; col: number }; to: { row: number; col: number } }; // record the start and end positions of the last move
};

// Custom game notation format interface
export interface GameNotation {
  metadata: {
    event?: string;
    site?: string;
    date?: string;
    round?: string;
    white?: string;
    black?: string;
    result?: string;
    initialFen?: string;
    flipMode?: 'random' | 'free';
    currentFen?: string;
    unrevealedPieceCounts?: { [key: string]: number };
    totalMoves?: number;
    currentSide?: 'red' | 'black';
  };
  moves: HistoryEntry[];
  currentMoveIndex: number;
}

export function useChessGame() {
  const pieces = ref<Piece[]>([]);
  const selectedPieceId = ref<number | null>(null);
  const copySuccessVisible = ref(false);
  const sideToMove = ref<'red' | 'black'>('red');
  const halfmoveClock = ref(0); // halfmove clock
  const fullmoveNumber = ref(1); // fullmove number
  
  const history = ref<HistoryEntry[]>([]);
  const currentMoveIndex = ref<number>(0);
  const flipMode = ref<'random' | 'free'>('random');
  const unrevealedPieceCounts = ref<{[key: string]: number}>({});
  const isBoardFlipped = ref(false); // board flip state
  
  const pendingFlip = ref<{
    pieceToMove: Piece;
    uciMove: string;
    side: 'red' | 'black';
    callback: (chosenPieceName: string) => void;
  } | null>(null);
  
  // Arrow clear event callbacks
  const arrowClearCallbacks = ref<(() => void)[]>([]);
  
  const isFenInputDialogVisible = ref(false);
  const isAnimating = ref(true); // Control piece movement animation switch
  
  // Store the initial FEN for replay functionality
  const initialFen = ref<string>("xxxxkxxxx/9/1x5x1/x1x1x1x1x/9/9/X1X1X1X1X/1X5X1/9/XXXXKXXXX A2B2N2R2C2P5a2b2n2r2c2p5 w - - 0 1");
  
  // record the start and end positions of the last move for highlighting
  const lastMovePositions = ref<{ from: { row: number; col: number }; to: { row: number; col: number } } | null>(null);

  const FEN_MAP: { [k: string]: string } = {
    red_chariot: 'R', red_horse: 'N', red_elephant: 'B', red_advisor: 'A',
    red_king: 'K',   red_cannon: 'C', red_pawn: 'P',
    black_chariot: 'r', black_horse: 'n', black_elephant: 'b', black_advisor: 'a',
    black_king: 'k',   black_cannon: 'c', black_pawn: 'p',
  };
  const REVERSE_FEN_MAP: { [k: string]: string } = {
    R: 'chariot', N: 'horse', B: 'elephant', A: 'advisor', K: 'king', C: 'cannon', P: 'pawn',
    r: 'chariot', n: 'horse', b: 'elephant', a: 'advisor', k: 'king', c: 'cannon', p: 'pawn',
  };
  const INITIAL_PIECE_COUNTS: { [k: string]: number } = {
    R: 2, N: 2, B: 2, A: 2, C: 2, P: 5, K: 1,
    r: 2, n: 2, b: 2, a: 2, c: 2, p: 5, k: 1,
  };
  const getRoleByPosition = (row: number, col: number): string => {
    const initialPositions: { [role: string]: { row: number; col: number }[] } = {
        chariot:  [{ row: 0, col: 0 }, { row: 0, col: 8 }, { row: 9, col: 0 }, { row: 9, col: 8 }],
        horse:    [{ row: 0, col: 1 }, { row: 0, col: 7 }, { row: 9, col: 1 }, { row: 9, col: 7 }],
        elephant: [{ row: 0, col: 2 }, { row: 0, col: 6 }, { row: 9, col: 2 }, { row: 9, col: 6 }],
        advisor:  [{ row: 0, col: 3 }, { row: 0, col: 5 }, { row: 9, col: 3 }, { row: 9, col: 5 }],
        king:     [{ row: 0, col: 4 }, { row: 9, col: 4 }],
        cannon:   [{ row: 2, col: 1 }, { row: 2, col: 7 }, { row: 7, col: 1 }, { row: 7, col: 7 }],
        pawn:     [
          { row: 3, col: 0 }, { row: 3, col: 2 }, { row: 3, col: 4 },
          { row: 3, col: 6 }, { row: 3, col: 8 }, { row: 6, col: 0 },
          { row: 6, col: 2 }, { row: 6, col: 4 }, { row: 6, col: 6 }, { row: 6, col: 8 },
        ],
    };
    for (const role in initialPositions) {
      if (initialPositions[role].some(p => p.row === row && p.col === col)) return role;
    }
    return '';
  };
  
  const getPieceSide = (piece: Piece): 'red' | 'black' => {
      if (piece.isKnown) {
        return piece.name.startsWith('red') ? 'red' : 'black';
      } else {
        // For hidden pieces, determine color based on position
        // If the board is flipped, need to reverse the judgment
        if (isBoardFlipped.value) {
          // After flip: first 5 rows are red, last 5 rows are black
          return piece.row < 5 ? 'red' : 'black';
        } else {
          // Normal: first 5 rows are black, last 5 rows are red
          return piece.row >= 5 ? 'red' : 'black';
        }
      }
  };

  const shuffle = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const getPieceNameFromChar = (char: string): string => {
    const isRed = char === char.toUpperCase();
    const role = REVERSE_FEN_MAP[char.toUpperCase()];
    return `${isRed ? 'red' : 'black'}_${role}`;
  };
  const getCharFromPieceName = (name: string): string => FEN_MAP[name];

  const validationStatus = computed(() => {
    const darkPiecesOnBoard = pieces.value.filter(p => !p.isKnown).length;
    const piecesInPool = Object.values(unrevealedPieceCounts.value).reduce((a, b) => a + b, 0);
    
    if (piecesInPool < darkPiecesOnBoard) {
      return `错误: ${darkPiecesOnBoard}暗子 > ${piecesInPool}池`;
    }

    for (const char in INITIAL_PIECE_COUNTS) {
      const revealedCount = pieces.value.filter(p => p.isKnown && getCharFromPieceName(p.name) === char).length;
      const inPoolCount = unrevealedPieceCounts.value[char] || 0;
      if (revealedCount + inPoolCount > INITIAL_PIECE_COUNTS[char as keyof typeof INITIAL_PIECE_COUNTS]) {
        return `错误: ${getPieceNameFromChar(char)} 总数超限!`;
      }
    }
    
    return '正常';
  });

  const moveHistory = computed(() => history.value);

  const generateFen = (): string => {
    const board: (Piece | null)[][] = Array.from({ length: 10 }, () => Array(9).fill(null));
    // If the board is flipped, need to remap positions to generate FEN that engine can understand
    pieces.value.forEach(p => {
      const actualRow = isBoardFlipped.value ? (9 - p.row) : p.row;
      board[actualRow][p.col] = p;
    });
    const boardFen = board.map((row, rowIndex) => {
        let empty = 0;
        let str = '';
        row.forEach(p => {
            if (p) {
                if (empty > 0) { str += empty; empty = 0; }
                if (p.isKnown) {
                  str += FEN_MAP[p.name];
                } else {
                  // For hidden pieces, determine color based on remapped position
                  // After remapping: first 5 rows are black, last 5 rows are red (standard format)
                  const isRedSide = rowIndex >= 5;
                  str += isRedSide ? 'X' : 'x';
                }
            } else empty++;
        });
        if (empty > 0) str += empty;
        return str;
      }).join('/');
    let hiddenStr = '';
    const hiddenOrder = "RNBAKCP";
    hiddenOrder.split('').forEach(char => {
        const redCount = unrevealedPieceCounts.value[char] || 0;
        const blackCount = unrevealedPieceCounts.value[char.toLowerCase()] || 0;
        if(redCount > 0) hiddenStr += char + redCount;
        if(blackCount > 0) hiddenStr += char.toLowerCase() + blackCount;
    });
    // Only return FEN, without move history, ensure engine doesn't repeat moves
    return `${boardFen} ${hiddenStr || '-'} ${sideToMove.value === 'red' ? 'w' : 'b'} - - ${halfmoveClock.value} ${fullmoveNumber.value}`;
  };

  const loadFen = (fen: string, animate: boolean) => {
    isAnimating.value = animate;
    try {
        const parts = fen.split(' ');
        const [boardPart, hiddenPart, sidePart, _castling, _enpassant, halfmove, fullmove] = parts;
        sideToMove.value = sidePart === 'w' ? 'red' : 'black';
        halfmoveClock.value = halfmove ? parseInt(halfmove, 10) : 0;
        fullmoveNumber.value = fullmove ? parseInt(fullmove, 10) : 1;

        const newPieces: Piece[] = [];
        let pieceId = 1;

        boardPart.split('/').forEach((rowStr, rowIndex) => {
            let colIndex = 0;
            for (const char of rowStr) {
                if (/\d/.test(char)) {
                    colIndex += parseInt(char, 10);
                } else {
                    const isRed = char.toUpperCase() === char;
                    const initialRole = getRoleByPosition(rowIndex, colIndex);
                    if (char.toLowerCase() === 'x') {
                        const tempName = isRed ? 'red_unknown' : 'black_unknown';
                        newPieces.push({
                            id: pieceId++, name: tempName, row: rowIndex, col: colIndex,
                            isKnown: false, initialRole: initialRole, initialRow: rowIndex, initialCol: colIndex,
                        });
                    } else {
                        const pieceName = getPieceNameFromChar(char);
                        newPieces.push({
                            id: pieceId++, name: pieceName, row: rowIndex, col: colIndex,
                            isKnown: true, initialRole: initialRole, initialRow: rowIndex, initialCol: colIndex,
                        });
                    }
                    colIndex++;
                }
            }
        });
        
        const newCounts: {[key: string]: number} = {};
        "RNBAKCP rnbakcp".split("").filter(c => c !== " ").forEach(c => newCounts[c] = 0);
        if (hiddenPart && hiddenPart !== '-') {
            const hiddenMatches = hiddenPart.match(/[a-zA-Z]\d+/g) || [];
            hiddenMatches.forEach(match => {
                const char = match[0];
                const count = parseInt(match.slice(1), 10);
                newCounts[char] = count;
            });
        }
        
        const darkPieces = newPieces.filter(p => !p.isKnown);
        const hiddenPool: string[] = [];
        Object.entries(newCounts).forEach(([char, count]) => {
            for (let i = 0; i < count; i++) {
                hiddenPool.push(getPieceNameFromChar(char));
            }
        });
        
        const shuffledIdentities = shuffle(hiddenPool);
        darkPieces.forEach(p => {
            const side = getPieceSide(p);
            const identityIndex = shuffledIdentities.findIndex(name => name.startsWith(side));
            if (identityIndex !== -1) {
                p.name = shuffledIdentities.splice(identityIndex, 1)[0];
            }
        });

        pieces.value = newPieces;
        unrevealedPieceCounts.value = newCounts;
        selectedPieceId.value = null;
        lastMovePositions.value = null; // Clear highlights when loading FEN
        
        // Reset zIndex for all pieces and update based on position
        pieces.value.forEach(p => p.zIndex = undefined);
        updateAllPieceZIndexes();
        
        // Detect and set correct flip state
        detectAndSetBoardFlip();
        
        // Trigger arrow clear event
        triggerArrowClear();

    } catch (e: any) {
        console.error("加载FEN失败！", e);
        alert(e.message || "输入的FEN格式有误！");
    }
  };

  const recordAndFinalize = (type: 'move' | 'adjust', data: string, lastMove?: { from: { row: number; col: number }; to: { row: number; col: number } }) => {
    // Record move history: slice to current index position, then add new move record
    const newHistory = history.value.slice(0, currentMoveIndex.value);
    
    // For 'move' type, update side to move before generating FEN for the resulting position.
    if (type === 'move') {
      sideToMove.value = sideToMove.value === 'red' ? 'black' : 'red';
    }

    const fen = generateFen();
    newHistory.push({ type, data, fen, lastMove });
    history.value = newHistory;
    currentMoveIndex.value = history.value.length;
    
    if (type === 'move') {
      // Enable animation when making moves
      isAnimating.value = true;
      // Record last move position for highlighting
      // In free mode, if it's a dark piece move, lastMovePositions has already been set in movePiece
      if (!(flipMode.value === 'free' && pendingFlip.value)) {
        lastMovePositions.value = lastMove || null;
      }
    }
    selectedPieceId.value = null;
  };
  
  const setupNewGame = () => {
    const startFen = "xxxxkxxxx/9/1x5x1/x1x1x1x1x/9/9/X1X1X1X1X/1X5X1/9/XXXXKXXXX A2B2N2R2C2P5a2b2n2r2c2p5 w - - 0 1";
    initialFen.value = startFen; // Update initial FEN for new game
    loadFen(startFen, false); // No animation at game start
    history.value = [];
    currentMoveIndex.value = 0;
    lastMovePositions.value = null; // Clear highlights for new game
    
    // Ensure flip state is correct for new game
    detectAndSetBoardFlip();
    
    // Trigger arrow clear event
    triggerArrowClear();
  };

  const adjustUnrevealedCount = (char: string, delta: 1 | -1) => {
    const currentCount = unrevealedPieceCounts.value[char] || 0;
    
    if (delta === -1 && currentCount <= 0) return;
    
    if (delta === 1) {
      const revealedCount = pieces.value.filter(p => p.isKnown && getCharFromPieceName(p.name) === char).length;
      if (revealedCount + currentCount >= INITIAL_PIECE_COUNTS[char as keyof typeof INITIAL_PIECE_COUNTS]) {
          alert(`不能再增加了！${getPieceNameFromChar(char)} 总数已达上限。`);
          return;
      }
    }

    unrevealedPieceCounts.value[char] = currentCount + delta;
    recordAndFinalize('adjust', `${char}${delta > 0 ? '+' : '-'}`);
  };

  const completeFlipAfterMove = (piece: Piece, uciMove: string, chosenPieceName: string, lastMove?: { from: { row: number; col: number }; to: { row: number; col: number } }) => {
    const char = getCharFromPieceName(chosenPieceName);
    if ((unrevealedPieceCounts.value[char] || 0) <= 0) {
      alert(`错误：暗子池中没有 ${chosenPieceName} 了！`);
      pendingFlip.value = null;
      return;
    }
    unrevealedPieceCounts.value[char]--;
    
    piece.name = chosenPieceName;
    piece.isKnown = true;
    
    // Reset zIndex for all pieces and update based on position after revealing
    pieces.value.forEach(p => p.zIndex = undefined);
    updateAllPieceZIndexes();
    
    // If the revealed piece is a cannon and was revealed during capture, bring to top
    if (chosenPieceName.includes('cannon') && lastMove) {
      // Check if it was a capture move (piece was captured at target position)
      const wasCapture = piece.row === lastMove.to.row && piece.col === lastMove.to.col;
      if (wasCapture) {
        // Set cannon's zIndex to highest
        piece.zIndex = 1000;
        // Update other pieces' zIndex based on position
        updateAllPieceZIndexes();
      }
    }
    
    pendingFlip.value = null;
    // In free mode, lastMovePositions has already been set in movePiece, here we only need to record history
    recordAndFinalize('move', uciMove, lastMove);
  };
  
  /**
   * Handle board click event.
   * If a move is attempted in a historical position, return an object indicating confirmation is required.
   * Otherwise, perform the move as usual.
   * @returns {object|undefined} If confirmation is needed, returns { requireClearHistoryConfirm: true, move: { piece, row, col } }
   */
  const handleBoardClick = (row: number, col: number) => {
    if (pendingFlip.value) return;
    const clickedPiece = pieces.value.find(p => p.row === row && p.col === col);

    if (selectedPieceId.value !== null) {
      const selectedPiece = pieces.value.find(p => p.id === selectedPieceId.value)!;
      if (clickedPiece && clickedPiece.id === selectedPieceId.value) {
        selectedPieceId.value = null; return;
      }
      if (clickedPiece && getPieceSide(clickedPiece) === getPieceSide(selectedPiece)) {
        selectedPieceId.value = clickedPiece.id; return;
      }
      // If in a historical position, require confirmation before clearing history
      if (currentMoveIndex.value < history.value.length) {
        // Return a signal to the UI to show confirmation dialog
        return {
          requireClearHistoryConfirm: true,
          move: { piece: selectedPiece, row, col }
        };
      }
      movePiece(selectedPiece, row, col);
    } else if (clickedPiece) {
      if (getPieceSide(clickedPiece) === sideToMove.value) {
        selectedPieceId.value = clickedPiece.id;
      }
    }
  };

  /**
   * Actually perform the move and clear history after user confirms.
   * This should be called by the UI after user confirms the dialog.
   */
  const clearHistoryAndMove = (piece: Piece, row: number, col: number) => {
    history.value = history.value.slice(0, currentMoveIndex.value);
    movePiece(piece, row, col);
  };
  
  // Check if the specified position is in check
  const isInCheck = (kingRow: number, kingCol: number, kingSide: 'red' | 'black'): boolean => {
    const opponentSide = kingSide === 'red' ? 'black' : 'red';
    
    // Check if any opponent piece can attack the king's position
    for (const piece of pieces.value) {
      if (getPieceSide(piece) !== opponentSide) continue;
      
      const role = piece.isKnown ? piece.name.split('_')[1] : piece.initialRole;
      const dRow = Math.abs(kingRow - piece.row);
      const dCol = Math.abs(kingCol - piece.col);
      
      // Skip unrevealed pieces (they cannot check)
      if (!piece.isKnown) continue;
      
      const countPiecesBetween = (r1: number, c1: number, r2: number, c2: number): number => {
        let count = 0;
        if (r1 === r2) {
          for (let c = Math.min(c1, c2) + 1; c < Math.max(c1, c2); c++) {
            if (pieces.value.some(p => p.row === r1 && p.col === c)) count++;
          }
        } else if (c1 === c2) {
          for (let r = Math.min(r1, r2) + 1; r < Math.max(r1, r2); r++) {
            if (pieces.value.some(p => p.col === c1 && p.row === r)) count++;
          }
        }
        return count;
      };
      
      switch (role) {
        case 'king':
          // Kings cannot face each other directly (must have pieces between them)
          if (dRow > 0 && dCol > 0) continue; // Not in same row or column
          if (countPiecesBetween(piece.row, piece.col, kingRow, kingCol) === 0) return true; // Can check if no pieces between
          continue; // Cannot check if pieces between
        case 'advisor':
          if (dRow !== 1 || dCol !== 1) continue;
          return true;
        case 'elephant':
          if (dRow !== 2 || dCol !== 2) continue;
          return true;
        case 'horse':
          if (!(dRow === 2 && dCol === 1 || dRow === 1 && dCol === 2)) continue;
          const legRow = piece.row + (dRow === 2 ? (kingRow - piece.row) / 2 : 0);
          const legCol = piece.col + (dCol === 2 ? (kingCol - piece.col) / 2 : 0);
          if (pieces.value.some(p => p.row === legRow && p.col === legCol)) continue;
          return true;
        case 'chariot':
          if (dRow > 0 && dCol > 0) continue;
          if (countPiecesBetween(piece.row, piece.col, kingRow, kingCol) > 0) continue;
          return true;
        case 'cannon':
          // console.log('isInCheck: 检查炮将军', piece.name, '位置:', piece.row, piece.col, '目标:', kingRow, kingCol);
          if (dRow > 0 && dCol > 0) {
            // console.log('isInCheck: 炮不在直线位置，不能将军');
            continue;
          }
          const piecesBetween = countPiecesBetween(piece.row, piece.col, kingRow, kingCol);
          // console.log('isInCheck: 炮与将帅之间的棋子数:', piecesBetween);
          if (piecesBetween !== 1) {
            // console.log('isInCheck: 炮与将帅之间的棋子数不是1，不能将军');
            continue;
          }
          // console.log('isInCheck: 炮能将军');
          return true;
        case 'pawn':
          // Pawn's check detection needs to consider the board flip state
          const pawnSide = getPieceSide(piece);
          let isOverRiver;
          if (isBoardFlipped.value) {
            isOverRiver = pawnSide === 'red' ? piece.row <= 4 : piece.row >= 5;
          } else {
            isOverRiver = pawnSide === 'red' ? piece.row <= 4 : piece.row >= 5;
          }
          
          let canCheck = false;
          if (isOverRiver) {
            // Can check horizontally after crossing the river
            if (isBoardFlipped.value) {
              canCheck = (pawnSide === 'red' ? (kingRow - piece.row === 1 && dCol === 0) : (piece.row - kingRow === 1 && dCol === 0)) || (dRow === 0 && dCol === 1);
            } else {
              canCheck = (pawnSide === 'red' ? (piece.row - kingRow === 1 && dCol === 0) : (kingRow - piece.row === 1 && dCol === 0)) || (dRow === 0 && dCol === 1);
            }
          } else {
            // Can only check forward before crossing the river
            if (isBoardFlipped.value) {
              canCheck = pawnSide === 'red' ? (kingRow - piece.row === 1 && dCol === 0) : (piece.row - kingRow === 1 && dCol === 0);
            } else {
              canCheck = pawnSide === 'red' ? (piece.row - kingRow === 1 && dCol === 0) : (kingRow - piece.row === 1 && dCol === 0);
            }
          }
          
          if (!canCheck) continue;
          return true;
      }
    }
    return false;
  };

  // Check if the current position is in check
  const isCurrentPositionInCheck = (side: 'red' | 'black'): boolean => {
    // console.log('isCurrentPositionInCheck: 检查', side, '方是否被将军');
    // Find the king of the specified side
    const king = pieces.value.find(p => {
      if (!p.isKnown) return false;
      const role = p.name.split('_')[1];
      return role === 'king' && getPieceSide(p) === side;
    });
    
    if (!king) {
      // console.log('isCurrentPositionInCheck: 没有找到', side, '方将帅');
      return false; // King not found (could be an unrevealed piece)
    }
    
    // console.log('isCurrentPositionInCheck: 找到', side, '方将帅位置:', king.row, king.col);
    const inCheck = isInCheck(king.row, king.col, side);
    // console.log('isCurrentPositionInCheck:', side, '方被将军:', inCheck);
    return inCheck;
  };

  // Simulate the move and check if the king is still in check
  const wouldBeInCheckAfterMove = (piece: Piece, targetRow: number, targetCol: number): boolean => {
    // console.log('wouldBeInCheckAfterMove: 开始检查', piece.name, targetRow, targetCol);
    const pieceSide = getPieceSide(piece);
    const originalRow = piece.row;
    const originalCol = piece.col;
    const targetPiece = pieces.value.find(p => p.row === targetRow && p.col === targetCol);
    
    // Temporarily make the move
    if (targetPiece) {
      pieces.value = pieces.value.filter(p => p.id !== targetPiece.id);
    }
    piece.row = targetRow;
    piece.col = targetCol;
    
    // Check if still in check
    const stillInCheck = isCurrentPositionInCheck(pieceSide);
    // console.log('wouldBeInCheckAfterMove: 走子后是否仍被将军:', stillInCheck);
    
    // Revert the board state
    piece.row = originalRow;
    piece.col = originalCol;
    if (targetPiece) {
      pieces.value.push(targetPiece);
    }
    
    return stillInCheck;
  };

  const isMoveValid = (piece: Piece, targetRow: number, targetCol: number): boolean => {
    // console.log('isMoveValid: 开始检查', piece.name, targetRow, targetCol);
    // If it's an unrevealed piece, ensure it has an initialRole
    if (!piece.isKnown && !piece.initialRole) {
      // console.log('isMoveValid: 暗子没有initialRole，返回false');
      return false;
    }
    
    const role = piece.isKnown ? piece.name.split('_')[1] : piece.initialRole;
    const dRow = Math.abs(targetRow - piece.row);
    const dCol = Math.abs(targetCol - piece.col);
    const pieceSide = getPieceSide(piece);
    
    const targetPiece = pieces.value.find(p => p.row === targetRow && p.col === targetCol);
    if (targetPiece && getPieceSide(targetPiece) === pieceSide) {
        return false;
    }
    
    const countPiecesBetween = (r1: number, c1: number, r2: number, c2: number): number => {
        let count = 0;
        if (r1 === r2) {
            for (let c = Math.min(c1, c2) + 1; c < Math.max(c1, c2); c++) {
                if (pieces.value.some(p => p.row === r1 && p.col === c)) count++;
            }
        } else if (c1 === c2) {
            for (let r = Math.min(r1, r2) + 1; r < Math.max(r1, r2); r++) {
                if (pieces.value.some(p => p.col === c1 && p.row === r)) count++;
            }
        }
        return count;
    };

    let moveValid = false;
    switch (role) {
      case 'king':
        // console.log('isMoveValid: 检查将帅走法', pieceSide, 'dRow:', dRow, 'dCol:', dCol, 'targetCol:', targetCol);
        // King's move validation needs to consider the board flip state
        let kingTargetRowMin, kingTargetRowMax;
        if (isBoardFlipped.value) {
          // Flipped: Red is at the bottom (rows 0-4), Black is at the top (rows 5-9)
          kingTargetRowMin = pieceSide === 'red' ? 0 : 5;
          kingTargetRowMax = pieceSide === 'red' ? 2 : 9;
        } else {
          // Normal: Red is at the top (rows 7-9), Black is at the bottom (rows 0-2)
          kingTargetRowMin = pieceSide === 'red' ? 7 : 0;
          kingTargetRowMax = pieceSide === 'red' ? 9 : 2;
        }
        moveValid = (dRow === 1 && dCol === 0 || dRow === 0 && dCol === 1) &&
               (targetCol >= 3 && targetCol <= 5) &&
               (targetRow >= kingTargetRowMin && targetRow <= kingTargetRowMax);
        // console.log('isMoveValid: 将帅走法检查结果:', moveValid, 'targetRow:', targetRow, 'kingTargetRowMin:', kingTargetRowMin, 'kingTargetRowMax:', kingTargetRowMax);
        break;
              case 'advisor':
          // Check if it's an unrevealed advisor (at initial position and not flipped)
          const isDarkAdvisor = !piece.isKnown && (
            (piece.row === 0 && (piece.col === 3 || piece.col === 5)) ||
            (piece.row === 9 && (piece.col === 3 || piece.col === 5))
          );
          // Prohibit unrevealed advisors from making specific moves
          if (isDarkAdvisor) {
            if (piece.row === 0 && piece.col === 3 && targetRow === 1 && targetCol === 2) {
              moveValid = false;
              break;
            }
            if (piece.row === 0 && piece.col === 5 && targetRow === 1 && targetCol === 6) {
              moveValid = false;
              break;
            }
            if (piece.row === 9 && piece.col === 3 && targetRow === 8 && targetCol === 2) {
              moveValid = false;
              break;
            }
            if (piece.row === 9 && piece.col === 5 && targetRow === 8 && targetCol === 6) {
              moveValid = false;
              break;
            }
          }
          moveValid = dRow === 1 && dCol === 1;
          break;
              case 'elephant':
          if (dRow !== 2 || dCol !== 2) {
            moveValid = false;
            break;
          }
          const eyeRow = piece.row + (targetRow - piece.row) / 2;
          const eyeCol = piece.col + (targetCol - piece.col) / 2;
          if (pieces.value.some(p => p.row === eyeRow && p.col === eyeCol)) {
            moveValid = false;
            break;
          }
          moveValid = true;
          break;
              case 'horse':
          if (!(dRow === 2 && dCol === 1 || dRow === 1 && dCol === 2)) {
            moveValid = false;
            break;
          }
          const legRow = piece.row + (dRow === 2 ? (targetRow - piece.row) / 2 : 0);
          const legCol = piece.col + (dCol === 2 ? (targetCol - piece.col) / 2 : 0);
          moveValid = !pieces.value.some(p => p.row === legRow && p.col === legCol);
          break;
              case 'chariot':
          if (dRow > 0 && dCol > 0) {
            moveValid = false;
            break;
          }
          moveValid = countPiecesBetween(piece.row, piece.col, targetRow, targetCol) === 0;
          break;
              case 'cannon':
          if (dRow > 0 && dCol > 0) {
            moveValid = false;
            break;
          }
          const piecesBetween = countPiecesBetween(piece.row, piece.col, targetRow, targetCol);
          if (targetPiece) {
              moveValid = piecesBetween === 1;
          } else {
              moveValid = piecesBetween === 0;
          }
          break;
      case 'pawn':
        // Pawn's move validation needs to consider the board flip state
        let isOverRiver;
        isOverRiver = pieceSide === 'red' ? piece.row <= 4 : piece.row >= 5;
        if (isBoardFlipped.value) {
          isOverRiver = !isOverRiver;
        }
        
        if (isOverRiver) {
          // Can move sideways after crossing the river
          if (isBoardFlipped.value) {
            // Flipped: Red pawns move down (row increases), Black pawns move up (row decreases)
            moveValid = (pieceSide === 'red' ? (targetRow - piece.row === 1 && dCol === 0) : (piece.row - targetRow === 1 && dCol === 0)) || (dRow === 0 && dCol === 1);
          } else {
            // Normal: Red pawns move down (row decreases), Black pawns move up (row increases)
            moveValid = (pieceSide === 'red' ? (piece.row - targetRow === 1 && dCol === 0) : (targetRow - piece.row === 1 && dCol === 0)) || (dRow === 0 && dCol === 1);
          }
        } else {
          // Can only move forward before crossing the river
          if (isBoardFlipped.value) {
            // Flipped: Red pawns move down (row increases), Black pawns move up (row decreases)
            moveValid = pieceSide === 'red' ? (targetRow - piece.row === 1 && dCol === 0) : (piece.row - targetRow === 1 && dCol === 0);
          } else {
            // Normal: Red pawns move down (row decreases), Black pawns move up (row increases)
            moveValid = pieceSide === 'red' ? (piece.row - targetRow === 1 && dCol === 0) : (targetRow - piece.row === 1 && dCol === 0);
          }
        }
        break;
    }
    
    // If the basic move is invalid, return false directly
    if (!moveValid) {
      // console.log('isMoveValid: 基本走法不合法，返回false');
      return false;
    }
    
    // If your king is still in check after this move, the move is illegal
    // console.log('isMoveValid: 检查走子后是否仍被将军');
    if (wouldBeInCheckAfterMove(piece, targetRow, targetCol)) {
      // console.log('isMoveValid: 走子后仍被将军，返回false');
      return false;
    }
    // console.log('isMoveValid: 走子合法，返回true');
    return true;
  };
  
  const movePiece = (piece: Piece, targetRow: number, targetCol: number) => {
    const pieceSide = getPieceSide(piece);

    // Update halfmove and fullmove counters
    // A flip move is when an unknown piece is moved.
    const isFlip = !piece.isKnown;
    // Check for capture by checking if there is a piece at the target location before moving.
    const capturedPieceIndexAtTarget = pieces.value.findIndex(p => p.row === targetRow && p.col === targetCol);
    const isCapture = capturedPieceIndexAtTarget !== -1;

    if (isFlip || isCapture) {
      halfmoveClock.value = 0;
    } else {
      halfmoveClock.value++;
    }

    if (sideToMove.value === 'black') {
      fullmoveNumber.value++;
    }

    // Generate UCI coordinates; if the board is flipped, coordinates need to be converted
    const toUci = (r: number, c: number) => {
      if (isBoardFlipped.value) {
        // After flipping, coordinates need to be converted
        const flippedRow = 9 - r;
        return `${String.fromCharCode(97 + c)}${9 - flippedRow}`;
      } else {
        return `${String.fromCharCode(97 + c)}${9 - r}`;
      }
    };
    const uciMove = toUci(piece.row, piece.col) + toUci(targetRow, targetCol);
    // console.log('movePiece: 检查走子合法性', piece.name, targetRow, targetCol);
    if (!isMoveValid(piece, targetRow, targetCol)) {
      // console.log('movePiece: 走子不合法，拒绝执行');
      return;
    }
    // console.log('movePiece: 走子合法，执行走子');

    // Enable animation effect when making a move
    isAnimating.value = true;

    const targetPiece = pieces.value.find(p => p.row === targetRow && p.col === targetCol);
    const wasDarkPiece = !piece.isKnown;
    const originalRow = piece.row;
    const originalCol = piece.col;

    const highlightMove = { from: { row: originalRow, col: originalCol }, to: { row: targetRow, col: targetCol } };
    const historyMove = {
      from: { row: convertRowForHistory(originalRow), col: originalCol },
      to:   { row: convertRowForHistory(targetRow),   col: targetCol },
    };

    if (targetPiece) {
      // In free flip mode, capturing opponent's hidden piece should not affect their unrevealed pool
      // Only in random flip mode, we randomly remove a piece from opponent's pool
      if (!targetPiece.isKnown && flipMode.value === 'random') {
        const targetSide = getPieceSide(targetPiece);
        const opponentPoolChars = Object.keys(unrevealedPieceCounts.value)
            .filter(char => (unrevealedPieceCounts.value[char] > 0) && (getPieceNameFromChar(char).startsWith(targetSide)));
        
        if(opponentPoolChars.length > 0) {
            const charToRemove = shuffle(opponentPoolChars)[0];
            unrevealedPieceCounts.value[charToRemove]--;
        }
      }
      pieces.value = pieces.value.filter(p => p.id !== targetPiece.id);
    }
    
    piece.row = targetRow;
    piece.col = targetCol;

    // Cannon's zIndex management logic
    const isCannon = piece.isKnown ? piece.name.includes('cannon') : piece.initialRole === 'cannon';
    if (isCannon) {
      if (targetPiece) {
        // Bring cannon to top on capture (highest priority)
        pieces.value.forEach(p => p.zIndex = undefined);
        piece.zIndex = 1000;
        // Update other pieces' zIndex based on position
        updateAllPieceZIndexes();
      } else {
        // Reset zIndex on cannon move and update all pieces
        piece.zIndex = undefined;
        updateAllPieceZIndexes();
      }
    } else {
      // For non-cannon pieces, update all zIndexes based on position
      updateAllPieceZIndexes();
    }

    if (wasDarkPiece) {
        if (flipMode.value === 'free') {
          // For highlighting, we need to use display coordinates, which respect board flip.
          const displayHighlightMove = {
            from: { row: isBoardFlipped.value ? 9 - originalRow : originalRow, col: originalCol },
            to: { row: isBoardFlipped.value ? 9 - targetRow : targetRow, col: targetCol }
          };
          lastMovePositions.value = displayHighlightMove;
          
          pendingFlip.value = {
            pieceToMove: piece,
            uciMove: uciMove,
            side: pieceSide,
            callback: (chosenName) => completeFlipAfterMove(piece, uciMove, chosenName, historyMove),
          };
        } else {
            const pool = Object.entries(unrevealedPieceCounts.value)
              .filter(([, count]) => count > 0)
              .flatMap(([char, count]) => {
                const name = getPieceNameFromChar(char);
                return name.startsWith(pieceSide) ? Array(count).fill(name) : [];
              });

            if (pool.length === 0) {
              alert(`错误：${pieceSide === 'red' ? '红' : '黑'}方暗子池已空！`);
              piece.row = originalRow; piece.col = originalCol;
              if (targetPiece) pieces.value.push(targetPiece);
              return;
            }
            const chosenName = shuffle(pool)[0];
            completeFlipAfterMove(piece, uciMove, chosenName, historyMove);
        }
    } else {
      // Set highlight
      lastMovePositions.value = highlightMove;
      recordAndFinalize('move', uciMove, historyMove);
    }
  };

  // Calculate zIndex based on piece position and special conditions
  const calculatePieceZIndex = (piece: Piece): number | undefined => {
    // Base zIndex calculation: pieces in lower rows (higher row numbers) have higher priority
    // Row 9 (bottom) has highest priority, Row 0 (top) has lowest priority
    const baseZIndex = piece.row * 10; // Each row difference = 10 zIndex units
    
    // Special conditions that override base zIndex
    if (piece.zIndex !== undefined) {
      // If piece already has a special zIndex (e.g., cannon after capture), keep it
      return piece.zIndex;
    }
    
    // Check if piece is in check (highest priority)
    if (piece.isKnown && piece.name.includes('king')) {
      const side = getPieceSide(piece);
      if (isCurrentPositionInCheck(side)) {
        return 1100; // Highest priority for checked king/general
      }
    }
    
    // Return base zIndex based on position
    return baseZIndex;
  };

  // Update zIndex for all pieces based on current position
  const updateAllPieceZIndexes = () => {
    pieces.value.forEach(piece => {
      // Only update if piece doesn't have a special zIndex (like cannon after capture)
      if (piece.zIndex === undefined || piece.zIndex < 1000) {
        piece.zIndex = calculatePieceZIndex(piece);
      }
    });
  };

  // Convert UCI coordinates (if the board is flipped)
  const convertUciForFlip = (uci: string): string => {
    if (!isBoardFlipped.value || uci.length < 4) return uci;
    
    const file2col = (c: string) => c.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank2row = (d: string) => 9 - parseInt(d, 10);
    const row2rank = (r: number) => 9 - r;
    const col2file = (c: number) => String.fromCharCode(97 + c);
    
    // Parse original coordinates
    const fromCol = file2col(uci[0]);
    const fromRow = rank2row(uci[1]);
    const toCol = file2col(uci[2]);
    const toRow = rank2row(uci[3]);
    
    // Flip the coordinates
    const flippedFromRow = 9 - fromRow;
    const flippedToRow = 9 - toRow;
    
    // Convert back to UCI format
    const flippedFromRank = row2rank(flippedFromRow);
    const flippedToRank = row2rank(flippedToRow);
    const flippedFromFile = col2file(fromCol);
    const flippedToFile = col2file(toCol);
    
    return `${flippedFromFile}${flippedFromRank}${flippedToFile}${flippedToRank}`;
  };

  const playMoveFromUci = (uci: string): boolean => {
    if (uci.length < 4) return false;
    
    // If the board is flipped, UCI coordinates need to be converted
    const actualUci = convertUciForFlip(uci);
    
    const file2col = (c: string) => c.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank2row = (d: string) => 9 - parseInt(d, 10);

    const fromCol = file2col(actualUci[0]);
    const fromRow = rank2row(actualUci[1]);
    const toCol   = file2col(actualUci[2]);
    const toRow   = rank2row(actualUci[3]);

    const piece = pieces.value.find(p => p.row === fromRow && p.col === fromCol);
    if (!piece) return false;                         // No piece at the starting position
    if (!isMoveValid(piece, toRow, toCol)) return false; // Illegal move

    movePiece(piece, toRow, toCol);
    return true;                                      // Executed successfully
  };
  
  const replayToMove = (index: number) => {
    currentMoveIndex.value = index;
    if (index === 0) {
      // Load the initial FEN (either default or user-input) to preserve history
      loadFen(initialFen.value, false); // No animation during history navigation
      lastMovePositions.value = null; // Clear highlight at the start of the game
      return;
    }
    const targetFen = history.value[index - 1].fen;
    loadFen(targetFen, false); // No animation during history navigation
    // Restore the highlight of the previous move
    lastMovePositions.value = history.value[index - 1].lastMove || null;
    
    // Reset zIndex for all pieces during history replay
    pieces.value.forEach(p => p.zIndex = undefined);
    // Update zIndex for all pieces based on new positions
    updateAllPieceZIndexes();
    
    // Trigger arrow clear event
    triggerArrowClear();
  };
  
  const copyFenToClipboard = async () => {
    try {
      // Use the same FEN generation logic as the engine to ensure consistency
      const fen = generateFen();
      await navigator.clipboard.writeText(fen);
      copySuccessVisible.value = true;
      setTimeout(() => { copySuccessVisible.value = false; }, 2000);
    } catch (e) {
      console.error("复制FEN失败", e);
      alert("无法复制FEN，你的浏览器可能不支持。");
    }
  };

  const inputFenString = () => {
    // Use global FEN dialog state
    isFenInputDialogVisible.value = true;
  };

  const confirmFenInput = (fen: string) => {
    // Load FEN if the string is not empty
    if (fen && fen.trim()) {
      initialFen.value = fen; // Store the user-input FEN as initial FEN
      loadFen(fen, false); // No animation when inputting FEN
      history.value = [];
      currentMoveIndex.value = 0;
      lastMovePositions.value = null; // Clear highlight when inputting FEN
      
      // Ensure the flip state is correct after inputting FEN
      detectAndSetBoardFlip();
      
      // Reset zIndex for all pieces when inputting FEN
      pieces.value.forEach(p => p.zIndex = undefined);
      // Update zIndex for all pieces based on new positions
      updateAllPieceZIndexes();
      
      // Trigger arrow clear event
      triggerArrowClear();
    }
    // Close the dialog regardless of whether FEN is loaded
    isFenInputDialogVisible.value = false;
  };

  // Generate custom game notation format
  const generateGameNotation = (): GameNotation => {
    return {
      metadata: {
        event: '揭棋对局',
        site: 'jieqibox',
        date: new Date().toISOString().split('T')[0],
        white: '红方',
        black: '黑方',
        result: '*',
        initialFen: initialFen.value, // Use the actual initial FEN
        flipMode: flipMode.value,
        currentFen: generateFen(),
        unrevealedPieceCounts: { ...unrevealedPieceCounts.value },
        totalMoves: history.value.length,
        currentSide: sideToMove.value,
      },
      moves: [...history.value],
      currentMoveIndex: currentMoveIndex.value,
    };
  };

  // Save game notation to a file
  const saveGameNotation = async () => {
    try {
      const notation = generateGameNotation();
      const content = JSON.stringify(notation, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `揭棋对局_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('保存棋谱失败:', error);
      alert('保存棋谱失败，请重试');
    }
  };

  // Load game notation from a file
  const loadGameNotation = async (file: File) => {
    try {
      const text = await file.text();
      const notation: GameNotation = JSON.parse(text);
      
      // Validate the game notation format
      if (!notation.metadata || !notation.moves || typeof notation.currentMoveIndex !== 'number') {
        throw new Error('无效的棋谱格式');
      }

      // Set the flip mode
      if (notation.metadata.flipMode) {
        flipMode.value = notation.metadata.flipMode;
      }

      // Restore the history
      history.value = [...notation.moves];
      currentMoveIndex.value = notation.currentMoveIndex;

      // Always set the initial FEN from notation if available
      if (notation.metadata.initialFen) {
        initialFen.value = notation.metadata.initialFen; // Set the initial FEN from notation
      }
      
      // If there is a current FEN, load the current state directly
      if (notation.metadata.currentFen) {
        loadFen(notation.metadata.currentFen, false);
      } else if (notation.metadata.initialFen) {
        // Otherwise, replay from the initial FEN
        loadFen(notation.metadata.initialFen, false);
        if (currentMoveIndex.value > 0) {
          replayToMove(currentMoveIndex.value);
        }
      } else {
        setupNewGame();
      }

      // Restore the unrevealed piece pool state
      if (notation.metadata.unrevealedPieceCounts) {
        unrevealedPieceCounts.value = { ...notation.metadata.unrevealedPieceCounts };
      }

      // Reset zIndex for all pieces when loading game notation
      pieces.value.forEach(p => p.zIndex = undefined);
      // Update zIndex for all pieces based on new positions
      updateAllPieceZIndexes();
      
      // Trigger arrow clear event
      triggerArrowClear();

      return true;
    } catch (error) {
      console.error('加载棋谱失败:', error);
      alert('加载棋谱失败，请检查文件格式');
      return false;
    }
  };

  // Open a game notation file
  const openGameNotation = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        await loadGameNotation(target.files[0]);
      }
    };
    input.click();
  };

  // Detect board state and automatically set the flip state
  const detectAndSetBoardFlip = () => {
    // Find the positions of the red King and black General
    const redKing = pieces.value.find(p => p.isKnown && p.name === 'red_king');
    const blackKing = pieces.value.find(p => p.isKnown && p.name === 'black_king');
    
    if (redKing && blackKing) {
      // If the red King is at the top (row < 5) and the black General is at the bottom (row >= 5), the board is flipped
      // If the red King is at the bottom (row >= 5) and the black General is at the top (row < 5), the board is in its normal state
      const shouldBeFlipped = redKing.row < 5 && blackKing.row >= 5;
      
      if (shouldBeFlipped !== isBoardFlipped.value) {
        // The flip state needs to be adjusted
        isBoardFlipped.value = shouldBeFlipped;
      }
    }
  };

  // Toggle the board flip state
  const toggleBoardFlip = () => {
    isBoardFlipped.value = !isBoardFlipped.value;
    // Flip the positions of all pieces
    pieces.value = pieces.value.map(piece => ({
      ...piece,
      row: 9 - piece.row,
    }));
    // Reset zIndex for all pieces when flipping the board
    pieces.value.forEach(p => p.zIndex = undefined);
    // Update zIndex for all pieces based on new positions
    updateAllPieceZIndexes();
    
    // Trigger arrow clear event
    triggerArrowClear();
  };

  // Register arrow clear callback
  const registerArrowClearCallback = (callback: () => void) => {
    arrowClearCallbacks.value.push(callback);
  };

  // Trigger arrow clear
  const triggerArrowClear = () => {
    arrowClearCallbacks.value.forEach(callback => callback());
  };

  // Calculate all valid moves for a given piece
  const getValidMovesForPiece = (piece: Piece): { row: number; col: number }[] => {
    const validMoves: { row: number; col: number }[] = [];
    
    // Iterate over all positions on the board
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        // Skip the current position
        if (row === piece.row && col === piece.col) {
          continue;
        }
        // Check if each position is a valid move
        if (isMoveValid(piece, row, col)) {
          validMoves.push({ row, col });
        }
      }
    }
    
    return validMoves;
  };

  // Get the valid moves for the currently selected piece
  const getValidMovesForSelectedPiece = computed(() => {
    if (pendingFlip.value !== null) return [];
    
    if (!selectedPieceId.value) return [];
    
    const selectedPiece = pieces.value.find(p => p.id === selectedPieceId.value);
    if (!selectedPiece) return [];
    
    // Check if it's a piece of the current side to move
    const pieceSide = getPieceSide(selectedPiece);
    if (pieceSide !== sideToMove.value) return [];
    
    return getValidMovesForPiece(selectedPiece);
  });

  // Add a helper function to convert row for history
  function convertRowForHistory(row: number): number {
    return isBoardFlipped.value ? 9 - row : row;
  }

  // Undo the last move (whether made by human or computer)
  const undoLastMove = () => {
    // Check if there are any moves to undo
    if (currentMoveIndex.value <= 0) {
      return false; // No moves to undo
    }
    
    // Remove the last move from history
    const newHistory = history.value.slice(0, currentMoveIndex.value - 1);
    history.value = newHistory;
    currentMoveIndex.value = newHistory.length;
    
    // Replay to the new current position
    if (newHistory.length === 0) {
      // If no moves left, load the initial position
      loadFen(initialFen.value, false);
      lastMovePositions.value = null;
    } else {
      // Replay to the last remaining move
      const lastEntry = newHistory[newHistory.length - 1];
      loadFen(lastEntry.fen, false);
      lastMovePositions.value = lastEntry.lastMove || null;
    }
    
    // Reset zIndex for all pieces
    pieces.value.forEach(p => p.zIndex = undefined);
    updateAllPieceZIndexes();
    
    // Trigger arrow clear event
    triggerArrowClear();
    
    return true;
  };

  setupNewGame();
  
  return {
    pieces, selectedPieceId, copySuccessVisible, sideToMove,
    history, moveHistory, currentMoveIndex,
    flipMode, unrevealedPieceCounts, pendingFlip, validationStatus,
    isFenInputDialogVisible, confirmFenInput,
    isAnimating, lastMovePositions, initialFen,
    getPieceNameFromChar, getPieceSide, getRoleByPosition, generateFen, copyFenToClipboard, inputFenString,
    handleBoardClick, clearHistoryAndMove, setupNewGame, playMoveFromUci,
    replayToMove, adjustUnrevealedCount,
    saveGameNotation, openGameNotation, generateGameNotation,
    loadFen, recordAndFinalize, toggleBoardFlip, isBoardFlipped, detectAndSetBoardFlip,
    registerArrowClearCallback, triggerArrowClear,
    isCurrentPositionInCheck, isInCheck, wouldBeInCheckAfterMove,
    getValidMovesForSelectedPiece,
    undoLastMove, updateAllPieceZIndexes,
  };
}