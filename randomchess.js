window.randomchess = {
  onSquareClick(chess, [r,c]) {
    const piece = chess.board[r][c];
    if(!piece || piece[0] !== chess.turn) {
      window.notify("Choisissez une de vos pièces !");
      return;
    }

    let moves = window.chessEngine.legalMoves(chess.board, r, c, [], {
      castlingRights: chess.castlingRights,
      enPassantTarget: chess.enPassantTarget
    });
    if(moves.length === 0){
      window.notify("Aucun coup disponible pour cette pièce !");
      return;
    }

    // Coup aléatoire avec promotion automatique aléatoire
    const idx = Math.floor(Math.random() * moves.length);
    const [tr, tc] = moves[idx];

    // Test promotion auto
    let newBoard = window.chessEngine.copyBoard(chess.board);
    newBoard[tr][tc] = piece;
    newBoard[r][c] = null;
    if(piece[1] === 'P' && (tr === 0 || tr === 7)) {
      const promos = ['Q','R','B','N'];
      const promoIndex = Math.floor(Math.random()*promos.length);
      newBoard[tr][tc] = piece[0] + promos[promoIndex];
      window.notify("Promotion aléatoire en " + promos[promoIndex]);
    }

    if(window.chessEngine.inCheck(newBoard, piece[0])) {
      window.notify("Mouvement interdit : roi en échec !");
      return;
    }

    chess.board = newBoard;
    chess.prevMove = [[r,c],[tr,tc]];
    chess.turn = window.chessEngine.opposite(chess.turn);
    chess.selected = null;
    chess.legal = null;

    notify("Mouvement aléatoire joué.");

    checkGameEnd();
    updateUI();
  },

  legalMoves(board, r, c, chess, state){
    return window.chessEngine.legalMoves(board, r, c, chess.prevMove, state);
  },
};
