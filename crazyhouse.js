// crazyhouse.js
window.crazyhouse = {
  init(ch){
    ch.hands={w:[],b:[]};
    ch.capturing=false;
  },
  renderHand(ch,el){
    el.innerHTML="";
    if(!ch.hands[ch.turn].length)return;
    el.textContent="Réserve : ";
    ch.hands[ch.turn].forEach(tp=>{
      const img=document.createElement("img");
      img.src=window.chessEngine.PIECES[ch.turn+tp];
      img.className="hand-piece";
      img.alt=tp;img.onclick=()=>{
        ch.capturing=ch.capturing===tp?false:tp;
        this.renderHand(ch,el);
      };
      if(ch.capturing===tp)img.classList.add("selected");
      el.appendChild(img);
    });
  },
  onMove(ch,from,to){
    const cap=ch.board[to[0]][to[1]];
    if(cap&&cap[0]!==ch.turn)ch.hands[ch.turn].push(cap[1]);
    return window.doMove(from,to);
  },
  legalMoves(b,r,c,ch,state){
    return ch.capturing?[]:window.chessEngine.legalMoves(b,r,c,ch.prevMove,state);
  }
};
