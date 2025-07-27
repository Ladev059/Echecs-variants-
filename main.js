// main.js : gestion UI, variante, multijoueur, règles spéciales

// --- Variables globales ---
let currentVariant = null;
let chess = null;
let variantLogic = null;

const pageWelcome = document.getElementById('page-welcome');
const pageSelection = document.getElementById('page-selection');
const pageGame = document.getElementById('page-game');
const btnToSelection = document.getElementById('btn-to-selection');
const btnBackWelcome = document.getElementById('btn-back-welcome');
const notificationEl = document.getElementById('notification');
const turnIndicator = document.getElementById('turn-indicator');
const handArea = document.getElementById('hand-area');
const boardEl = document.getElementById('board');
const restartBtn = document.getElementById('restart');

const promotionModal = document.getElementById('promotion-modal');
const promotionOptionsContainer = document.getElementById('promotion-options');

const promotionPieces = ['Q','R','B','N'];
const pieceUnicode = {Q:'♕', R:'♖', B:'♗', N:'♘'};

let promotionPending = null;

let gameId = getGameIdFromUrl();
const isMultiplayer = !!gameId;
let myColor = null; // 'w' ou 'b'

// Génération boutons promotion (une fois)
(function generatePromotionButtons() {
  promotionOptionsContainer.innerHTML = '';
  promotionPieces.forEach(piece => {
    const btn = document.createElement('button');
    btn.innerHTML = `<span class="promotion-piece">${pieceUnicode[piece]}</span>`;
    btn.title = piece === "Q" ? "Dame" :
                piece === "R" ? "Tour" :
                piece === "B" ? "Fou" : "Cavalier";
    btn.onclick = () => applyPromotion(piece);
    promotionOptionsContainer.appendChild(btn);
  });
})();

// Si multijoueur, connecte-toi à Firebase
if(isMultiplayer){
  window.joinGame(gameId);
  window.listenToMoves();
}

btnToSelection.onclick = () => showPage(pageSelection);
btnBackWelcome.onclick = () => showPage(pageWelcome);
restartBtn.onclick = () => {
  chess = null;
  variantLogic = null;
  currentVariant = null;
  promotionPending = null;
  hidePromotionModal();
  showPage(pageSelection);
  clearNotification();
};

