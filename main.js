// main.js
function getGameIdFromUrl(){
  const m=window.location.search.match(/[?&]game=([^&#]+)/i);
  return m?m[1]:"default";
}
const gameId=getGameIdFromUrl(),
      isMultiplayer=!!gameId;
let myColor=null,chess=null,variantLogic=null,promotionPending=null;

const pageWelcome=document.getElementById("page-welcome"),
      pageSelection=document.getElementById("page-selection"),
      pageGame=document.getElementById("page-game"),
      btnToSel=document.getElementById("btn-to-selection"),
      btnBack=document.getElementById("btn-back-welcome"),
      notifEl=document.getElementById("notification"),
      turnEl=document.getElementById("turn-indicator"),
      handArea=document.getElementById("hand-area"),
      boardEl=document.getElementById("board"),
      restartBtn=document.getElementById("restart"),
      promoModal=document.getElementById("promotion-modal"),
      promoOpts=document.getElementById("promotion-options");

const promoPieces=['Q','R','B','N'],pcUnicode={Q:'♕',R:'♖',B:'♗',N:'♘'};

(function genPromoBtns(){
  promoOpts.innerHTML="";
  promoPieces.forEach(p=>{
    const b=document.createElement("button");
    b.innerHTML=`<span class="promotion-piece">${pcUnicode[p]}</span>`;
    b.title={Q:"Dame",R:"Tour",B:"Fou",N:"Cavalier"}[p];
    b.onclick=()=>applyPromotion(p);
    promoOpts.appendChild(b);
  });
})();

if(isMultiplayer){window.joinGame(gameId);window.listenToMoves();}

btnToSel.onclick=()=>showPage(pageSelection);
btnBack.onclick=()=>showPage(pageWelcome);
restartBtn.onclick=()=>{
  chess=null;variantLogic=null;promotionPending=null;
  hidePromotionModal();showPage(pageSelection);clearNotification();
};

function notify(m){
  notifEl.textContent=m;
  setTimeout(()=>{if(notifEl.textContent===m)notifEl.textContent="";},3000);
}
function clearNotification(){notifEl.textContent="";}
function showPage(p){[pageWelcome,pageSelection,pageGame].forEach(x=>x.classList.remove("active"));p.classList.add("active");}

function applyPromotion(pt){
  const {from,to,color,state}=promotionPending;
  promotionPending=null;hidePromotionModal();
  const nb=window.chessEngine.copyBoard(chess.board);
  nb[to[0]][to[1]]=color+pt;nb[from[0]][from[1]]=null;
  if(window.chessEngine.inCheck(nb,color)){notify("Promotion refusée : échec");return;}
  chess.board=nb;chess.turn=window.chessEngine.opposite(color);
  chess.prevMove=[from,to];
  chess.castlingRights=state.castlingRights;
  chess.enPassantTarget=state.enPassantTarget;
  updatePosHistAndHalfClock(false,true);
  updateUI();checkGameEnd();
}

function startGame(v){
  chess={
    board:window.chessEngine.defaultBoard(),
    turn:'w',selected:null,legal:null,prevMove:[],
    hands:{w:[],b:[]},capturing:false,
    hiddenQueen:{w:null,b:null},selectingHQ:null,
    castlingRights:{wK:true,wQ:true,bK:true,bQ:true},
    enPassantTarget:null,gameEnded:false,
    halfMoveClock:0,positionHistory:[],update:updateUI
  };
  variantLogic=v==="crazyhouse"?window.crazyhouse:
               v==="hiddenqueen"?window.hiddenqueen:
               v==="randomchess"?window.randomchess:{};
  if(variantLogic.init)variantLogic.init(chess);
  chess.positionHistory.push(boardToHash(chess.board,chess.turn,chess.castlingRights,chess.enPassantTarget));
  if(isMultiplayer)window.resetGameDb();
  showPage(pageGame);updateUI();
}

function updatePosHistAndHalfClock(capOrPawn=false,promo=false){
  if(capOrPawn||promo)chess.halfMoveClock=0;else chess.halfMoveClock++;
  chess.positionHistory.push(boardToHash(chess.board,chess.turn,chess.castlingRights,chess.enPassantTarget));
}

function boardToHash(b,t,cr,ep){return JSON.stringify({b,t,cr,ep});}

function updateUI(){
  renderBoard();turnEl.textContent=chess.turn==='w'?"Tour des Blancs":"Tour des Noirs";
  if(variantLogic.renderHand)variantLogic.renderHand(chess,handArea);else handArea.innerHTML="";
}

function renderBoard(){
  boardEl.innerHTML="";const b=chess.board;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const sq=document.createElement("div");
    sq.className="square "+((r+c)%2?"dark":"");
    sq.dataset.row=r;sq.dataset.col=c;
    if(chess.selected&&chess.selected[0]===r&&chess.selected[1]===c)sq.classList.add("selected");
    if(chess.legal&&chess.legal.some(m=>m[0]===r&&m[1]===c))sq.classList.add("legal");
    const p=b[r][c];
    if(p){
      const img=document.createElement("img");img.className="piece";
      img.src=window.chessEngine.PIECES[p];img.alt=p;img.draggable=false;
      sq.appendChild(img);
    }
    sq.onclick=()=>{if(!chess.gameEnded)handleSquareClick(r,c);};
    boardEl.appendChild(sq);
  }
}

window.onMovesUpdated=moves=>{
  resetGame();let turn='w';
  moves.forEach(m=>{applyMoveLocally(m);turn=turn==='w'?'b':'w';});
  if(myColor===null&&isMultiplayer)myColor=(moves.length%2?'b':'w');
  turnEl.textContent=turn==='w'?"Tour Blancs":"Tour Noirs";
  document.getElementById("notification").textContent=myColor===turn?"À vous":"Attente";
};

function handleSquareClick(r,c){
  const p=chess.board[r][c];
  if(!chess.selected){
    if(p&&p[0]===chess.turn)selectPiece(r,c);
    return;
  }
  if(chess.selected[0]===r&&chess.selected[1]===c){deselectPiece();return;}
  if(p&&p[0]===chess.turn){selectPiece(r,c);return;}
  if(chess.legal.some(m=>m[0]===r&&m[1]===c)){
    const mv={from:chess.selected,to:[r,c]};
    if(isMultiplayer){mv.color=myColor;window.sendMove(mv);}
    else{applyMoveLocally(mv);updateUI();checkGameEnd();}
    chess.selected=null;chess.legal=null;
  } else notify("Illégal");
}

function selectPiece(r,c){
  chess.selected=[r,c];
  chess.legal=(variantLogic.legalMoves||window.chessEngine.legalMoves)
    (chess.board,r,c,chess.prevMove,{castlingRights:chess.castlingRights,enPassantTarget:chess.enPassantTarget});
  if(!chess.legal.length){notify("Aucun");deselectPiece();return;}
  updateUI();
}

function deselectPiece(){chess.selected=null;chess.legal=null;updateUI();}

function applyMoveLocally(m){
  doMove(m.from,m.to,m.promotion);
}

function doMove(from,to,promotion){
  let piece=chess.board[from[0]][from[1]];
  if(!piece)return;
  const color=piece[0],type=piece[1];
  const state={castlingRights:{...chess.castlingRights},enPassantTarget:chess.enPassantTarget};
  let nb=null;
  if(type==='K'&&Math.abs(to[1]-from[1])===2){
    nb=window.chessEngine.copyBoard(chess.board);
    let row=from[0];
    if(to[1]===6){
      nb[row][4]=null;nb[row][7]=null;nb[row][6]=color+'K';nb[row][5]=color+'R';
    } else {
      nb[row][4]=null;nb[row][0]=null;nb[row][2]=color+'K';nb[row][3]=color+'R';
    }
  } else {
    nb=window.chessEngine.copyBoard(chess.board);
    if(type==='P'&&chess.enPassantTarget&&to[0]===chess.enPassantTarget[0]&&to[1]===chess.enPassantTarget[1]){
      let dir=color==='w'?1:-1;nb[to[0]+dir][to[1]]=null;
    }
    nb[to[0]][to[1]]=piece;nb[from[0]][from[1]]=null;
  }
  if(promotion)nb[to[0]][to[1]]=color+promotion;
  if(window.chessEngine.inCheck(nb,color)){notify("Échec");return;}
  chess.board=nb;chess.prevMove=[from,to];
  updateCastlingRightsAfterMove(from,to,piece);
  manageEnPassant(from,to,piece);
  const capOrPawn=type==='P'||!!chess.prevMove;
  updatePosHistAndHalfClock(capOrPawn,!!promotion);
  chess.turn=window.chessEngine.opposite(chess.turn);
  updateUI();
}

function updateCastlingRightsAfterMove(from,to,p){
  if(p[1]==='K'){chess.castlingRights[p[0]+'K']=false;chess.castlingRights[p[0]+'Q']=false;}
  if(p[1]==='R'){
    let [r,c]=from,clr=p[0];
    if(r===(clr==='w'?7:0)){
      if(c===0)chess.castlingRights[clr+'Q']=false;
      if(c===7)chess.castlingRights[clr+'K']=false;
    }
  }
}
function manageEnPassant(from,to,p){
  chess.enPassantTarget=null;
  if(p[1]==='P'&&Math.abs(to[0]-from[0])===2)chess.enPassantTarget=[(from[0]+to[0])/2,from[1]];
}

function checkGameEnd(){
  if(chess.gameEnded)return;
  if(window.chessEngine.inCheck(chess.board,chess.turn)){
    notify("Échec");if(!hasAnyLegalMove(chess.board,chess.turn)){notify("Échec et mat");chess.gameEnded=true;return;}
  } else if(!hasAnyLegalMove(chess.board,chess.turn)){notify("Pat");chess.gameEnded=true;return;}
  const h=boardToHash(chess.board,chess.turn,chess.castlingRights,chess.enPassantTarget);
  if(chess.positionHistory.filter(x=>x===h).length>=3){notify("Nulle rép");chess.gameEnded=true;return;}
  if(chess.halfMoveClock>=100){notify("Nulle 50 coups");chess.gameEnded=true;return;}
}

function hasAnyLegalMove(b,clr){
  for(let [r,c] of window.chessEngine.getPieces(b,clr))
    if(window.chessEngine.legalMoves(b,r,c,[],{castlingRights:chess.castlingRights,enPassantTarget:chess.enPassantTarget}).length>0) return true;
  return false;
}

function handleHandPlacement(r,c){
  if(!chess.board[r][c]){
    chess.board[r][c]=chess.turn+chess.capturing;
    chess.hands[chess.turn].splice(chess.hands[chess.turn].indexOf(chess.capturing),1);
    chess.capturing=false;chess.turn=window.chessEngine.opposite(chess.turn);
    updateUI();checkGameEnd();
  } else notify("Case occupée");
}
