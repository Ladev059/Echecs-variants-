window.crazyhouse = {
  init(chess) {
    chess.hands = {w: [], b: []};
    chess.capturing = false;
  },

  renderHand(chess, elHand) {
    elHand.innerHTML = '';
    const color = chess.turn;
    if(chess.hands[color].length === 0) return;

    const label = document.createElement('span');
    label.textContent = 'Réserve : ';
    label.style.marginRight = '8px';
    elHand.appendChild(label);

    chess.hands[color].forEach(type => {
      const img = document.createElement('img');
      img.src = window.chessEngine.PIECES[color + type];
      img.className = 'hand-piece';
      img.alt = (color === 'w' ? 'Blanc ' : 'Noir ') + ({
        K:'Roi', Q:'Dame', R:'Tour', B:'Fou', N:'Cavalier', P:'Pion'
      })[type] || 'Pièce';
      img.onclick = () => {
        chess.capturing = chess.capturing === type ? false : type;
        this.renderHand(chess, elHand);
      };
      if(chess.capturing === type) img.classList.add('selected');
      elHand.appendChild(img);
    });
  },

  onMove(chess, from, to) {
    const captured = chess.board[to[0]][to[1]];
    if(captured && captured[0] !== chess.turn) {
      chess.hands[chess.turn].push(captured[1]);
    }

    return window.doMove(from, to);
  },

  legalMoves(board, r, c, chess, state) {
    if(chess.capturing) return [];
    return window.chessEngine.legalMoves(board, r, c, chess.prevMove, state);
  }
};
