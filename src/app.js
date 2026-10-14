import { Chess } from 'chess.js';
import { DEMO_PGN, parseGame, classifyMove, formatEvaluation, summarize, resultFor, timeControl, uciToSan } from './game.js';
import { Engine } from './engine.js';
import { normalizeUsername, loadPlayer, loadArchive } from './api.js';
import { pieceSvg } from './pieces.js';
import { pageGames } from './library.js';
import { identifyOpening } from './opening.js';
import { createTrainingUI } from './training-ui.js';
import { createExploreUI } from './explore-ui.js';
import { MoveSounds, navigationSoundMove } from './sound.js';
import { qualityLabels, qualityColors, qualityGlyph, selectedMoveVerdict, pieceMoveVerdict } from './verdict.js';

const $ = id => document.getElementById(id);
const iconPaths = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
  user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/>',
  collection:'<rect x="5" y="7" width="15" height="13" rx="2"/><path d="M3 15V3h13"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2.5m0 3h.01"/>',
  lock:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v2"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  flip:'<path d="M3 7h16m-4-4 4 4-4 4M21 17H5m4-4-4 4 4 4"/>',
  first:'<path d="M6 5v14m12-14-7 7 7 7"/>',
  last:'<path d="M18 5v14M6 5l7 7-7 7"/>',
  left:'<path d="m15 5-7 7 7 7"/>',
  right:'<path d="m9 5 7 7-7 7"/>',
  eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 3v4m-2-2h4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  volume:'<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted:'<path d="m11 4-6 5H2v6h3l6 5Zm5 5 5 6m0-6-5 6"/>',
  expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || ''}</svg>`; }
document.querySelectorAll('[data-icon]').forEach(element => element.innerHTML = icon(element.dataset.icon));
function escape(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character])); }
const state = { parsed: null, selected: null, ply: 19, flipped: false, showArrow: true, evaluations: [], running: false, run: 0, engine: null, games: [], archives: [], archiveIndex: 0, profile: null, username: '', filter: 'all', libraryPage: 0, request: null, cache: new Map(), mode: 'quick', tab: 'overview', demo: true };
const compactOpening = matchMedia('(max-width: 1020px)');
function positionOpeningCard() {
  const card = $('opening-card');
  if (compactOpening.matches || $('focus-dialog').open) document.querySelector('.board-card').prepend(card);
  else document.querySelector('.intelligence-heading').after(card);
  card.open = !compactOpening.matches && !$('focus-dialog').open;
}
compactOpening.addEventListener('change', positionOpeningCard);
$('opening-card').addEventListener('toggle', () => {
  $('opening-toggle-label').textContent = $('opening-card').open ? 'Less' : 'Details';
});
positionOpeningCard();
let soundEnabled = true, soundWarning = false;
try { soundEnabled = localStorage.getItem('knightlab-sound') !== 'off'; } catch {}
const moveSounds = new MoveSounds({ enabled: soundEnabled, onState: audioState => {
  $('toggle-sound').dataset.audioState = audioState;
  if (audioState === 'unavailable' && !soundWarning) { soundWarning = true; toast('Move sounds are unavailable in this browser.'); }
} });
const training = createTrainingUI({
  context: () => ({ parsed: state.parsed, evaluations: state.evaluations, color: playerColor(), running: state.running, ply: state.ply }),
  navigate: goTo,
  pause: () => { const running = state.running; stopAnalysis(); render(); return running; },
  resume: startAnalysis,
  scrollToBoard: () => scrollToSection(document.querySelector('.board-card')),
  icon,
  playSound: move => moveSounds.play(move),
});
const explorer = createExploreUI({
  context: () => ({ parsed: state.parsed, ply: state.ply, flipped: state.flipped }),
  pause: () => { const running = state.running; stopAnalysis(); render(); return running; },
  resume: startAnalysis,
  playSound: move => moveSounds.play(move),
});
const boardCard = document.querySelector('.board-card');
const boardHome = document.createComment('Board position');
boardCard.before(boardHome);
$('focus-mode').onclick = () => {
  $('focus-body').append(boardCard); document.body.classList.add('focus-active');
  $('focus-dialog').showModal(); positionOpeningCard();
};
$('exit-focus').onclick = () => $('focus-dialog').close();
$('focus-dialog').addEventListener('close', () => {
  boardHome.after(boardCard); document.body.classList.remove('focus-active');
  positionOpeningCard(); $('focus-mode').focus({ preventScroll: true });
});
let toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 3500); }
function searchStatus(message, error = false) { $('search-status').hidden = !message; $('search-status').textContent = message; $('search-status').classList.toggle('error', error); }
function scrollToSection(element) {
  if (element.id === 'game-library' || element.matches('.workspace')) {
    $('library-nav').classList.toggle('active', element.id === 'game-library');
    $('games-nav').classList.toggle('active', element.id !== 'game-library');
  }
  element.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}

function setGame(game, { demo = false, analyze = true } = {}) {
  const parsed = parseGame(game.pgn);
  training.reset();
  explorer.reset();
  if ($('focus-dialog').open) $('focus-dialog').close();
  stopAnalysis();
  state.parsed = parsed; state.selected = game; state.demo = demo;
  state.ply = demo ? 19 : 0;
  state.flipped = Boolean(state.username && game.black?.username?.toLowerCase() === state.username);
  state.evaluations = state.cache.get(game.pgn + state.mode) || [];
  $('analysis-error').hidden = true;
  $('demo-badge').hidden = !demo;
  $('workspace-title').textContent = demo ? 'Inside the analysis lab' : 'Your game, move by move';
  const { headers } = parsed;
  $('game-subtitle').textContent = demo ? 'The Opera Game · Paris, 1858' : `${game.time_class ? game.time_class[0].toUpperCase() + game.time_class.slice(1) + ' · ' : ''}${headers.Event || 'Imported game'}${game.end_time ? ' · ' + new Date(game.end_time * 1000).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : ''}`;
  $('game-result').textContent = (headers.Result || '*').replaceAll('-', '–');
  renderOpening();
  updatePlayers(); renderMoveList(); render(); renderGames();
  if (analyze) startAnalysis();
}

function renderOpening() {
  const opening = identifyOpening(state.parsed, state.selected);
  $('opening-name').textContent = opening.name || 'Unrecognized opening';
  $('opening-eco').textContent = opening.eco;
  $('opening-eco').hidden = !opening.eco;
  $('opening-detail').textContent = opening.source === 'database' ? 'Identified from this game’s opening position.' : opening.source === 'pgn' ? 'Opening recorded in this game’s PGN.' : opening.source === 'chesscom' ? 'Opening recorded by Chess.com.' : opening.customStart ? 'This game starts from a custom position. A full opening cannot be identified.' : 'No named position found in the opening database for this game.';
  $('opening-line').textContent = opening.line;
  $('opening-line').hidden = !opening.line;
  $('opening-position').hidden = opening.ply === null;
  $('opening-card').open = !compactOpening.matches;
  $('opening-position').onclick = () => {
    if (compactOpening.matches) $('opening-card').open = false;
    goTo(opening.ply); scrollToSection(document.querySelector('.board-card'));
  };
}

function updatePlayers() {
  const headers = state.parsed.headers;
  const top = state.flipped ? 'white' : 'black';
  const bottom = state.flipped ? 'black' : 'white';
  for (const [position, color] of [['top', top], ['bottom', bottom]]) {
    const player = state.selected[color];
    const name = player?.username || headers[color === 'white' ? 'White' : 'Black'] || (color === 'white' ? 'White' : 'Black');
    $(`${position}-player`).textContent = name;
    $(`${position}-player-detail`).textContent = `${player?.rating ? player.rating + ' · ' : ''}${color[0].toUpperCase() + color.slice(1)} pieces`;
    $(`${position}-avatar`).textContent = color === 'white' ? '♔' : '♚';
    $(`${position}-avatar`).className = `player-avatar ${color === 'white' ? 'white-avatar' : 'black-avatar'}`;
  }
  $('bottom-color').textContent = bottom.toUpperCase();
}

function renderBoard() {
  const chess = new Chess(state.parsed.fens[state.ply]);
  const files = state.flipped ? 'hgfedcba' : 'abcdefgh';
  const ranks = state.flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const last = state.parsed.moves[state.ply - 1];
  const classification = last ? classifyMove(last, state.evaluations[state.ply - 1], state.evaluations[state.ply]) : null;
  const rating = pieceMoveVerdict(last, classification);
  const existingBadge = $('board').querySelector('.piece-rating');
  const showRating = existingBadge?.dataset.ply === String(state.ply) && existingBadge.getAttribute('aria-pressed') === 'true';
  const restoreBadgeFocus = existingBadge && document.activeElement === existingBadge;
  const names = { p:'pawn', n:'knight', b:'bishop', r:'rook', q:'queen', k:'king' };
  let squares = '';
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const square = files[f] + ranks[r];
    const piece = chess.get(square);
    const dark = (files.charCodeAt(f) - 97 + ranks[r]) % 2 === 1;
    const highlight = last && (last.from === square || last.to === square);
    const rated = rating?.square === square;
    const badge = rated ? `<button class="piece-rating ${rating.tone}${r === 0 ? ' edge-top' : ''}${f === 7 ? ' edge-right' : ''}${r < 2 ? ' tooltip-below' : ''}${f < 2 ? ' tooltip-left' : ''}" data-ply="${state.ply}" aria-label="${escape(rating.move + ': ' + rating.label)}" aria-pressed="${Boolean(showRating)}" title="${escape(rating.label)}"><span class="piece-rating-symbol" aria-hidden="true">${qualityGlyph(classification.label)}</span><span class="piece-rating-label" aria-hidden="true">${escape(rating.label)}</span></button>` : '';
    squares += `<div class="square${dark ? ' dark' : ''}${highlight ? ' last' : ''}${rated ? ' rated' : ''}" title="${square}${piece ? ': ' + (piece.color === 'w' ? 'White ' : 'Black ') + names[piece.type] : ''}">${f === 0 ? `<span class="rank" aria-hidden="true">${ranks[r]}</span>` : ''}${r === 7 ? `<span class="file" aria-hidden="true">${files[f]}</span>` : ''}${piece ? pieceSvg(piece) : ''}${badge}</div>`;
  }
  $('board').innerHTML = squares;
  if (restoreBadgeFocus) $('board').querySelector('.piece-rating')?.focus({preventScroll: true});
  $('board').setAttribute('aria-label', `Chess position after ${state.ply} half-moves. ${chess.turn() === 'w' ? 'White' : 'Black'} to move.${rating ? ' ' + rating.move + ': ' + rating.label + '.' : ''} ${chess.fen()}`);
  const fullMove = Number(chess.fen().split(' ')[5]);
  $('move-position').textContent = state.ply ? `Move ${state.parsed.moves[state.ply-1].san} · ${Math.ceil(state.ply / 2)}/${Math.ceil(state.parsed.moves.length / 2)}` : 'Starting position';
  for (const id of ['first-move', 'previous-move']) $(id).disabled = state.ply === 0;
  for (const id of ['last-move', 'next-move']) $(id).disabled = state.ply === state.parsed.moves.length;
  const evaluation = state.evaluations[state.ply];
  const best = evaluation?.best;
  const arrow = $('best-arrow');
  const hideArrow = !state.showArrow || !best || best === '(none)' || !/^[a-h][1-8][a-h][1-8]/.test(best);
  arrow.toggleAttribute('hidden', hideArrow);
  if (!hideArrow) {
    for (const [start, suffix] of [[0, '1'], [2, '2']]) {
      arrow.setAttribute('x' + suffix, files.indexOf(best[start]) * 100 + 50);
      arrow.setAttribute('y' + suffix, ranks.indexOf(Number(best[start + 1])) * 100 + 50);
    }
  }
  const percent = evaluation ? 50 + 45 * Math.tanh(evaluation.cp / 450) : 50;
  $('eval-fill').style.height = `${state.flipped ? 100 - percent : percent}%`;
  $('eval-fill').style.background = state.flipped ? '#34415e' : '#edf1fa';
  document.querySelector('.evaluation-bar').style.background = state.flipped ? '#edf1fa' : '#34415e';
  $('bar-score').textContent = evaluation ? (evaluation.mate !== null ? 'M' + Math.abs(evaluation.mate) : Math.abs(evaluation.cp / 100).toFixed(1)) : '—';
  $('bar-score').style.color = state.flipped ? '#edf1fa' : '#34415e';
  updatePlayers();
}

function playerColor() {
  if (!state.username || state.demo || !state.selected.white) return null;
  return state.selected.white.username.toLowerCase() === state.username ? 'w' : 'b';
}

function render() {
  if (!state.parsed) return;
  renderBoard(); renderChart();
  const score = state.evaluations[state.ply];
  $('evaluation').textContent = formatEvaluation(score);
  $('position-verdict').textContent = !score ? 'Waiting for the engine' : score.terminal ? (score.cp ? 'Checkmate' : 'Drawn position') : score.mate !== null ? `${score.cp > 0 ? 'White' : 'Black'} has forced mate` : Math.abs(score.cp) < 50 ? 'A balanced position' : `${score.cp > 0 ? 'White' : 'Black'} ${Math.abs(score.cp) > 200 ? 'is winning' : 'has the advantage'}`;
  const summary = summarize(state.parsed, state.evaluations, playerColor());
  $('best-count').textContent = summary.count ? summary.counts.Best + summary.counts.Great : '—';
  $('mistake-count').textContent = summary.count ? summary.counts.Mistake : '—';
  $('blunder-count').textContent = summary.count ? summary.counts.Blunder : '—';
  $('loss-summary').textContent = summary.count ? `${playerColor() ? 'Your' : 'All'} moves · Avg. loss ${(summary.averageLoss / 100).toFixed(2)} pawns` : `${playerColor() ? 'Your' : 'All'} moves · engine review`;
  $('next-mistake').disabled = !summary.items.some((item, index) => item && ['Mistake', 'Blunder', 'Inaccuracy'].includes(item.label) && (!playerColor() || state.parsed.moves[index].color === playerColor()));
  const move = state.parsed.moves[state.ply - 1];
  const item = move ? summary.items[state.ply - 1] : null;
  const verdict = selectedMoveVerdict(move, item);
  const announcement = `${verdict.move === '—' ? '' : verdict.move + ': '}${verdict.label}`;
  if ($('move-rating-announcement').textContent !== announcement) $('move-rating-announcement').textContent = announcement;
  $('insight-move').textContent = move ? `${Number(move.before.split(' ')[5])}${move.color === 'w' ? '.' : '...'} ${move.san}` : '';
  $('move-quality').innerHTML = item ? qualityGlyph(item.label) : icon('spark');
  $('move-quality').style.color = item ? qualityColors[item.label] : 'var(--lime)';
  $('insight-title').textContent = item ? qualityLabels[item.label] : state.ply === 0 ? 'Every move starts here' : 'A closer look at this move';
  $('insight-text').textContent = !move ? 'Explore the moves with the arrows below the board. The chart tracks the evaluation from White’s perspective.' : !item ? 'The engine has not rated this move yet. You can keep exploring the board while the review progresses.' : item.label === 'Great' ? `${move.san} is the engine’s first choice and scores at least one pawn better than its next option at the same search depth. You found a standout move.` : item.label === 'Best' ? `${move.san} matches the engine’s first choice in this position.${move.san.endsWith('#') ? ' It finishes the game with checkmate.' : ' Keep exploring to see how the game develops.'}` : item.label === 'Good' ? `${move.san} keeps the evaluation close to the engine’s preferred move${item.best !== '—' ? ', ' + item.best : ''}. The estimated loss is ${(item.loss / 100).toFixed(2)} pawns.` : `${move.san} gives up about ${(item.loss / 100).toFixed(2)} pawns in the engine’s evaluation.${item.best !== '—' ? ' Consider ' + item.best + ' instead. Step back one move to see it on the board.' : ''}`;
  const previous = state.evaluations[Math.max(0, state.ply - 1)];
  $('recommended-move').textContent = move ? uciToSan(move.before, previous?.best) : uciToSan(state.parsed.fens[0], score?.best);
  $('engine-depth').textContent = previous?.depth ? `Depth ${previous.depth}` : 'Stockfish 19';
  const analyzed = state.evaluations.filter(Boolean).length;
  const total = state.parsed.fens.length;
  const percent = Math.round(analyzed / total * 100);
  $('analysis-percent').textContent = `${percent}%`;
  $('progress-fill').style.width = `${percent}%`;
  $('analysis-status').innerHTML = `<span class="live-dot"></span>${state.running ? `Reviewing position ${Math.min(analyzed + 1, total)} of ${total}` : analyzed === total ? 'Review complete' : analyzed ? 'Review paused' : 'Ready to review'}`;
  document.querySelector('.engine-progress').classList.toggle('running', state.running);
  $('analyze-label').textContent = state.running ? 'Pause review' : analyzed === total ? 'Review complete' : analyzed ? 'Resume review' : 'Review this game';
  $('analyze-button').disabled = analyzed === total && !state.running;
  $('analysis-speed').disabled = state.running;
  updateMoveRatings(summary.items);
  training.render();
}

function renderChart() {
  const total = state.parsed.moves.length;
  const values = state.evaluations;
  if (!values.some(Boolean)) { $('chart').innerHTML = '<div class="chart-empty">Your game’s story will appear here</div>'; return; }
  const y = cp => 50 - Math.max(-5, Math.min(5, cp / 100)) * 8.5;
  let path = '', started = false;
  values.forEach((score, index) => {
    if (!score) { started = false; return; }
    path += `${started ? 'L' : 'M'}${index / total * 400},${y(score.cp)} `; started = true;
  });
  const selected = values[state.ply];
  const x = state.ply / total * 400;
  $('chart').innerHTML = `<svg viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true"><path d="${path}" class="chart-line" stroke-width="2.3" fill="none" vector-effect="non-scaling-stroke"/><line x1="${x}" x2="${x}" y1="0" y2="100" class="chart-cursor" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>${selected ? `<circle cx="${x}" cy="${y(selected.cp)}" r="3.5" class="chart-point"/>` : ''}<text x="4" y="9" class="chart-scale" font-size="8">+5</text><text x="4" y="98" class="chart-scale" font-size="8">−5</text></svg>`;
}

