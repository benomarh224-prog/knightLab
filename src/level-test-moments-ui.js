import { Chess } from 'chess.js';
import { pieceSvg } from './pieces.js';
import { squareGrid } from './square-practice.js';
import { levelTestMomentDetails } from './level-test-moments.js';

export function renderLevelTestMoments(root, moments, startPractice, { showEmpty = false } = {}) {
  const list = root.querySelector('.level-moments-list');
  const empty = root.querySelector('.level-moments-empty');
  const entries = Array.isArray(moments) ? moments.slice(0, 2).map(levelTestMomentDetails).filter(Boolean) : [];
  root.hidden = !entries.length && !showEmpty;
  empty.hidden = Boolean(entries.length);
  list.replaceChildren();
  for (const { played, title, explanation, alternative, exercise } of entries) {
    const entry = root.ownerDocument.getElementById('level-moment-template').content.cloneNode(true);
    const board = entry.querySelector('.level-moment-board');
    const chess = new Chess(played.after);
    board.setAttribute('aria-label', `Board after ${title}, from ${played.color === 'w' ? 'White' : 'Black'}’s side`);
    board.innerHTML = squareGrid(played.color).map(square => {
      const dark = (square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 1;
      const last = square === played.from || square === played.to;
      const piece = chess.get(square);
      return `<span class="square${dark ? ' dark' : ''}${last ? ' last' : ''}" aria-hidden="true">${piece ? pieceSvg(piece) : ''}</span>`;
    }).join('');
    entry.querySelector('h4').textContent = title;
    entry.querySelector('.level-moment-reason').textContent = explanation;
    entry.querySelector('.level-moment-alternative').textContent = alternative;
    const tryButton = entry.querySelector('button');
    tryButton.setAttribute('aria-label', `Try from here, before ${title}`);
    tryButton.onclick = () => startPractice(exercise, tryButton);
    list.append(entry);
  }
}
