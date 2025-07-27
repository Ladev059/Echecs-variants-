// hiddenqueen.js
window.hiddenqueen = {
  init(ch){
    ch.hiddenQueen={w:null,b:null};
    ch.selectingHQ="w";
    window.notify("Blancs : choisissez Dame Cachée");
  },
  onSquareClick(ch,[r,c]){
    if(!ch.selectingHQ)return false;
    const p=ch.board[r][c];
    if(p&&p[0]===ch.selectingHQ&&p[1]==='P'){
      ch.hiddenQueen[ch.selectingHQ]=[r,c];
      window.notify((ch.selectingHQ==="w"?"Blancs":"Noirs")+" : Dame placée");
      if(ch.selectingHQ==="w"){ch.selectingHQ="b";ch.turn="b";window.notify("Noirs : choisissez");}
      else{ch.selectingHQ=null;ch.turn="w";window.notify("Début");}
      return true;
    }
    window.notify("Choisissez un pion");
    return false;
  },
  legalMoves(b,r,c,ch,state){
    return ch.selectingHQ?[]:window.chessEngine.legalMoves(b,r,c,ch.prevMove,state);
  },
  onMove(ch,from,to){
    const p=ch.board[from[0]][from[1]];
    const hq=ch.hiddenQueen[ch.turn];
    if(hq&&from[0]===hq[0]&&from[1]===hq[1]&&p[1]==='P'){
      const dr=Math.abs(to[0]-from[0]),dc=Math.abs(to[1]-from[1]);
      if(dr>1||dc>1){ch.board[from[0]][from[1]]=ch.turn+'Q';window.notify("Révélée");}
    }
    return window.doMove(from,to);
  }
};