function renderMoveList() {
  const rows = new Map();
  state.parsed.moves.forEach((move, index) => {
    const number = move.before.split(' ')[5];
    if (!rows.has(number)) rows.set(number, { number });
    rows.get(number)[move.color] = { move, ply: index + 1 };
  });
  const cell = entry => entry ? `<button class="move-cell" data-ply="${entry.ply}" title="Go to ${escape(entry.move.san)}"><span>${escape(entry.move.san)}</span><i class="stat-dot" hidden></i></button>` : '<span></span>';
  $('move-list').innerHTML = [...rows.values()].map(row => `<div class="move-row"><span class="move-number">${row.number}.</span>${cell(row.w)}${cell(row.b)}</div>`).join('');
}
function updateMoveRatings(items) {
  document.querySelectorAll('.move-cell').forEach(button => {
    const ply = Number(button.dataset.ply);
    const item = items[ply - 1];
    button.classList.toggle('selected', ply === state.ply);
    button.setAttribute('aria-current', ply === state.ply ? 'step' : 'false');
    const dot = button.querySelector('i');
    dot.hidden = !item;
    if (item) { dot.className = 'stat-dot ' + item.label.toLowerCase(); button.title = `${state.parsed.moves[ply - 1].san}: ${item.label}. Evaluation loss: ${(item.loss / 100).toFixed(2)} pawns.`; }
  });
}
function goTo(ply) {
  const previous = state.ply;
  state.ply = Math.max(0, Math.min(state.parsed.moves.length, ply));
  moveSounds.play(navigationSoundMove(state.parsed.moves, previous, state.ply)); render();
  if (state.tab === 'moves') document.querySelector(`.move-cell[data-ply="${state.ply}"]`)?.scrollIntoView({ block:'nearest', behavior:'instant' });
}

