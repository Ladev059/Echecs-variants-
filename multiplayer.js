// multiplayer.js
let gameRef=null,gameIdInUse="default";

function joinGame(id){
  gameIdInUse=id||"default";
  gameRef=firebase.database().ref("games/"+gameIdInUse);
}
function sendMove(m){
  if(!gameRef)return;
  gameRef.child("moves").transaction(ms=>{
    if(!ms)ms=[];
    ms.push(m);
    return ms;
  });
}
function listenToMoves(){
  if(!gameRef)return;
  gameRef.child("moves").on("value",s=>{
    const moves=s.val()||[];
    if(typeof window.onMovesUpdated==="function")
      window.onMovesUpdated(moves);
  });
}
function resetGameDb(){
  if(!gameRef)return;
  gameRef.child("moves").set([]);
}

window.joinGame=joinGame;
window.sendMove=sendMove;
window.listenToMoves=listenToMoves;
window.resetGameDb=resetGameDb;