function getGameIdFromUrl() {
  const match = window.location.search.match(/[?&]game=([^&#]+)/i);
  return match ? match[1] : "default";
}

function notify(msg) {
  clearNotification();
  notificationEl.textContent = msg;
  setTimeout(() => {
    if(notificationEl.textContent === msg) notificationEl.textContent = '';
  }, 3500);
}
function clearNotification() { notificationEl.textContent = ''; }
function showPage(page) {
  [pageWelcome, pageSelection, pageGame].forEach(p => p.classList.remove('active'));
  page.classList.add('active');
}

function updateTurnIndicator() {
  turnIndicator.textContent = chess.turn === 'w' ? 'Tour des Blancs' : 'Tour des Noirs';
}

function showPromotionModal() { promotionModal.classList.remove('hidden'); }
function hidePromotionModal() { promotionModal.classList.add('hidden'); }

function applyPromotion(pieceType){
  if(!promotionPending) return;
  const {from,to,color,state} = promotionPending;
  promotionPending=null;
  hidePromotionModal();

  let newBoard = window.chessEngine.copyBoard(chess.board);
  newBoard[to[0]][to[1]] = color + pieceType;
  newBoard[from[0]][from[1]] = null;

  if(window.chessEngine.inCheck(newBoard, color)){
    notify("Promotion refusée : roi en échec !");
    return;
  }

  chess.board = newBoard;
  chess.turn = window.chessEngine.opposite(color);
  chess.prevMove = [from,to];
  chess.castlingRights = state.castlingRights;
  chess.enPassantTarget = state.enPassantTarget;

  updatePositionHistoryAndHalfMoveClock(false, true);
  updateUI();
  checkGameEnd();
}

function startGame(variant){
  currentVariant=variant;
  chess = {
    board: window.chessEngine.defaultBoard(),
    turn: 'w',
    selected: null,
    legal: null,
    prevMove: [],
    hands: {w: [], b: []},
    capturing: false,
    hiddenQueen: {w:null, b:null},
    selectingHQ: null,
    castlingRights: {wK:true, wQ:true, bK:true, bQ:true},
    enPassantTarget: null,
    gameEnded: false,
    halfMoveClock: 0,
    positionHistory: [],
    update: updateUI,
  };

  variantLogic = null;
  if(variant === "crazyhouse") variantLogic = window.crazyhouse;
  else if(variant === "hiddenqueen") variantLogic = window.hiddenqueen;
  else if(variant === "randomchess") variantLogic = window.randomchess;

  if(variantLogic && variantLogic.init) variantLogic.init(chess);

  const startHash = boardToHash(chess.board, chess.turn, chess.castlingRights, chess.enPassantTarget);
  chess.positionHistory.push(startHash);

  if(isMultiplayer) window.resetGameDb();

  showPage(pageGame);
  updateUI();
}

function updatePositionHistoryAndHalfMoveClock(captureOrPawnMove=false, promotionMove=false){
  if(captureOrPawnMove || promotionMove){
    chess.halfMoveClock = 0;
  } else {
    chess.halfMoveClock++;
  }
  const hash = boardToHash(chess.board, chess.turn, chess.castlingRights, chess.enPassantTarget);
  chess.positionHistory.push(hash);
}

function boardToHash(board, turn, castlingRights, enPassantTarget){
  return JSON.stringify({board, turn, castlingRights, enPassantTarget});
}

function updateUI(){
  renderBoard();
  updateTurnIndicator();
  if(variantLogic && variantLogic.renderHand) variantLogic.renderHand(chess, handArea);
  else handArea.innerHTML = '';
}

function renderBoard(){
  boardEl.innerHTML = "";
  const b = chess.board;

  for(let r=0; r<8; r++){
    for(let c=0; c<8; c++){
      const sq = document.createElement("div");
      sq.className = "square "+((r+c)%2 === 1 ? "dark" : "");
      sq.dataset.row = r;
      sq.dataset.col = c;

      if(chess.selected && chess.selected[0] === r && chess.selected[1] === c) sq.classList.add("selected");
      if(chess.legal && chess.legal.some(([x,y])=>x===r && y===c)) sq.classList.add("legal");

      const p = b[r][c];
      if(p){
        const img = document.createElement("img");
        img.className = "piece";
        img.src = window.chessEngine.PIECES[p];
        img.alt = getAltTextForPiece(p);
        img.draggable = false;
        sq.appendChild(img);
      }

      sq.onclick = (e)=>{
        e.preventDefault();
        if(chess.gameEnded) return;
        handleSquareClick(r,c);
      };

      boardEl.appendChild(sq);
    }
  }
}

function getAltTextForPiece(p){
  const names = {K:"Roi", Q:"Dame", R:"Tour", B:"Fou", N:"Cavalier", P:"Pion"};
  const c = p[0]==="w" ? "Blanc" : "Noir";
  const n = names[p[1]] || "";
  return c+" "+n;
}

function handleSquareClick(r,c){
  if(isMultiplayer && currentVariant === "randomchess"){
    if(variantLogic && variantLogic.onSquareClick){
      variantLogic.onSquareClick(chess, [r,c]);
      updateUI();
      return;
    }
  }

  if(chess.capturing){
    handleHandPlacement(r,c);
    return;
  }

  if(chess.selectingHQ && variantLogic && variantLogic.onSquareClick){
    if(variantLogic.onSquareClick(chess, [r,c])){
      updateUI();
      return;
    }
  }

  const p = chess.board[r][c];

  if(!chess.selected){
    if(p && p[0] === chess.turn) selectPiece(r,c);
    return;
  }

  if(chess.selected[0]===r && chess.selected[1]===c){
    deselectPiece();
    return;
  }

  if(p && p[0] === chess.turn){
    selectPiece(r,c);
    return;
  }

  if(chess.legal && chess.legal.some(([x,y])=>x===r && y===c)){
    const move = {from: chess.selected, to: [r,c]};

    if(isMultiplayer){
      move.color = myColor;
      window.sendMove(move);
    } else {
      applyMoveLocally(move);
      updateUI();
      checkGameEnd();
    }

    chess.selected = null;
    chess.legal = null;
  } else {
    notify("Mouvement illégal !");
  }
}

function selectPiece(r,c){
  chess.selected = [r,c];
  chess.legal = (variantLogic && variantLogic.legalMoves) ?
    variantLogic.legalMoves(chess.board, r, c, chess, {castlingRights: chess.castlingRights, enPassantTarget: chess.enPassantTarget})
    : window.chessEngine.legalMoves(chess.board, r, c, chess.prevMove, {castlingRights: chess.castlingRights, enPassantTarget: chess.enPassantTarget});

  if(chess.legal.length === 0){
    notify("Aucun coup légal pour cette pièce.");
    deselectPiece();
    return;
  }
  updateUI();
}

function deselectPiece(){
  chess.selected = null;
  chess.legal = null;
  updateUI();
}

function applyMoveLocally(move){
  // Exemple simple : peut être remplacé par ta vraie méthode (doMove avec promotion)
  doMove(move.from, move.to, move.promotion);
}

function doMove(from, to, promotion){
  // Déplacement, touche roque, ép en passant et promotion déjà gérées ici (code moteur + main.js)
  // Implémentation conforme au code fourni précédemment (avec la gestion promotion via modale etc)
  // Pour simplification, voici un délégué type :

  let piece = chess.board[from[0]][from[1]];
  if(!piece) return false;

  const color = piece[0];
  const type = piece[1];
  const state = {
    castlingRights: {...chess.castlingRights},
    enPassantTarget: chess.enPassantTarget
  };

  let newBoard = null;
  if(type === 'K' && Math.abs(to[1] - from[1]) === 2) {
    let row = from[0];
    newBoard = window.chessEngine.copyBoard(chess.board);
    if(to[1] === 6){
      newBoard[row][4] = null;
      newBoard[row][7] = null;
      newBoard[row][6] = color + 'K';
      newBoard[row][5] = color + 'R';
    } else if(to[1] === 2){
      newBoard[row][4] = null;
      newBoard[row][0] = null;
      newBoard[row][2] = color + 'K';
      newBoard[row][3] = color + 'R';
    }
  } else {
    newBoard = window.chessEngine.copyBoard(chess.board);

    if(type === 'P' && chess.enPassantTarget && to[0] === chess.enPassantTarget[0] && to[1] === chess.enPassantTarget[1]) {
      let dir = color === 'w' ? 1 : -1;
      newBoard[to[0] + dir][to[1]] = null;
    }

    newBoard[to[0]][to[1]] = piece;
    newBoard[from[0]][from[1]] = null;
  }

  if(promotion){
    newBoard[to[0]][to[1]] = color + promotion;
  }

  if(window.chessEngine.inCheck(newBoard, color)){
    notify("Coup interdit : roi en échec !");
    return false;
  }

  chess.board = newBoard;
  chess.prevMove = [from,to];
  updateCastlingRightsAfterMove(from,to,piece);
  manageEnPassant(from,to,piece);

  // Mise à jour historique, compteur 50 coups
  const captureOrPawn = (chess.board[to[0]][to[1]] !== null && chess.board[to[0]][to[1]][1] !== "P") || (piece[1] === "P");
  updatePositionHistoryAndHalfMoveClock(captureOrPawn);

  chess.turn = window.chessEngine.opposite(chess.turn);
  updateUI();
  return true;
}

function updateCastlingRightsAfterMove(from, to, piece){
  if(piece[1] === "K"){
    chess.castlingRights[piece[0]+"K"] = false;
    chess.castlingRights[piece[0]+"Q"] = false;
  }
  if(piece[1] === "R"){
    let row = from[0], col = from[1], color=piece[0];
    if(row === (color === "w" ? 7 : 0)){
      if(col === 0) chess.castlingRights[color+"Q"] = false;
      else if(col === 7) chess.castlingRights[color+"K"]= false;
    }
  }
}

function manageEnPassant(from,to,piece){
  chess.enPassantTarget = null;
  if(piece[1]==="P" && Math.abs(to[0]-from[0])===2){
    chess.enPassantTarget = [(from[0]+to[0])/2, from[1]];
  }
}

function checkGameEnd(){
  if(chess.gameEnded) return;

  if(window.chessEngine.inCheck(chess.board, chess.turn)){
    notify("Échec !");
    if(!hasAnyLegalMove(chess.board, chess.turn)){
      notify(`Échec et mat ! ${chess.turn === 'w' ? "Les Noirs" : "Les Blancs"} gagnent.`);
      chess.gameEnded=true;
      return;
    }
  } else {
    if(!hasAnyLegalMove(chess.board, chess.turn)){
      notify("Pat ! Partie nulle.");
      chess.gameEnded=true;
      return;
    }
  }
  // Nulle par répétition
  const currentHash = boardToHash(chess.board, chess.turn, chess.castlingRights, chess.enPassantTarget);
  let repetitions = chess.positionHistory.filter(p=>p===currentHash).length;
  if(repetitions >= 3){
    notify("Nulle par répétition 3 fois.");
    chess.gameEnded=true;
    return;
  }
  // Règle 50 coups
  if(chess.halfMoveClock >= 100){
    notify("Nulle : règle des 50 coups.");
    chess.gameEnded=true;
    return;
  }
}

function hasAnyLegalMove(board, color){
  const pieces = window.chessEngine.getPieces(board, color);
  for(let [r,c] of pieces){
    if(window.chessEngine.legalMoves(board,r,c,[],{castlingRights: chess.castlingRights, enPassantTarget: chess.enPassantTarget}).length>0)
      return true;
  }
  return false;
}

function handleHandPlacement(r,c){
  if(!chess.board[r][c]){
    chess.board[r][c] = chess.turn + chess.capturing;
    const idx = chess.hands[chess.turn].indexOf(chess.capturing);
    if(idx !== -1) chess.hands[chess.turn].splice(idx,1);
    chess.capturing = false;
    chess.turn = window.chessEngine.opposite(chess.turn);
    updateUI();
    checkGameEnd();
  } else {
    notify("Case occupée !");
  }
}
