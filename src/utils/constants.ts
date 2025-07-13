// Jieqi game constants

/**
 * Standard starting FEN string
 * Format: board layout hidden pieces current side castling en passant halfmove fullmove
 */
export const START_FEN = "xxxxkxxxx/9/1x5x1/x1x1x1x1x/9/9/X1X1X1X1X/1X5X1/9/XXXXKXXXX A2B2N2R2C2P5a2b2n2r2c2p5 w - - 0 1";

/**
 * Piece type mapping table
 */
export const FEN_MAP: { [k: string]: string } = {
  red_chariot: 'R', red_horse: 'N', red_elephant: 'B', red_advisor: 'A',
  red_king: 'K',   red_cannon: 'C', red_pawn: 'P',
  black_chariot: 'r', black_horse: 'n', black_elephant: 'b', black_advisor: 'a',
  black_king: 'k',   black_cannon: 'c', black_pawn: 'p',
};

/**
 * Reverse piece type mapping table
 */
export const REVERSE_FEN_MAP: { [k: string]: string } = {
  R: 'chariot', N: 'horse', B: 'elephant', A: 'advisor', K: 'king', C: 'cannon', P: 'pawn',
  r: 'chariot', n: 'horse', b: 'elephant', a: 'advisor', k: 'king', c: 'cannon', p: 'pawn',
};

/**
 * Initial piece counts
 */
export const INITIAL_PIECE_COUNTS: { [k: string]: number } = {
  R: 2, N: 2, B: 2, A: 2, C: 2, P: 5, K: 1,
  r: 2, n: 2, b: 2, a: 2, c: 2, p: 5, k: 1,
}; 