function stopAnalysis() {
  state.run++; state.running = false; state.engine?.destroy(); state.engine = null;
}
async function startAnalysis() {
  if (state.running) return;
  const run = ++state.run;
  const key = state.selected.pgn + state.mode;
  state.evaluations = state.cache.get(key) || [];
  state.cache.set(key, state.evaluations);
  state.engine = new Engine(); state.running = true;
  $('analysis-error').hidden = true; render();
  try {
    const engine = state.engine;
    const parsed = state.parsed;
    for (let index = 0; index < parsed.fens.length; index++) {
      if (run !== state.run) return;
      if (state.evaluations[index]) continue;
      const score = await engine.evaluate(parsed.fens[index], state.mode === 'deep' ? 650 : 140);
      if (run !== state.run) return;
      state.evaluations[index] = score;
      render();
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (run === state.run) { state.running = false; state.engine?.destroy(); state.engine = null; render(); }
  } catch (error) {
    if (run !== state.run) return;
    state.running = false; state.engine?.destroy(); state.engine = null;
    $('analysis-error').hidden = false; $('analysis-error').textContent = error.message;
    render();
  }
}

function renderGames() {
  document.body.classList.toggle('has-games', Boolean(state.profile || state.games.length));
  if (!state.profile && !state.games.length) return;
  const { entries, total, pages, page, start } = pageGames(state.games, state.filter, state.libraryPage);
  state.libraryPage = page;
  $('game-count').textContent = state.games.length;
  $('library-title').textContent = state.profile ? 'Choose your next game' : 'Your imported game';
  $('library-subtitle').textContent = 'Select a match to open its board and analysis above.';
  $('game-filters').hidden = !state.profile;
  $('load-more').hidden = !state.profile || state.archiveIndex >= state.archives.length;
  $('library-note').hidden = !state.profile;
  $('library-pagination').hidden = pages <= 1;
  $('library-page').textContent = `Page ${page + 1} of ${pages}`;
  $('library-prev').disabled = page === 0;
  $('library-next').disabled = page === pages - 1;
  $('library-results').textContent = total ? `${start + 1}–${start + entries.length} of ${total} games` : '0 games';
  if (!total) { $('games-list').innerHTML = '<div class="empty-games"><span>No games here yet</span><p>Try another time control or load an older month.</p></div>'; return; }
  $('games-list').innerHTML = entries.map(({ game, index }) => {
    const selfWhite = state.username && game.white?.username?.toLowerCase() === state.username;
    const opposingPlayer = selfWhite ? game.black : game.white;
    const opponent = state.username ? opposingPlayer?.username : parseGame(game.pgn).headers.Black;
    const result = state.username && game.white ? resultFor(game, state.username) : 'draw';
    const date = game.end_time ? new Date(game.end_time * 1000).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : 'PGN import';
    const selected = state.selected === game;
    const name = opponent || 'Opponent';
    const time = game.time_class ? `${game.time_class[0].toUpperCase()}${game.time_class.slice(1)} · ${timeControl(game.time_control)}` : 'Imported game';
    const detail = state.username ? `${opposingPlayer?.rating ? opposingPlayer.rating + ' rating · ' : ''}You played ${selfWhite ? 'White' : 'Black'}` : 'Standard chess · PGN';
    return `<button class="game-item${selected ? ' selected' : ''}" data-game="${index}" aria-pressed="${selected}"><span class="game-card-top"><span class="game-time">${icon('clock')}${escape(time)}</span><span class="game-outcome ${result}">${game.white ? result.toUpperCase() : 'PGN'}</span></span><span class="game-opponent"><span class="opponent-avatar" aria-hidden="true">${escape(name[0].toUpperCase())}</span><span class="opponent-identity"><strong>vs ${escape(name)}</strong><small>${escape(detail)}</small></span></span><span class="game-card-bottom"><span>${escape(date)}</span><span class="game-review-link">${selected ? 'In review' : 'Review game'} ${icon(selected ? 'grid' : 'arrow')}</span></span></button>`;
  }).join('');
}

async function searchPlayer(event) {
  event?.preventDefault();
  let username;
  try { username = normalizeUsername($('username').value); }
  catch (error) { searchStatus(error.message, true); return; }
  state.request?.abort();
  const controller = new AbortController(); state.request = controller;
  $('connect-button').disabled = true; $('connect-button').innerHTML = 'Finding your games…';
  searchStatus('Finding your profile and recent games…');
  try {
    const {profile, archives} = await loadPlayer(username, controller.signal);
    let games = [], archiveIndex = 0;
    while (archiveIndex < archives.length && games.length < 30 && archiveIndex < 6) {
      games.push(...await loadArchive(archives[archiveIndex++], controller.signal));
    }
    if (controller.signal.aborted) return;
    state.username = username; state.profile = profile; state.archives = archives; state.archiveIndex = archiveIndex;
    state.games = games; state.filter = 'all'; state.libraryPage = 0;
    $('profile').hidden = false;
    const avatar = typeof profile.avatar === 'string' && profile.avatar.startsWith('https://') ? `<img src="${escape(profile.avatar)}" alt="" referrerpolicy="no-referrer"/>` : `<span class="profile-fallback">${escape(profile.username?.[0]?.toUpperCase() || '♙')}</span>`;
    $('profile').innerHTML = `${avatar}<div><strong>${escape(profile.username)}</strong><small>${state.games.length} recent games loaded</small></div>`;
    document.querySelectorAll('[data-filter]').forEach(button => { button.classList.toggle('selected', button.dataset.filter === 'all'); button.setAttribute('aria-pressed', String(button.dataset.filter === 'all')); });
    renderGames();
    searchStatus(games.length ? `${state.games.length} games loaded below the analysis. Choose a match to review.` : 'This account has no completed standard chess games available yet.');
    try { localStorage.setItem('knightlab-username', username); } catch {}
    if (games.length) setGame(state.games[0]);
    else setGame({ pgn: DEMO_PGN }, { demo: true });
    $('username').blur(); scrollToSection($('game-library')); $('game-library').focus({ preventScroll: true });
  } catch (error) { if (!controller.signal.aborted) searchStatus(error.message, true); }
  finally { if (state.request === controller) { $('connect-button').disabled = false; $('connect-button').innerHTML = `Find my games ${icon('arrow')}`; } }
}

async function loadOlder() {
  if (state.archiveIndex >= state.archives.length) return;
  const controller = state.request;
  const button = $('load-more'); button.disabled = true; button.textContent = 'Loading…';
  try {
    const incoming = await loadArchive(state.archives[state.archiveIndex], controller.signal);
    if (state.request !== controller || controller.signal.aborted) return;
    const seen = new Set(state.games.map(game => game.url || game.pgn));
    state.games.push(...incoming.filter(game => !seen.has(game.url || game.pgn))); state.archiveIndex++;
    renderGames();
    $('profile').querySelector('small').textContent = `${state.games.length} games loaded`;
    toast(incoming.length ? `${incoming.length} older games loaded.` : 'No standard games in that archive. Try the next month.');
  } catch (error) { if (!controller.signal.aborted) searchStatus(error.message, true); }
  finally { button.disabled = false; button.innerHTML = 'Load older games <span>↓</span>'; }
}

function openImport() { $('import-error').hidden = true; $('import-dialog').showModal(); }
function showInfo(title, content) { $('info-title').textContent = title; $('info-body').innerHTML = content; $('info-dialog').showModal(); }
const instructions = '<div class="info-step"><b>1</b><div><strong>Bring your games</strong><p>Enter your public Chess.com username. No sign-in or password is needed. You can also import a single PGN game.</p></div></div><div class="info-step"><b>2</b><div><strong>Choose a game</strong><p>Your most recent completed standard chess games appear in the library. Filter by time control or load older games.</p></div></div><div class="info-step"><b>3</b><div><strong>Find your turning points</strong><p>Stockfish reviews the positions on your device. Explore the board, click the evaluation chart, and jump to mistakes. The best-move arrow shows the recommended move from the position currently on the board.</p></div></div><p>The public Chess.com API may take up to 24 hours to refresh. Live games and chess variants are not supported.</p>';
const method = `<p>Each position is evaluated by <a href="https://github.com/nmrugg/stockfish.js/tree/v19.0.1" target="_blank" rel="noopener noreferrer">Stockfish 19 Lite</a>. A positive score favors White; a negative score favors Black. One pawn equals 100 centipawns. “M” means a forced mate.</p>
<table class="method-table"><tbody><tr><td>Great</td><td>Top choice, clearly ahead of the alternative</td></tr><tr><td>Best</td><td>Matches the engine’s first choice</td></tr><tr><td>Good</td><td>Less than 0.50 pawn lost</td></tr><tr><td>Inaccuracy</td><td>0.50–0.99 pawn lost</td></tr><tr><td>Mistake</td><td>1.00–1.99 pawns lost</td></tr><tr><td>Blunder</td><td>2.00+ pawns lost</td></tr></tbody></table>
<p>Great moves match the engine’s top choice, beat its next candidate by at least one pawn at the same search depth of at least 8, and lose no more than 0.30 pawn in the resulting position. Best / Great counts combine both categories.</p>
<p>These are Knightlab’s approximate move ratings, based on evaluation loss from the player’s perspective. They are not Chess.com’s classifications or accuracy scores. Mate scores use a large capped value for the chart and loss calculation.</p>
<p>Quick review gives each position 140 ms; deep review gives it 650 ms. Depth varies with your device and the position. Deeper searches can change the score or preferred move. The chart is capped at ±5 pawns.</p>
<p>For a connected account, summary counts cover your moves. Imported and demo games summarize both players. A colored badge on the moved piece rates the selected move; tap it to see the full label. The arrow recommends the next move in the current position; the insight card reviews the move just played.</p>
<p><a href="./STOCKFISH-LICENSE.txt" target="_blank">Stockfish license</a> · <a href="./THIRD-PARTY-NOTICES.txt" target="_blank">Third-party notices</a></p>`;

$('username-form').addEventListener('submit', searchPlayer);
$('focus-username').onclick = () => { $('username').focus({ preventScroll: true }); scrollToSection(document.querySelector('.connect-card')); };
$('games-nav').onclick = () => scrollToSection(document.querySelector('.workspace'));
$('library-nav').onclick = () => scrollToSection($('game-library'));
for (const id of ['sidebar-import','hero-import']) $(id).onclick = openImport;
$('how-it-works').onclick = () => showInfo('A better way to review', instructions);
$('analysis-method').onclick = () => showInfo('How move ratings work', method);
document.querySelectorAll('.close-dialog').forEach(button => button.onclick = () => button.closest('dialog').close());
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));
$('pgn-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  if (file.size > 250000) { $('import-error').hidden = false; $('import-error').textContent = 'Please choose a single game under 250 KB.'; return; }
  try { $('pgn-input').value = await file.text(); $('import-error').hidden = true; }
  catch { $('import-error').hidden = false; $('import-error').textContent = 'That file could not be read. Please try another PGN.'; }
});
$('import-submit').onclick = () => {
  try {
    const pgn = $('pgn-input').value.trim(); parseGame(pgn);
    const game = {pgn};
    state.request?.abort(); state.profile = null; state.username = ''; state.filter = 'all'; state.libraryPage = 0; state.archives = []; state.games = [game];
    $('profile').hidden = true; $('game-filters').hidden = true; $('load-more').hidden = true;
    $('connect-button').disabled = false; $('connect-button').innerHTML = `Find my games ${icon('arrow')}`;
    searchStatus('PGN imported. Enter a username any time to switch back to your Chess.com games.');
    setGame(game); $('import-dialog').close(); scrollToSection(document.querySelector('.workspace')); toast('Game imported. Let’s find your turning points.');
  } catch (error) { $('import-error').hidden = false; $('import-error').textContent = error.message; }
};
$('games-list').onclick = event => {
  const button = event.target.closest('[data-game]'); if (!button) return;
  try { setGame(state.games[Number(button.dataset.game)]); scrollToSection(document.querySelector('.workspace')); $('workspace-title').focus({ preventScroll: true }); }
  catch (error) { searchStatus(error.message, true); }
};
document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => { state.filter = button.dataset.filter; state.libraryPage = 0; document.querySelectorAll('[data-filter]').forEach(element => { element.classList.toggle('selected', element === button); element.setAttribute('aria-pressed', String(element === button)); }); renderGames(); });
for (const [id, change] of [['library-prev', -1], ['library-next', 1]]) $(id).onclick = () => { state.libraryPage += change; renderGames(); scrollToSection($('game-library')); };
$('load-more').onclick = loadOlder;
$('first-move').onclick = () => goTo(0);
$('previous-move').onclick = () => goTo(state.ply - 1);
$('next-move').onclick = () => goTo(state.ply + 1);
$('last-move').onclick = () => goTo(state.parsed.moves.length);
$('board').onclick = event => {
  const badge = event.target.closest('.piece-rating');
  if (badge) badge.setAttribute('aria-pressed', String(badge.getAttribute('aria-pressed') !== 'true'));
};
$('flip-board').onclick = () => { state.flipped = !state.flipped; renderBoard(); };
$('toggle-arrow').onclick = () => { state.showArrow = !state.showArrow; $('toggle-arrow').classList.toggle('toggled', state.showArrow); $('toggle-arrow').setAttribute('aria-pressed', String(state.showArrow)); renderBoard(); };
function renderSoundControl() {
  const enabled = moveSounds.enabled;
  $('toggle-sound').classList.toggle('toggled', enabled);
  $('toggle-sound').setAttribute('aria-pressed', String(enabled));
  $('toggle-sound').setAttribute('aria-label', enabled ? 'Mute move sounds' : 'Enable move sounds');
  $('toggle-sound').title = `Move sounds: ${enabled ? 'on' : 'off'}`;
  $('toggle-sound').innerHTML = `<span>${icon(enabled ? 'volume' : 'muted')}</span><span>Sound ${enabled ? 'on' : 'off'}</span>`;
}
$('toggle-sound').onclick = () => {
  moveSounds.setEnabled(!moveSounds.enabled);
  try { localStorage.setItem('knightlab-sound', moveSounds.enabled ? 'on' : 'off'); } catch {}
  renderSoundControl();
  if (moveSounds.enabled) moveSounds.play({ flags: 'n' });
};
renderSoundControl();
$('chart').onclick = event => { const rect = $('chart').getBoundingClientRect(); goTo(Math.round(Math.max(0,Math.min(1,(event.clientX - rect.left)/rect.width)) * state.parsed.moves.length)); };
$('move-list').onclick = event => { const button = event.target.closest('[data-ply]'); if (button) goTo(Number(button.dataset.ply)); };
for (const tab of ['overview', 'moves']) $(tab + '-tab').onclick = () => {
  state.tab = tab;
  for (const name of ['overview','moves']) { $(name+'-panel').hidden = name !== tab; $(name+'-tab').classList.toggle('selected',name === tab); $(name+'-tab').setAttribute('aria-selected',String(name === tab)); }
  if (tab === 'moves') goTo(state.ply);
};
$('analyze-button').onclick = () => { if (state.running) { stopAnalysis(); render(); } else startAnalysis(); };
$('analysis-speed').onchange = () => { stopAnalysis(); state.mode = $('analysis-speed').value; state.evaluations = state.cache.get(state.selected.pgn + state.mode) || []; render(); startAnalysis(); };
$('next-mistake').onclick = () => {
  const { items } = summarize(state.parsed, state.evaluations, playerColor());
  const mistakes = items.map((item,index) => item && ['Mistake','Blunder','Inaccuracy'].includes(item.label) && (!playerColor() || state.parsed.moves[index].color === playerColor()) ? index + 1 : null).filter(Boolean);
  if (mistakes.length) goTo(mistakes.find(ply => ply > state.ply) || mistakes[0]);
  else toast('No mistakes in your analyzed moves so far.');
};
$('download-pgn').onclick = () => {
  const url = URL.createObjectURL(new Blob([state.selected.pgn], {type:'application/x-chess-pgn'}));
  const link = document.createElement('a'); link.href = url; link.download = 'knightlab-game.pgn'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); toast('PGN downloaded.');
};
document.addEventListener('keydown', event => {
  if (['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName) || document.querySelector('dialog[open]:not(#focus-dialog)')) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(state.ply-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); goTo(state.ply+1); }
  if (event.key === 'Home') { event.preventDefault(); goTo(0); }
  if (event.key === 'End') { event.preventDefault(); goTo(state.parsed.moves.length); }
  if (event.key.toLowerCase() === 'f') { state.flipped = !state.flipped; renderBoard(); }
});
window.addEventListener('pagehide', () => { explorer.reset(); stopAnalysis(); state.request?.abort(); moveSounds.destroy(); });
try { $('username').value = localStorage.getItem('knightlab-username') || ''; } catch {}
setGame({ pgn: DEMO_PGN }, { demo:true });
