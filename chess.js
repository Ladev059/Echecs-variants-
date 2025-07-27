// chess.js – moteur de base avec roque, prise en passant, promotion, détection d'échec

const PIECES = {
  wK: 'white-king.png', wQ: 'white-queen.png', wR: 'white-rook.png',
  wB: 'white-bishop.png', wN: 'white-knight.png', wP: 'white-pawn.png',
  bK: 'black-king.png', bQ: 'black-queen.png', bR: 'black-rook.png',
  bB: 'black-bishop.png', bN: 'black-knight.png', bP: 'black-pawn.png'
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

function onBoard(r,c) {
  return r>=0 && r<8 && c>=0 && c<8;
}

function getPieces(board, color) {
  const res = [];
  for (let r=0; r<8; r++) {
    for (let c=0; c<8; c++) {
      const p = board[r][c];
      if (p && p[0]===color) res.push([r,c,p]);
    }
  }
  return res;
}

function legalMovesRaw(board, r, c, state={}) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = piece[0], type = piece[1];
  const moves = [];
  const forward = color==='w' ? -1 : 1;

  if (type==='P') {
    // avance
    if (onBoard(r+forward,c) && !board[r+forward][c]) moves.push([r+forward,c]);
    // capture diagonale
    for (let dc of [-1,1]) {
      const nr=r+forward, nc=c+dc;
      if(onBoard(nr,nc) && board[nr][nc] && board[nr][nc][0]!==color)
        moves.push([nr,nc]);
    }
    // double pas
    if (((color==='w'&&r===6)||(color==='b'&&r===1)) &&
        !board[r+forward][c] && !board[r+2*forward][c])
      moves.push([r+2*forward,c]);
    // en passant
    if (state.enPassantTarget) {
      const [er,ec]=state.enPassantTarget;
      if (er===r+forward && Math.abs(ec-c)===1)
        moves.push([er,ec]);
    }
  } else if (type==='N') {
    for (let dr of [-2,-1,1,2]) for (let dc of [-2,-1,1,2]) {
      if (Math.abs(dr)!==Math.abs(dc)) {
        const nr=r+dr, nc=c+dc;
        if(onBoard(nr,nc) && (!board[nr][nc]||board[nr][nc][0]!==color))
          moves.push([nr,nc]);
      }
    }
  } else if (type==='B'||type==='Q') {
    for (let [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
      for (let k=1; k<8; k++) {
        const nr=r+dr*k, nc=c+dc*k;
        if(!onBoard(nr,nc)) break;
        if(board[nr][nc]) {
          if(board[nr][nc][0]!==color) moves.push([nr,nc]);
          break;
        }
        moves.push([nr,nc]);
      }
    }
  }
  if (type==='R'||type==='Q') {
    for (let [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      for (let k=1; k<8; k++) {
        const nr=r+dr*k, nc=c+dc*k;
        if(!onBoard(nr,nc)) break;
        if(board[nr][nc]) {
          if(board[nr][nc][0]!==color) moves.push([nr,nc]);
          break;
        }
        moves.push([nr,nc]);
      }
    }
  }
  if (type==='K') {
    for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
      if(dr||dc) {
        const nr=r+dr, nc=c+dc;
        if(onBoard(nr,nc) && (!board[nr][nc]||board[nr][nc][0]!==color))
          moves.push([nr,nc]);
      }
    }
    if (state.castlingRights) {
      const back = color==='w'?7:0, ck=color+'K', cq=color+'Q';
      // petit roque
      if (state.castlingRights[ck] &&
          !board[back][5]&&!board[back][6]&&
          !isSquareAttacked(board,back,4,opposite(color))&&
          !isSquareAttacked(board,back,5,opposite(color))&&
          !isSquareAttacked(board,back,6,opposite(color))&&
          board[back][7]===color+'R')
        moves.push([back,6]);
      // grand roque
      if (state.castlingRights[cq] &&
          !board[back][1]&&!board[back][2]&&!board[back][3]&&
          !isSquareAttacked(board,back,4,opposite(color))&&
          !isSquareAttacked(board,back,3,opposite(color))&&
          !isSquareAttacked(board,back,2,opposite(color))&&
          board[back][0]===color+'R')
        moves.push([back,2]);
    }
  }
  return moves;
}

function movePiece(board,from,to) {
  const nb=copyBoard(board);
  nb[to[0]][to[1]] = nb[from[0]][from[1]];
  nb[from[0]][from[1]] = null;
  return nb;
}

function findKing(board,color) {
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]===color+'K')return[r,c];
  return null;
}

function isSquareAttacked(board,r,c,by) {
  for(let [rr,cc,p] of getPieces(board,by)) {
    for(let [mr,mc] of legalMovesRaw(board,rr,cc)) {
      if(mr===r&&mc===c) return true;
    }
  }
  return false;
}

function inCheck(board,color) {
  const kp=findKing(board,color);
  return kp?isSquareAttacked(board,kp[0],kp[1],opposite(color)):false;
}

function legalMoves(board,r,c,prev=[],state={}) {
  const piece=board[r][c]; if(!piece)return[];
  const color=piece[0];
  const raw=legalMovesRaw(board,r,c,state);
  const legal=[];
  for(let mv of raw) {
    const nb=movePiece(board,[r,c],mv);
    if(!inCheck(nb,color)) legal.push(mv);
  }
  return legal;
}

window.chessEngine = {
  PIECES, defaultBoard, getPieces, legalMoves, legalMovesRaw,
  movePiece, inCheck, onBoard, opposite, copyBoard
};
