import { Variation } from './variation.js';
import { Engine } from './engine.js';
import { formatEvaluation, uciToSan } from './game.js';
import { pieceSvg } from './pieces.js';
import { pieceNames } from './training.js';

const $ = id => document.getElementById(id);
export function createExploreUI({ context, pause, resume, playSound }) {
  const dialog = $('explore-dialog');
  let variation, selected = null, promotion = null, flipped = false, engine = null;
  let result = null, busy = false, run = 0, savedGame = null, resumeReview = false;
  function cancel() { run++; engine?.destroy(); engine = null; busy = false; }
  function reset() { resumeReview = false; cancel(); if (dialog.open) dialog.close(); variation = null; }
  function render(focusSquare) {
    if (!variation) return;
    focusSquare ||= document.activeElement?.closest('#explore-board [data-square]')?.dataset.square;
    const chess = variation.chess, files = flipped ? 'hgfedcba' : 'abcdefgh';
    const ranks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
    const targets = new Set(selected ? variation.legal(selected).map(move => move.to) : []);
    const last = variation.moves.at(-1), tabSquare = focusSquare || selected || files[0] + ranks[7];
    let html = '';
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const square = files[f] + ranks[r], piece = chess.get(square);
      const label = `${square}, ${piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${pieceNames[piece.type]}` : 'empty'}${targets.has(square) ? ', legal destination' : ''}`;
      html += `<button class="square practice-square${(files.charCodeAt(f)-97+ranks[r])%2 === 1 ? ' dark' : ''}${selected === square ? ' piece-selected' : ''}${targets.has(square) ? ' legal-target' : ''}${last && [last.from,last.to].includes(square) ? ' last' : ''}" data-square="${square}" tabindex="${square === tabSquare ? 0 : -1}" aria-label="${label}" aria-pressed="${selected === square}">${f === 0 ? `<span class="rank" aria-hidden="true">${ranks[r]}</span>` : ''}${r === 7 ? `<span class="file" aria-hidden="true">${files[f]}</span>` : ''}${piece ? pieceSvg(piece) : ''}</button>`;
    }
    $('explore-board').innerHTML = html;
    $('explore-turn').textContent = variation.ending || `${chess.turn() === 'w' ? 'White' : 'Black'} to move${chess.isCheck() ? ' · Check' : ''}`;
    $('explore-evaluation').textContent = result ? formatEvaluation(result) : busy ? 'Thinking…' : '—';
    $('explore-best').textContent = variation.ending ? 'This position has ended.' : result ? `Best move: ${uciToSan(variation.fen, result.best)} · Depth ${result.depth}` : 'Evaluating this position';
    $('explore-line').textContent = variation.moves.length ? variation.moves.map((move, index) => `${move.color === 'w' ? move.before.split(' ')[5] + '.' : index === 0 ? move.before.split(' ')[5] + '…' : ''} ${move.san}`).join(' ').trim() : 'Your variation will appear here.';
    $('explore-undo').disabled = !variation.moves.length;
    $('explore-reset').disabled = !variation.moves.length;
    $('explore-reply').disabled = busy || Boolean(variation.ending) || Boolean(promotion) || !result?.best;
    $('explore-reply').textContent = busy ? 'Stockfish is thinking…' : 'Play engine reply';
    $('explore-promotion').hidden = !promotion;
    if (focusSquare) $('explore-board').querySelector(`[data-square="${focusSquare}"]`)?.focus({ preventScroll: true });
  }
  async function evaluate() {
    cancel(); result = null;
    if (variation.ending === 'Draw') {
      result = { cp: 0, mate: null, terminal: true }; render(); return;
    }
    const current = run, snapshot = variation.snapshot(), active = new Engine();
    engine = active; busy = true; render();
    try {
      const score = await active.evaluate(snapshot.fen, 650);
      if (current !== run || !variation?.matches(snapshot)) return;
      result = score;
    } catch (error) {
      if (current === run) $('explore-feedback').textContent = `${error.message} Move a piece or reset to try again.`;
    } finally {
      active.destroy();
      if (current === run) { engine = null; busy = false; render(); }
    }
  }
  function afterMove(move) {
    selected = null; promotion = null; playSound(move);
    $('explore-feedback').textContent = `${move.san} played. Try the other side or ask Stockfish for a reply.`;
    evaluate();
  }
  function attempt(from, to, piece) {
    const outcome = variation.play(from, to, piece);
    if (outcome.status === 'promotion') { promotion = { from, to }; render(); $('explore-promotion').querySelector('button').focus(); }
    else if (outcome.status === 'played') afterMove(outcome.move);
    else { $('explore-feedback').textContent = 'Choose a highlighted legal destination.'; render(from); }
  }
  $('try-move').onclick = () => {
    const current = context(); savedGame = current.parsed; resumeReview = pause();
    variation = new Variation(current.parsed.fens[current.ply]); flipped = current.flipped;
    selected = null; promotion = null; result = null;
    $('explore-origin').textContent = `From game position ${current.ply} · Original game preserved`;
    $('explore-feedback').textContent = 'Tap a piece, then a highlighted square. You can play both sides.';
    dialog.showModal(); evaluate();
  };
  $('explore-board').onclick = event => {
    const button = event.target.closest('[data-square]'); if (!button || !variation || promotion || variation.ending) return;
    const square = button.dataset.square, piece = variation.chess.get(square);
    if (selected === square) { selected = null; render(square); }
    else if (piece?.color === variation.chess.turn()) { selected = square; render(square); }
    else if (selected) attempt(selected, square);
  };
  $('explore-board').onkeydown = event => {
    const shifts = { ArrowLeft:-1, ArrowRight:1, ArrowUp:-8, ArrowDown:8 };
    if (!(event.key in shifts)) return;
    const buttons = [...$('explore-board').querySelectorAll('[data-square]')], index = buttons.indexOf(event.target), next = index + shifts[event.key];
    if (index < 0) return; event.preventDefault();
    if (next < 0 || next > 63 || Math.abs(shifts[event.key]) === 1 && Math.floor(index/8) !== Math.floor(next/8)) return;
    buttons.forEach((button,i) => button.tabIndex = i === next ? 0 : -1); buttons[next].focus();
  };
  document.querySelectorAll('[data-explore-promotion]').forEach(button => button.onclick = () => { if (promotion) attempt(promotion.from, promotion.to, button.dataset.explorePromotion); });
  $('explore-reply').onclick = () => {
    if (busy || !result?.best || !variation || promotion) return;
    const outcome = variation.engineMove(result.best, variation.snapshot());
    if (outcome.status === 'played') afterMove(outcome.move);
  };
  $('explore-undo').onclick = () => { const move = variation.undo(); if (!move) return; selected = null; promotion = null; playSound(move); $('explore-feedback').textContent = 'Move undone. Try a different idea.'; evaluate(); };
  $('explore-reset').onclick = () => { variation.reset(); selected = null; promotion = null; $('explore-feedback').textContent = 'Back to the game position. Try another move.'; evaluate(); };
  $('explore-flip').onclick = () => { flipped = !flipped; render(); };
  dialog.addEventListener('close', () => { cancel(); variation = null; if (resumeReview && savedGame === context().parsed) resume(); resumeReview = false; });
  return { reset };
}
