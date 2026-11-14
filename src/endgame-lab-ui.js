import { Chess } from 'chess.js';
import { ENDGAMES, endgameExample } from './endgame-lab.js';
import { pieceSvg } from './pieces.js';
import { squareGrid } from './square-practice.js';
import { animatePieces, moveTransitions } from './piece-motion.js';

export function createEndgameLab({ play, playSound, onComplete, doc = document }) {
  const get = id => doc.getElementById(id);
  const select = get('endgame-technique'), board = get('endgame-example');
  let technique, frames, index, painted;
  for (const item of ENDGAMES) {
    const option = doc.createElement('option');
    option.value = item.id;
    option.textContent = item.title;
    select.append(option);
  }
  function render(sound = false) {
    const { fen, move, note } = frames[index];
    const chess = new Chess(fen);
    const squares = squareGrid('w');
    board.innerHTML = squares.map((square,i) => {
      const dark = (square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 1;
      const last = square === move?.from || square === move?.to;
      const piece = chess.get(square);
      const rank = i%8===0 ? `<span class="rank">${square[1]}</span>` : '';
      const file = i>=56 ? `<span class="file">${square[0]}</span>` : '';
      return `<span class="square${dark?' dark':''}${last?' last':''}">${rank}${file}${piece?pieceSvg(piece):''}</span>`;
    }).join('');
    const position = { game:technique, fen, last:move, flipped:false };
    animatePieces(board, moveTransitions(painted, position));
    painted = position;
    const caption = move ? move.san : 'Starting position';
    board.setAttribute('aria-label', `Demonstration board. ${caption}. ${note}`);
    get('endgame-example-move').textContent = caption;
    get('endgame-note').textContent = note;
    get('endgame-previous').disabled = index === 0;
    get('endgame-next').disabled = index === frames.length - 1;
    if (sound && move) playSound(move);
  }
  function choose(id) {
    technique = ENDGAMES.find(item => item.id === id) || ENDGAMES[0];
    select.value = technique.id;
    get('endgame-goal').textContent = technique.goal;
    frames = endgameExample(technique);
    index = 0;
    painted = null;
    render();
  }
  select.onchange = () => choose(select.value);
  get('endgame-previous').onclick = () => { index--; render(); get('endgame-next').focus(); };
  get('endgame-next').onclick = () => { index++; render(true); if (get('endgame-next').disabled) get('endgame-previous').focus(); };
  get('endgame-practice').onclick = () => play({
    ...technique, endgame:technique, onComplete:outcome=>onComplete(technique,outcome),
  });
  return { open:choose };
}
