// multiplayer.js
let gameRef = null;
let gameIdInUse = "default";

function joinGame(gameId) {
  gameIdInUse = gameId || "default";
  gameRef = firebase.database().ref("games/" + gameIdInUse);
}

function sendMove(move) {
  if (!gameRef) return;
  gameRef.child("moves").transaction(moves => {
    if (!moves) moves = [];
    moves.push(move);
    return moves;
  });
}

function listenToMoves() {
  if (!gameRef) return;
  gameRef.child("moves").on("value", snapshot => {
    const moves = snapshot.val() || [];
    if (typeof window.onMovesUpdated === "function") {
      window.onMovesUpdated(moves);
    }
  });
}

function resetGameDb() {
  if (!gameRef) return;
  gameRef.child("moves").set([]);
}

window.joinGame = joinGame;
window.sendMove = sendMove;
window.listenToMoves = listenToMoves;
window.resetGameDb = resetGameDb;
