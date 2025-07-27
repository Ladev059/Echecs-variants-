// randomchess.js
window.randomchess = {
  onSquareClick(ch,[r,c]){
    const p=ch.board[r][c];
    if(!p||p[0]!==ch.turn){window.notify("Passe");return;}
    const mvs=window.chessEngine.legalMoves(ch.board,r,c,[],{castlingRights:ch.castlingRights,enPassantTarget:ch.enPassantTarget});
    if(!mvs.length){window.notify("Aucun");return;}
    const mv=mvs[Math.floor(Math.random()*mvs.length)];
    window.doMove([r,c],mv);
    ch.selected=null;ch.legal=null;
    ch.turn=window.chessEngine.opposite(ch.turn);
    window.notify("Coup aléatoire");
    checkGameEnd();updateUI();
  },
  legalMoves(b,r,c,ch,state){
    return window.chessEngine.legalMoves(b,r,c,ch.prevMove,state);
  }
};
