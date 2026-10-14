import { Chess } from 'chess.js';
import { PlaySession } from './play.js';
import { Engine } from './engine.js';
import { formatEvaluation, uciToSan } from './game.js';
import { pieceSvg } from './pieces.js';
import { pieceNames } from './training.js';

const $ = id => document.getElementById(id);
export function createExploreUI({ context, pause, resume, playSound }) {
  const dialog = $('explore-dialog');
  let variation, selected = null, promotion = null, flipped = false, engine = null;
  let result = null, busy = false, run = 0, savedGame = null, resumeReview = false;
  let originFen = null;
  function cancel() { run++; engine?.destroy(); engine = null; busy = false; }
  function reset() { resumeReview = false; cancel(); if (dialog.open) dialog.close(); variation = null; }
  function render(focusSquare) {
    if (!variation) return;
    focusSquare ||= document.activeElement?.closest('#explore-board [data-square]')?.dataset.square;
    const chess = variation.chess, files = flipped ? 'hgfedcba' : 'abcdefgh';
    const ranks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
    const targets = new Set(selected && !variation.engineTurn ? variation.legal(selected).map(move => move.to) : []);
    const last = variation.moves.at(-1), tabSquare = focusSquare || selected || files[0] + ranks[7];
    let html = '';
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const square = files[f] + ranks[r], piece = chess.get(square);
      const label = `${square}, ${piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${pieceNames[piece.type]}` : 'empty'}${targets.has(square) ? ', legal destination' : ''}`;
      html += `<button class="square practice-square${(files.charCodeAt(f)-97+ranks[r])%2 === 1 ? ' dark' : ''}${selected === square ? ' piece-selected' : ''}${targets.has(square) ? ' legal-target' : ''}${last && [last.from,last.to].includes(square) ? ' last' : ''}" data-square="${square}" tabindex="${square === tabSquare ? 0 : -1}" aria-label="${label}" aria-pressed="${selected === square}">${f === 0 ? `<span class="rank" aria-hidden="true">${ranks[r]}</span>` : ''}${r === 7 ? `<span class="file" aria-hidden="true">${files[f]}</span>` : ''}${piece ? pieceSvg(piece) : ''}</button>`;
    }
    $('explore-board').innerHTML = html;
    $('explore-turn').textContent = variation.ending ? `${variation.ending}${chess.isCheckmate() ? ` · ${chess.turn() === 'w' ? 'Black' : 'White'} wins` : ''}` : `${chess.turn() === 'w' ? 'White' : 'Black'} to move${variation.engineTurn ? ' · Stockfish' : variation.mode === 'engine' ? ' · Your turn' : ''}${chess.isCheck() ? ' · Check' : ''}`;
    $('explore-evaluation').textContent = result ? formatEvaluation(result) : busy ? 'Thinking…' : '—';
    $('explore-best').textContent = variation.ending ? 'This position has ended.' : result ? `Best move: ${uciToSan(variation.fen, result.best)} · Depth ${result.depth}` : 'Evaluating this position';
    $('explore-line').textContent = variation.moves.length ? variation.moves.map((move, index) => `${move.color === 'w' ? move.before.split(' ')[5] + '.' : index === 0 ? move.before.split(' ')[5] + '…' : ''} ${move.san}`).join(' ').trim() : 'Your moves will appear here.';
    $('explore-undo').disabled = !variation.canUndo;
    $('explore-undo').textContent = variation.mode === 'engine' ? 'Undo turn' : 'Undo move';
    $('explore-reset').disabled = !variation.moves.length;
    $('explore-reply').hidden = variation.mode === 'engine' && !variation.engineTurn;
    $('explore-reply').disabled = busy || Boolean(variation.ending) || Boolean(promotion) || variation.mode === 'free' && !result?.best;
    $('explore-reply').textContent = busy ? 'Stockfish is thinking…' : variation.mode === 'engine' ? 'Retry engine reply' : 'Play engine reply';
    $('play-settings-summary').textContent = variation.mode === 'free' ? 'Free play · Control both sides' : `Vs Stockfish · You play ${variation.color === 'w' ? 'White' : 'Black'}`;
    $('play-color-field').hidden = variation.mode === 'free';
    $('play-export').disabled = !variation.moves.length;
    $('explore-board').setAttribute('aria-label', `Play board, ${variation.ending || (chess.turn() === 'w' ? 'White' : 'Black') + ' to move'}. Select a piece and its destination.`);
    $('explore-promotion').hidden = !promotion;
    if (variation.ending) $('explore-feedback').textContent = `${$('explore-turn').textContent}. Undo to try another idea, or start a new game.`;
    if (focusSquare) $('explore-board').querySelector(`[data-square="${focusSquare}"]`)?.focus({ preventScroll: true });
  }
  async function evaluate() {
    cancel(); result = null;
    if (variation.ending === 'Draw') {
      result = { cp: 0, mate: null, terminal: true }; render(); return;
    }
    const current = run, snapshot = variation.snapshot(), active = new Engine();
    engine = active; busy = true; render();
    let replied = false;
    try {
      const score = await active.evaluate(snapshot.fen, 650);
      if (current !== run || !variation?.matches(snapshot)) return;
      result = score;
      if (variation.engineTurn && score.best) {
        const outcome = variation.engineMove(score.best, snapshot);
        if (outcome.status === 'played') {
          replied = true; selected = null; promotion = null; result = null;
          playSound(outcome.move); $('explore-feedback').textContent = `Stockfish played ${outcome.move.san}. Your turn.`;
        }
      }
    } catch (error) {
      if (current === run) $('explore-feedback').textContent = `${error.message} ${variation.engineTurn ? 'Use Retry engine reply or switch to Free play.' : 'Move a piece or reset to try again.'}`;
    } finally {
      active.destroy();
      if (current === run) { engine = null; busy = false; render(); if (replied) evaluate(); }
    }
  }
  function afterMove(move) {
    selected = null; promotion = null; playSound(move);
    $('explore-feedback').textContent = `${move.san} played. ${variation.engineTurn ? 'Stockfish will reply automatically.' : 'Try the other side or ask Stockfish for a reply.'}`;
    evaluate();
  }
  function attempt(from, to, piece) {
    const outcome = variation.play(from, to, piece);
    if (outcome.status === 'promotion') { promotion = { from, to }; render(); $('explore-promotion').querySelector('button').focus(); }
    else if (outcome.status === 'played') afterMove(outcome.move);
    else { $('explore-feedback').textContent = 'Choose a highlighted legal destination.'; render(from); }
  }
  function startPosition() {
    cancel();
    const fen = $('play-origin').value === 'current' ? originFen : new Chess().fen();
    variation = new PlaySession(fen, { mode: $('play-mode').value, color: $('play-color').value });
    flipped = variation.mode === 'engine' ? variation.color === 'b' : context().flipped;
    selected = null; promotion = null; result = null;
    $('explore-origin').textContent = $('play-origin').value === 'current' ? 'From your selected analysis position · Original game preserved' : 'New game · No clock · Play at your own pace';
    $('explore-feedback').textContent = variation.engineTurn ? 'Stockfish is preparing the first move.' : 'Tap a piece, then a highlighted square to play.';
    evaluate();
  }
  function open(fromGame, fenOverride = null) {
    const current = context(); savedGame = current.parsed; resumeReview = pause();
    originFen = fenOverride || current.parsed.fens[current.ply];
    $('play-origin').value = fromGame ? 'current' : 'new';
    $('play-mode').value = fromGame ? 'free' : 'engine';
    $('play-color').value = fromGame ? new Chess(originFen).turn() : 'w';
    $('play-settings').open = false; dialog.showModal(); startPosition();
  }
  $('try-move').onclick = () => open(true);
  $('play-open').onclick = () => open(false);
  $('explore-board').onclick = event => {
    const button = event.target.closest('[data-square]'); if (!button || !variation || promotion || variation.ending) return;
    if (variation.engineTurn) { $('explore-feedback').textContent = busy ? 'Wait for Stockfish’s move, or switch to Free play.' : 'Retry the engine reply or switch to Free play.'; return; }
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
    if (busy || !variation || promotion) return;
    if (variation.engineTurn) { evaluate(); return; }
    if (!result?.best) return;
    const outcome = variation.engineMove(result.best, variation.snapshot());
    if (outcome.status === 'played') afterMove(outcome.move);
  };
  $('explore-undo').onclick = () => { const undone = variation.undoTurn(); if (!undone.length) return; selected = null; promotion = null; playSound(undone.at(-1)); $('explore-feedback').textContent = 'Back to your previous position. Try a different idea.'; evaluate(); };
  $('explore-reset').onclick = () => { variation.reset(); selected = null; promotion = null; $('explore-feedback').textContent = 'Back to the game position. Try another move.'; evaluate(); };
  $('explore-flip').onclick = () => { flipped = !flipped; render(); };
  $('play-origin').onchange = startPosition;
  for (const id of ['play-mode', 'play-color']) $(id).onchange = () => {
    cancel(); variation.configure($('play-mode').value, $('play-color').value);
    selected = null; promotion = null; result = null;
    if (variation.mode === 'engine') flipped = variation.color === 'b';
    $('explore-feedback').textContent = variation.engineTurn ? 'Stockfish will play the next move.' : 'Settings updated. Choose your next move.';
    evaluate();
  };
  $('play-new').onclick = () => { $('play-origin').value = 'new'; startPosition(); };
  $('play-export').onclick = () => {
    if (!variation?.moves.length) return;
    const url = URL.createObjectURL(new Blob([variation.exportPgn()], {type:'application/x-chess-pgn'}));
    const link = document.createElement('a'); link.href = url; link.download = 'knightlab-play.pgn'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  };
  dialog.addEventListener('close', () => { cancel(); variation = null; if (resumeReview && savedGame === context().parsed) resume(); resumeReview = false; });
  return { reset, tryMove: (fen, uci) => {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci || '')) return;
    open(true, fen); $('explore-origin').textContent = 'Trying the coach’s idea · From before the selected move';
    attempt(uci.slice(0,2), uci.slice(2,4), uci[4]);
  } };
}
