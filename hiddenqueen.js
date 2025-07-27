window.hiddenqueen = {
  init(chess) {
    chess.hiddenQueen = {w: null, b: null};
    chess.selectingHQ = 'w';
    window.notify("Blancs : choisissez votre pion 'Dame Cachée'");
  },

  onSquareClick(chess, [r,c]) {
    if(!chess.selectingHQ) return false;

    const piece = chess.board[r][c];
    if(piece && piece[0] === chess.selectingHQ && piece[1] === 'P'){
      chess.hiddenQueen[chess.selectingHQ] = [r,c];
      window.notify(`${chess.selectingHQ === 'w' ? 'Blancs' : 'Noirs'} : Dame Cachée placée.`);
      if(chess.selectingHQ === 'w'){
        chess.selectingHQ = 'b';
        chess.turn = 'b';
        window.notify("Noirs : choisissez votre pion 'Dame Cachée'");
      } else {
        chess.selectingHQ = null;
        chess.turn = 'w';
        window.notify("Début de la partie !");
      }
      return true;
    }
    window.notify("Choisissez un de vos pions !");
    return false;
  },

  legalMoves(board, r, c, chess, state) {
    if(chess.selectingHQ) return [];
    return window.chessEngine.legalMoves(board, r, c, chess.prevMove, state);
  },

  onMove(chess, from, to) {
    const piece = chess.board[from[0]][from[1]];
    if(chess.hiddenQueen[chess.turn] &&
       from[0] === chess.hiddenQueen[chess.turn][0] &&
       from[1] === chess.hiddenQueen[chess.turn][1] &&
       piece[1] === 'P') {

      let dr = Math.abs(to[0] - from[0]);
      let dc = Math.abs(to[1] - from[1]);
      if(dr > 1 || dc > 1) {
        chess.board[from[0]][from[1]] = chess.turn + 'Q';
        window.notify("Dame cachée révélée !");
      }
    }

    return window.doMove(from, to);
  }
};
