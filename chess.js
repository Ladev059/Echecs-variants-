const PIECES = {
  wK: 'assets/white-king.png',
  wQ: 'assets/white-queen.png',
  wR: 'assets/white-rook.png',
  wB: 'assets/white-bishop.png',
  wN: 'assets/white-knight.png',
  wP: 'assets/white-pawn.png',
  bK: 'assets/black-king.png',
  bQ: 'assets/black-queen.png',
  bR: 'assets/black-rook.png',
  bB: 'assets/black-bishop.png',
  bN: 'assets/black-knight.png',
  bP: 'assets/black-pawn.png',
};

function copyBoard(board) {
  return board.map(row => row.slice());
}

function opposite(color) {
  return color === 'w' ? 'b' : 'w';
}

function defaultBoard() {
  return [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR']
  ];
}

function onBoard(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getPieces(board, color) {
  let res = [];
  for(let r=0; r<8; r++)
    for(let c=0; c<8; c++) {
      let p = board[r][c];
      if(p && p[0] === color) res.push([r, c, p]);
    }
  return res;
}

function legalMovesRaw(board, r, c, state={}) {
  let piece = board[r][c];
  if(!piece) return [];
  let color = piece[0], type = piece[1];
  let moves = [];
  let forward = (color === 'w') ? -1 : 1;
  
  if(type === 'P') {
    // Avance 1
    if(onBoard(r + forward, c) && !board[r + forward][c])
      moves.push([r + forward, c]);

    // Capture diagonale
    for(let dc of [-1, 1]) {
      let nr = r + forward, nc = c + dc;
      if(onBoard(nr, nc) && board[nr][nc] && board[nr][nc][0] !== color)
        moves.push([nr, nc]);
    }

    // Double pas initial
    if(((color === 'w' && r === 6) || (color === 'b' && r === 1)) &&
       !board[r + forward][c] && !board[r + 2*forward][c])
      moves.push([r + 2*forward, c]);

    // Prise en passant
    if(state.enPassantTarget) {
      const [epR, epC] = state.enPassantTarget;
      if(epR === r + forward && Math.abs(epC - c) === 1) {
        moves.push([epR, epC]);
      }
    }
  } else if(type === 'N') {
    let knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for(let [dr, dc] of knightMoves) {
      let nr = r + dr, nc = c + dc;
      if(onBoard(nr, nc) && (!board[nr][nc] || board[nr][nc][0] !== color)) {
        moves.push([nr, nc]);
      }
    }
  } else if(type === 'B' || type === 'Q') {
    for(const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
      for(let k=1; k<8; k++) {
        let nr = r + dr*k, nc = c + dc*k;
        if(!onBoard(nr,nc)) break;
        if(board[nr][nc]) {
          if(board[nr][nc][0] !== color) moves.push([nr,nc]);
          break;
        }
        moves.push([nr,nc]);
      }
    }
  }

  if(type === 'R' || type === 'Q') {
    for(const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      for(let k=1; k<8; k++) {
        let nr = r + dr*k, nc = c + dc*k;
        if(!onBoard(nr,nc)) break;
        if(board[nr][nc]) {
          if(board[nr][nc][0] !== color) moves.push([nr,nc]);
          break;
        }
        moves.push([nr,nc]);
      }
    }
  }

  if(type === 'K') {
    for(let dr=-1; dr<=1; dr++) {
      for(let dc=-1; dc<=1; dc++) {
        if(dr !== 0 || dc !== 0) {
          let nr = r + dr, nc = c + dc;
          if(onBoard(nr,nc) && (!board[nr][nc] || board[nr][nc][0] !== color)) {
            moves.push([nr,nc]);
          }
        }
      }
    }

    // Roque
    if(state.castlingRights) {
      const colorKey = color === 'w' ? 'w':'b';
      const backRow = color === 'w' ? 7 : 0;

      if(state.castlingRights[colorKey + "K"] &&
         !board[backRow][5] && !board[backRow][6] &&
         !isSquareAttacked(board, backRow, 4, opposite(color)) &&
         !isSquareAttacked(board, backRow, 5, opposite(color)) &&
         !isSquareAttacked(board, backRow, 6, opposite(color)) &&
         board[backRow][7] === color + 'R')
      {
        moves.push([backRow,6]);
      }

      if(state.castlingRights[colorKey + "Q"] &&
         !board[backRow][1] && !board[backRow][2] && !board[backRow][3] &&
         !isSquareAttacked(board, backRow, 4, opposite(color)) &&
         !isSquareAttacked(board, backRow, 3, opposite(color)) &&
         !isSquareAttacked(board, backRow, 2, opposite(color)) &&
         board[backRow][0] === color + 'R')
      {
        moves.push([backRow,2]);
      }
    }
  }
  return moves;
}

function movePiece(board, from, to) {
  let nb = copyBoard(board);
  nb[to[0]][to[1]] = nb[from[0]][from[1]];
  nb[from[0]][from[1]] = null;
  return nb;
}

function findKing(board, color) {
  for(let r=0; r<8; r++)
    for(let c=0; c<8; c++)
      if(board[r][c] === color + 'K') return [r,c];
  return null;
}

function isSquareAttacked(board, r, c, byColor) {
  let pieces = getPieces(board, byColor);
  for(let [rr, cc] of pieces) {
    let moves = legalMovesRaw(board, rr, cc);
    for(let [mr, mc] of moves) {
      if(mr === r && mc === c) return true;
    }
  }
  return false;
}

function inCheck(board, color) {
  let kingPos = findKing(board, color);
  if(!kingPos) return false;
  return isSquareAttacked(board, kingPos[0], kingPos[1], opposite(color));
}

function legalMoves(board, r, c, prevMoves=[], state={}) {
  let piece = board[r][c];
  if(!piece) return [];
  let color = piece[0];
  let rawMoves = legalMovesRaw(board, r, c, state);

  let legal = [];
  for(let mv of rawMoves) {
    let newBoard = movePiece(board, [r,c], mv);
    if(!inCheck(newBoard, color)) legal.push(mv);
  }
  return legal;
}

window.chessEngine = {
  PIECES,
  defaultBoard,
  getPieces,
  legalMoves,
  legalMovesRaw,
  movePiece,
  inCheck,
  onBoard,
  opposite,
  copyBoard,
};
