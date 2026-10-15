import { Chess } from 'chess.js';
import { DEMO_PGN, parseGame, classifyMove, formatEvaluation, summarize, resultFor, timeControl, uciToSan } from './game.js';
import { Engine } from './engine.js';
import { normalizeUsername, loadPlayer, loadArchive } from './api.js';
import { pieceSvg } from './pieces.js';
import { pageGames } from './library.js';
import { identifyOpening } from './opening.js';
import { evaluationReady, reviewSearch } from './review-quality.js';
import { coachMove } from './coach.js';
import { createTrainingUI } from './training-ui.js';
import { createExploreUI } from './explore-ui.js';
import { createInlineAnalysis } from './inline-analysis.js';
import { primaryMoveThreat, arrowPath } from './board-visuals.js';
import { createBoardCoach } from './board-coach.js';
import { MoveSounds, navigationSoundMove } from './sound.js';
import { createReviewMemory } from './review-memory.js';
import { moveTransitions, animatePieces, fadePreviousHighlights } from './piece-motion.js';
import { compactCoachText, compactMoveText } from './compact-review.js';
import { qualityLabels, qualityColors, qualityGlyph, selectedMoveVerdict, pieceMoveVerdict } from './verdict.js';
import { createPageRouter } from './routes.js';
import { createLearningUI } from './learning-ui.js';

const $ = id => document.getElementById(id);
const iconPaths = {
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m12 12 9-9m-5 0h5v5"/>',
  bulb:'<path d="M8 17h8m-7 3h6M8 14a6 6 0 1 1 8 0l-1 3H9Z"/>',
  notes:'<path d="M6 3h8l5 5v13H6Zm8 0v6h5M9 13h7m-7 4h7"/>',
  learn:'<path d="m2 9 10-6 10 6-10 6Zm4 3v6c4 3 8 3 12 0v-6m4-3v8"/>',
  'chart-bars':'<path d="M4 20v-7m6 7V8m6 12V3m6 17V10"/>',
  'analysis-gear':'<path d="m9 3 1 3h4l1-3 3 2-1 3 2 3 3 1-1 4-3 1-2 2v3h-4l-1-3-3-1-3 1-2-3 2-3V9L3 7l3-3Z"/><circle cx="12" cy="12" r="3"/>',
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
const state = { parsed: null, selected: null, ply: 19, flipped: false, showArrow: true, evaluations: [], running: false, reviewIndex: 0, run: 0, engine: null, games: [], archives: [], archiveIndex: 0, profile: null, username: '', filter: 'all', libraryPage: 0, request: null, cache: new Map(), mode: 'deep', tab: 'moves', mobileView: 'board', demo: true };
const compactLayout = matchMedia('(max-width: 860px)');
let router;
function closeWorkspaceMenu(restoreFocus=false){
  $('workspace-menu-toggle').setAttribute('aria-expanded','false');
  document.querySelector('.topbar').classList.remove('menu-open');
  if(restoreFocus)$('workspace-menu-toggle').focus({preventScroll:true});
}
$('workspace-menu-toggle').onclick=()=>{
  const open=$('workspace-menu-toggle').getAttribute('aria-expanded')!=='true';
  $('workspace-menu-toggle').setAttribute('aria-expanded',String(open));
  document.querySelector('.topbar').classList.toggle('menu-open',open);
};
document.querySelector('.main-nav').addEventListener('click',event=>{if(event.target.closest('button,a'))closeWorkspaceMenu();});
document.addEventListener('click',event=>{if(!event.target.closest('.main-nav,#workspace-menu-toggle'))closeWorkspaceMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('workspace-menu-toggle').getAttribute('aria-expanded')==='true'){event.preventDefault();event.stopImmediatePropagation();closeWorkspaceMenu(true);}},true);
compactLayout.addEventListener('change',()=>closeWorkspaceMenu());
let reviewStorage;
try { reviewStorage=localStorage; } catch {}
const reviewMemory=createReviewMemory(reviewStorage);
let paintedPosition=null, stripPosition=null, stripSource=null, stripSignature='';
function saveReviewPosition() {
  if(state.selected)reviewMemory.save(state.selected,{ply:state.ply,flipped:state.flipped,demo:state.demo});
}
let boardDragging=false, inline, showThreats=true, selectedThreat=null, threatFen=null, threats=[];
function pauseWorkspace() {
  const running=state.running, restoring=inline?.active ? inline.exit(false) : false;
  stopAnalysis(); render(); return running || restoring;
}
function boardView() {
  if (inline?.active) return {fen:inline.line.fen,last:inline.line.last,before:inline.line.scores[inline.line.cursor-1],score:inline.line.score};
  return {fen:state.parsed.fens[state.ply],last:state.parsed.moves[state.ply-1],before:state.evaluations[state.ply-1],score:state.evaluations[state.ply]};
}
function positionOpeningCard() {
  const card = $('opening-card');
  document.querySelector('.board-card').prepend($('board-top'));
  card.open = false;
}
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
  pause: pauseWorkspace,
  resume: startAnalysis,
  scrollToBoard: () => { selectWorkspaceView('board'); scrollToSection(document.querySelector('.workspace')); },
  icon,
  playSound: move => moveSounds.play(move),
});
const explorer = createExploreUI({
  context: () => ({ parsed: state.parsed, ply: state.ply, flipped: state.flipped }),
  pause: pauseWorkspace,
  resume: startAnalysis,
  playSound: move => moveSounds.play(move),
});
inline=createInlineAnalysis({context:()=>state,pause:()=>{const running=state.running;stopAnalysis();return running;},resume:startAnalysis,onChange:render,playSound:move=>moveSounds.play(move)});
const boardCard = document.querySelector('.board-card');
const boardCoach=createBoardCoach({showBoard:()=>selectWorkspaceView('board'),navigate:stepMove});
const actionsToggle=$('board-actions-toggle'), actionsPanel=$('board-actions-panel');
for(const id of ['first-move','last-move','flip-board','toggle-threats']) {
  const button=$(id);
  if(id==='first-move'||id==='last-move') {
    const label=document.createElement('span');
    label.textContent=id==='first-move'?'First position':'Last position';
    button.append(label);
  }
  actionsPanel.append(button);
}
function closeBoardActions(restoreFocus=false) {
  actionsPanel.hidden=true;
  actionsToggle.setAttribute('aria-expanded','false');
  if(restoreFocus)actionsToggle.focus({preventScroll:true});
}
actionsToggle.onclick=()=>{
  const opening=actionsPanel.hidden;
  actionsPanel.hidden=!opening;
  actionsToggle.setAttribute('aria-expanded',String(opening));
};
actionsPanel.addEventListener('click',event=>{
  if(!event.target.closest('button'))return;
  closeBoardActions(true); boardCoach.reveal();
});
document.addEventListener('click',event=>{
  if(!event.target.closest('.board-actions'))closeBoardActions();
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!actionsPanel.hidden){
    event.preventDefault();event.stopImmediatePropagation();closeBoardActions(true);boardCoach.reveal();
  }
},true);
const boardHome = document.createComment('Board position');
boardCard.before(boardHome);
$('focus-mode').onclick = () => {
  closeBoardActions();
  boardCoach.close();
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
function searchStatus(message, error = false) {
  for(const id of ['search-status','home-search-status','games-search-status']){
    $(id).hidden=!message; $(id).textContent=message; $(id).classList.toggle('error',error);
  }
}
function searchBusy(busy){
  for(const id of ['connect-button','home-search-button']){
    $(id).disabled=busy; $(id).setAttribute('aria-busy',String(busy));
    $(id).innerHTML=busy?'Finding games…':`Find ${id==='connect-button'?'my ':''}games ${icon('arrow')}`;
  }
}
function scrollToSection(element) {
  const page=element.id==='game-library'?'games':element.matches('.workspace')?'analysis':null;
  if(page&&router?.page!==page){
    router.go(page);return;
  }
  if(element.id==='game-library')setLibraryOpen(true);
  element.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}

function setLibraryOpen(open) {
  $('library-body').hidden=!open;
  $('library-toggle').setAttribute('aria-expanded',String(open));
}
$('library-toggle').onclick=()=>setLibraryOpen($('library-body').hidden);

function setGame(game, { demo = false, analyze = true } = {}) {
  const parsed = parseGame(game.pgn);
  inline.reset(); selectedThreat=null; threatFen=null; boardCoach.close(false);
  closeBoardActions(); setLibraryOpen(router?.page==='games');
  training.reset();
  explorer.reset();
  if ($('focus-dialog').open) $('focus-dialog').close();
  stopAnalysis();
  state.parsed = parsed; state.selected = game; state.demo = demo;
  selectWorkspaceView('board');
  state.ply = demo ? 19 : 0;
  state.flipped = Boolean(state.username && game.black?.username?.toLowerCase() === state.username);
  const remembered=reviewMemory.position(game.pgn,parsed.moves.length);
  if(remembered){state.ply=remembered.ply;state.flipped=remembered.flipped;}
  paintedPosition=null;
  state.evaluations = state.cache.get(game.pgn + state.mode) || [];
  $('analysis-error').hidden = true;
  $('demo-badge').hidden = !demo;
  $('workspace-title').textContent = demo ? 'The Opera Game' : `${game.white?.username || parsed.headers.White || 'White'} vs ${game.black?.username || parsed.headers.Black || 'Black'}`;
  const { headers } = parsed;
  $('game-subtitle').textContent = demo ? 'The Opera Game · Paris, 1858' : `${game.time_class ? game.time_class[0].toUpperCase() + game.time_class.slice(1) + ' · ' : ''}${headers.Event || 'Imported game'}${game.end_time ? ' · ' + new Date(game.end_time * 1000).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : ''}`;
  $('game-result').textContent = (headers.Result || '*').replaceAll('-', '–');
  renderOpening();
  updatePlayers(); renderMoveList(); render(); renderGames();
  saveReviewPosition();
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
  $('opening-card').open = false;
  $('opening-position').onclick = () => {
    $('opening-card').open = false;
    goTo(opening.ply); selectWorkspaceView('board'); scrollToSection(document.querySelector('.workspace'));
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
  if(boardDragging)return;
  const view=boardView(), chess = new Chess(view.fen);
  const fadingHighlights=paintedPosition?.fen!==view.fen&&paintedPosition?.game===state.parsed&&paintedPosition.flipped===state.flipped
    ? [...$('board').querySelectorAll('.square.last')].map(tile=>({square:tile.dataset.square,color:getComputedStyle(tile).backgroundColor})) : [];
  if (threatFen!==view.fen) { threatFen=view.fen; const primary=primaryMoveThreat(view.fen,view.last); threats=primary?[primary]:[]; selectedThreat=null; }
  const threatened=new Map((showThreats?threats:[]).map(item=>[item.square,item]));
  const targets=inline.targets, selection=inline.selected;
  const focusedSquare=document.activeElement?.closest('#board [data-square]')?.dataset.square;
  const files = state.flipped ? 'hgfedcba' : 'abcdefgh';
  const ranks = state.flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const last = view.last;
  const classification = last ? classifyMove(last, view.before, view.score) : null;
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
    const threat=threatened.get(square);
    const badge = rated ? `<button class="piece-rating ${rating.tone}${r === 0 ? ' edge-top' : ''}${f === 7 ? ' edge-right' : ''}${r < 2 ? ' tooltip-below' : ''}${f < 2 ? ' tooltip-left' : ''}" data-ply="${state.ply}" aria-label="${escape(rating.move + ': ' + rating.label)}" aria-pressed="${Boolean(showRating)}" title="${escape(rating.label)}"><span class="piece-rating-symbol" aria-hidden="true">${qualityGlyph(classification.label)}</span><span class="piece-rating-label" aria-hidden="true">${escape(rating.label)}</span></button>` : '';
    const label=`${square}${piece ? ': ' + (piece.color === 'w' ? 'White ' : 'Black ') + names[piece.type] : ': empty'}${threat ? '. '+threat.explanation : ''}${targets.has(square)?'. Legal destination':''}`;
    squares += `<div class="square${dark ? ' dark' : ''}${highlight ? ' last' : ''}${rated ? ' rated' : ''}${threat?' threatened threat-'+threat.kind:''}${selection===square?' piece-selected':''}${targets.has(square)?' legal-target':''}" data-square="${square}" ${inline.active||threat?`role="button" tabindex="${!inline.active||focusedSquare===square||!focusedSquare&&(selection===square||!selection&&f===0&&r===7)?0:-1}" aria-label="${escape(label)}"`:''} ${inline.active&&piece?.color===chess.turn()?'draggable="true"':''} title="${escape(label)}">${f === 0 ? `<span class="rank" aria-hidden="true">${ranks[r]}</span>` : ''}${r === 7 ? `<span class="file" aria-hidden="true">${files[f]}</span>` : ''}${piece ? pieceSvg(piece) : ''}${threat?'<span class="threat-dot" aria-hidden="true">!</span>':''}${badge}</div>`;
  }
  $('board').innerHTML = squares;
  const nextPosition={fen:view.fen,last:view.last,flipped:state.flipped,game:state.parsed};
  animatePieces($('board'),moveTransitions(paintedPosition,nextPosition));
  fadePreviousHighlights($('board'),fadingHighlights);
  paintedPosition=nextPosition;
  if (focusedSquare && !restoreBadgeFocus) $('board').querySelector(`[data-square="${focusedSquare}"]`)?.focus({preventScroll:true});
  if (restoreBadgeFocus) $('board').querySelector('.piece-rating')?.focus({preventScroll: true});
  $('board').setAttribute('aria-label', `${inline.active?'Explored continuation':'Chess position after '+state.ply+' half-moves'}. ${chess.turn() === 'w' ? 'White' : 'Black'} to move.${rating ? ' ' + rating.move + ': ' + rating.label + '.' : ''} ${chess.fen()}`);
  const fullMove = Number(chess.fen().split(' ')[5]);
  $('move-position').textContent = inline.active ? `Explore · ${last?.san||'Starting position'} · ${inline.line.cursor}/${inline.line.entries.length}` : state.ply ? `Move ${state.parsed.moves[state.ply-1].san} · ${Math.ceil(state.ply / 2)}/${Math.ceil(state.parsed.moves.length / 2)}` : 'Starting position';
  $('review-move-label').textContent = $('move-position').textContent;
  $('coach-move-position').textContent = $('move-position').textContent;
  const cursor=inline.active?inline.line.cursor:state.ply, end=inline.active?inline.line.entries.length:state.parsed.moves.length;
  $('review-previous').disabled = cursor===0;
  $('review-next').disabled = cursor===end;
  $('coach-previous').disabled = cursor===0;
  $('coach-next').disabled = cursor===end;
  for (const id of ['first-move', 'previous-move']) $(id).disabled = cursor===0;
  for (const id of ['last-move', 'next-move']) $(id).disabled = cursor===end;
  const evaluation = view.score;
  const best = evaluation?.best;
  const arrow = $('best-arrow');
  const hideArrow = !state.showArrow || !best || best === '(none)' || !/^[a-h][1-8][a-h][1-8]/.test(best);
  arrow.toggleAttribute('hidden', hideArrow);
  $('best-arrow-shadow').toggleAttribute('hidden',hideArrow);
  if (!hideArrow) {
    const path=arrowPath(best.slice(0,2),best.slice(2,4),state.flipped);
    arrow.setAttribute('d',path); $('best-arrow-shadow').setAttribute('d',path);
  }
  const detail=showThreats?threatened.get(selectedThreat):null;
  $('threat-details').hidden=!detail;
  $('threat-arrow').toggleAttribute('hidden',!detail);
  if(detail){$('threat-title').textContent=detail.label; $('threat-text').textContent=detail.explanation; $('threat-arrow').setAttribute('d',arrowPath(detail.attackers[0].from,detail.attackers[0].to,state.flipped));}
  inline.paint();
  renderMoveStrip();
  const percent = evaluation ? 50 + 45 * Math.tanh(evaluation.cp / 450) : 50;
  $('eval-fill').style.width = `${percent}%`;
  $('eval-fill').style.height = '100%';
  $('bar-score').textContent = formatEvaluation(evaluation);
  document.querySelector('.evaluation-bar').setAttribute('aria-label',`Position evaluation from White’s perspective: ${formatEvaluation(evaluation)}`);
  updatePlayers();
}

function playerColor() {
  if (!state.username || state.demo || !state.selected.white) return null;
  return state.selected.white.username.toLowerCase() === state.username ? 'w' : 'b';
}

function render() {
  if (!state.parsed) return;
  renderBoard(); renderChart();
  const view=boardView(), score = view.score;
  $('evaluation').textContent = formatEvaluation(score);
  $('position-verdict').textContent = !score ? 'Waiting for the engine' : score.terminal ? (score.cp ? 'Checkmate' : 'Drawn position') : score.mate !== null ? `${score.cp > 0 ? 'White' : 'Black'} has forced mate` : Math.abs(score.cp) < 50 ? 'A balanced position' : `${score.cp > 0 ? 'White' : 'Black'} ${Math.abs(score.cp) > 200 ? 'is winning' : 'has the advantage'}`;
  const summary = summarize(state.parsed, state.evaluations, playerColor());
  $('best-count').textContent = summary.count ? summary.counts.Best + summary.counts.Great : '—';
  $('mistake-count').textContent = summary.count ? summary.counts.Mistake : '—';
  $('blunder-count').textContent = summary.count ? summary.counts.Blunder : '—';
  $('loss-summary').textContent = summary.count ? `${playerColor() ? 'Your' : 'All'} moves · Avg. loss ${(summary.averageLoss / 100).toFixed(2)} pawns` : `${playerColor() ? 'Your' : 'All'} moves · engine review`;
  $('next-mistake').disabled = !summary.items.some((item, index) => item && ['Mistake', 'Blunder', 'Inaccuracy'].includes(item.label) && (!playerColor() || state.parsed.moves[index].color === playerColor()));
  const move = view.last;
  const item = move ? inline.active?classifyMove(move,view.before,score):summary.items[state.ply - 1] : null;
  const verdict = selectedMoveVerdict(move, item);
  const announcement = `${verdict.move === '—' ? '' : verdict.move + ': '}${verdict.label}`;
  if ($('move-rating-announcement').textContent !== announcement) $('move-rating-announcement').textContent = announcement;
  $('insight-move').textContent = move ? `${Number(move.before.split(' ')[5])}${move.color === 'w' ? '.' : '...'} ${move.san}` : '';
  $('move-quality').innerHTML = `<span class="coach-mascot" aria-hidden="true"><svg viewBox="0 0 64 64" fill="currentColor"><path d="M17 49h31l-3-8H29c-2-9 13-11 10-23l-8-7-2 7-10 8 1 10 9-5c-7 6-10 10-12 18Z"/><circle cx="31" cy="23" r="2" fill="#edf1fc"/></svg></span><span class="coach-verdict-mark" aria-hidden="true">${item?qualityGlyph(item.label):icon('spark')}</span>`;
  $('move-quality').style.color = item ? qualityColors[item.label] : 'var(--lime)';
  $('board-coach-card').dataset.verdict = item?.label || 'Waiting';
  $('board-coach-card').style.setProperty('--coach-accent',item ? qualityColors[item.label] : '#8ca494');
  $('insight-title').textContent = item ? qualityLabels[item.label] : state.ply === 0 ? 'Every move starts here' : 'A closer look at this move';
  const previous = view.before || score;
  $('recommended-move').textContent = move ? uciToSan(move.before, previous?.best) : uciToSan(view.fen, score?.best);
  $('engine-depth').textContent = previous?.depth ? `Depth ${previous.depth}` : 'Stockfish 19';
  renderCoach(move, move ? view.before : null, score);
  document.querySelector('.insight-kicker').textContent=inline.active?'YOUR EXPLORED CONTINUATION':'YOUR MOVE COACH';
  const analyzed = state.parsed.fens.filter((_, index) => evaluationReady(state.evaluations[index], state.mode)).length;
  const searched = state.parsed.fens.filter((_, index) => state.evaluations[index]).length;
  const total = state.parsed.fens.length;
  const percent = Math.round(analyzed / total * 100);
  $('analysis-percent').textContent = `${percent}%`;
  document.querySelector('.progress-track').setAttribute('aria-valuenow',String(percent));
  document.querySelector('.engine-progress').setAttribute('aria-busy',String(state.running));
  $('progress-fill').style.width = `${percent}%`;
  $('analysis-status').innerHTML = `<span class="live-dot"></span>${state.running ? `Reviewing position ${state.reviewIndex + 1} of ${total}${state.mode === 'precise' ? ' · depth 18' : ''}` : analyzed === total ? 'Review complete' : searched === total ? 'More search depth needed' : searched ? 'Review paused' : 'Ready to review'}`;
  document.querySelector('.engine-progress').classList.toggle('running', state.running);
  $('analyze-label').textContent = state.running ? 'Pause review' : analyzed === total ? 'Review complete' : searched === total ? 'Deepen remaining' : searched ? 'Resume review' : 'Review this game';
  $('analyze-button').disabled = inline.active || analyzed === total && !state.running;
  $('analysis-speed').disabled = state.running || inline.active;
  if(inline.active) $('analyze-label').textContent='Exploring line';
  updateMoveRatings(summary.items);
  training.render();
}

let coachContext = null, coachReport = null;
function renderCoach(move, before, after) {
  if (!coachContext || coachContext[0] !== move || coachContext[1] !== before || coachContext[2] !== after) {
    if (coachContext?.[0] !== move) { boardCoach.close(); $('coach-lines').open = false; $('coach-panel').scrollTop=0; }
    coachReport = coachMove(move, before, after); coachContext = [move, before, after];
  }
  const report = coachReport, ready = report.status === 'ready';
  $('board-coach-card').dataset.reviewState=report.status;
  const brief=report.brief||report.summary;
  $('coach-brief').textContent = report.status==='pending'?'Reviewing this move…':report.status==='start'?'Choose a move to start your review.':compactCoachText(brief);
  $('coach-brief').title=brief;
  $('board-coach-card').classList.toggle('coach-ready',ready);
  const played=move ? move.from+move.to+(move.promotion||'') : null;
  $('board-coach-card').classList.toggle('has-alternative',Boolean(ready&&report.bestMove&&report.bestMove!==played));
  $('insight-text').textContent = report.summary;
  $('coach-details').hidden = !ready;
  $('coach-why-label').textContent = ['Inaccuracy','Mistake','Blunder'].includes(report.rating) ? 'Why this move is weaker' : 'What this move does';
  $('coach-why').textContent = report.why;
  $('coach-better').textContent = report.better;
  $('coach-lesson').textContent = report.lesson;
  $('coach-comparison').textContent = report.comparison || '';
  $('coach-best-line').textContent = report.bestLine;
  $('coach-reply-line').textContent = report.replyLine;
  $('coach-best-row').hidden = !report.bestLine;
  $('coach-reply-row').hidden = !report.replyLine;
  $('coach-lines').hidden = !report.bestLine && !report.replyLine;
  $('coach-try-idea').disabled = !report.bestMove;
  const tryRecommendation=()=>{if(report.bestMove&&move){boardCoach.close();inline.tryBest(report.bestMove);selectWorkspaceView('board');scrollToSection(document.querySelector('.workspace'));boardCoach.reveal();}};
  $('coach-try-idea').onclick=tryRecommendation;
  $('recommended-move').disabled=!report.bestMove;
  $('recommended-move').setAttribute('aria-label',report.bestMove?`Try ${$('recommended-move').textContent} on the board`:'Engine recommendation not available');
  $('recommended-move').onclick=tryRecommendation;
  $('coach-note').textContent = ready ? `Based on Stockfish’s legal continuations${before?.depth ? ` · Depth ${before.depth}` : ''}. Deeper review can change the recommendation.` : 'The coach updates as each move is reviewed.';
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
  stripSource=null;stripPosition=null;
  const rows = new Map();
  state.parsed.moves.forEach((move, index) => {
    const number = move.before.split(' ')[5];
    if (!rows.has(number)) rows.set(number, { number });
    rows.get(number)[move.color] = { move, ply: index + 1 };
  });
  const cell = entry => entry ? `<button class="move-cell" data-ply="${entry.ply}" title="Go to ${escape(entry.move.san)}"><span>${escape(entry.move.san)}</span><i class="stat-dot" hidden></i></button>` : '<span></span>';
  $('move-list').innerHTML = [...rows.values()].map(row => `<div class="move-row"><span class="move-number">${row.number}.</span>${cell(row.w)}${cell(row.b)}</div>`).join('');
}
function moveLabelForStrip(move){return `${move.before.split(' ')[5]}${move.color==='w'?'.':'…'} ${move.san}`;}
function renderMoveStrip(){
  const strip=$('move-strip'),moves=inline.active?inline.line.entries:state.parsed.moves;
  const cursor=inline.active?inline.line.cursor:state.ply,scores=inline.active?inline.line.scores:state.evaluations;
  const signature=moves.map(move=>move.from+move.to+(move.promotion||'')).join(' ');
  if(stripSource!==moves||stripSignature!==signature){
    strip.innerHTML='<button data-strip-ply="0" aria-label="'+(inline.active?'Variation start':'Starting position')+'">Start</button>'+moves.map((move,index)=>`<button data-strip-ply="${index+1}" aria-label="Go to ${escape(moveLabelForStrip(move))}"><span>${escape(compactMoveText(move))}</span><i class="strip-dot" hidden></i></button>`).join('');
    stripSource=moves;stripSignature=signature;stripPosition=null;
  }
  strip.setAttribute('aria-label',inline.active?'Explored continuation':'Game moves');
  for(const button of strip.querySelectorAll('[data-strip-ply]')){
    const ply=Number(button.dataset.stripPly),current=ply===cursor;
    button.setAttribute('aria-current',current?'step':'false');
    const move=moves[ply-1],rating=move?classifyMove(move,scores[ply-1],scores[ply]):null;
    const dot=button.querySelector('.strip-dot');
    if(dot){dot.hidden=!rating;if(rating)dot.style.background=qualityColors[rating.label];}
    button.title=move?`${moveLabelForStrip(move)}${rating?' · '+qualityLabels[rating.label]:''}`:'Starting position';
  }
  if(stripPosition!==cursor||strip.clientWidth&&strip.dataset.needsCenter==='true'){
    const active=strip.querySelector('[aria-current="step"]');
    if(active&&strip.clientWidth){strip.scrollLeft=active.offsetLeft-strip.clientWidth/2+active.offsetWidth/2;strip.dataset.needsCenter='false';}
    else strip.dataset.needsCenter='true';
    stripPosition=cursor;
  }
}
$('move-strip').onclick=event=>{const button=event.target.closest('[data-strip-ply]');if(button){const ply=Number(button.dataset.stripPly);if(inline.active){inline.jump(ply);boardCoach.reveal({playback:true});}else goTo(ply);}};
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
  boardCoach.close();
  const restart=inline.active?inline.exit(false):false;
  const previous = state.ply;
  state.ply = Math.max(0, Math.min(state.parsed.moves.length, ply));
  moveSounds.play(navigationSoundMove(state.parsed.moves, previous, state.ply)); render();
  saveReviewPosition();
  const selectedCell=document.querySelector(`.move-cell[data-ply="${state.ply}"]`);
  if (state.tab === 'moves'&&selectedCell?.getClientRects().length) selectedCell.scrollIntoView({ block:'nearest', behavior:'instant' });
  boardCoach.reveal({playback:true});
  if(restart) startAnalysis();
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
  state.engine = new Engine(); state.running = true; state.reviewIndex = 0;
  $('analysis-error').hidden = true; render();
  try {
    const engine = state.engine;
    const parsed = state.parsed;
    for (let index = 0; index < parsed.fens.length; index++) {
      if (run !== state.run) return;
      if (evaluationReady(state.evaluations[index], state.mode)) continue;
      state.reviewIndex = index; render();
      const history = { startFen: parsed.fens[0], moves: parsed.moves.slice(0, index).map(move => move.from + move.to + (move.promotion || '')) };
      const score = await engine.evaluate(parsed.fens[index], reviewSearch(state.mode, state.evaluations[index]), history);
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
  $('library-count').textContent=state.games.length ? `${state.games.length} ${state.games.length===1?'game':'games'}` : 'Connect or import';
  if (!state.profile && !state.games.length) return;
  const { entries, total, pages, page, start } = pageGames(state.games, state.filter, state.libraryPage);
  state.libraryPage = page;
  $('game-count').textContent = state.games.length;
  $('library-title').textContent = state.profile ? 'Recent games' : 'Your imported game';
  $('library-subtitle').textContent = 'Open a match in its own analysis page.';
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
  searchBusy(true);
  searchStatus('Finding your profile and recent games…');
  try {
    const {profile, archives} = await loadPlayer(username, controller.signal);
    let games = [], archiveIndex = 0;
    while (archiveIndex < archives.length && games.length < 30 && archiveIndex < 6) {
      games.push(...await loadArchive(archives[archiveIndex++], controller.signal));
    }
    if (controller.signal.aborted) return;
    state.username = username; state.profile = profile; state.archives = archives; state.archiveIndex = archiveIndex;
    $('home-username').value=username;
    state.games = games; state.filter = 'all'; state.libraryPage = 0;
    $('profile').hidden = false;
    const avatar = typeof profile.avatar === 'string' && profile.avatar.startsWith('https://') ? `<img src="${escape(profile.avatar)}" alt="" referrerpolicy="no-referrer"/>` : `<span class="profile-fallback">${escape(profile.username?.[0]?.toUpperCase() || '♙')}</span>`;
    $('profile').innerHTML = `${avatar}<div><strong>${escape(profile.username)}</strong><small>${state.games.length} recent games loaded</small></div>`;
    document.querySelectorAll('[data-filter]').forEach(button => { button.classList.toggle('selected', button.dataset.filter === 'all'); button.setAttribute('aria-pressed', String(button.dataset.filter === 'all')); });
    renderGames();
    searchStatus(games.length ? `${state.games.length} games ready. Choose a match to review.` : 'This account has no completed standard chess games available yet.');
    try { localStorage.setItem('knightlab-username', username); } catch {}
    $('connect-dialog').close(); $('username').blur(); scrollToSection($('game-library')); $('game-library').focus({ preventScroll: true });
  } catch (error) { if (!controller.signal.aborted) searchStatus(error.message, true); }
  finally { if (state.request === controller) searchBusy(false); }
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

function openImport() { if ($('connect-dialog').open) $('connect-dialog').close(); $('import-error').hidden = true; $('import-dialog').showModal(); }
function showInfo(title, content) { $('info-title').textContent = title; $('info-body').innerHTML = content; $('info-dialog').showModal(); }
const instructions = '<div class="info-step"><b>1</b><div><strong>Bring your games</strong><p>Enter your public Chess.com username. No sign-in or password is needed. You can also import a single PGN game.</p></div></div><div class="info-step"><b>2</b><div><strong>Choose a game</strong><p>Your most recent completed standard chess games appear in the library. Filter by time control or load older games.</p></div></div><div class="info-step"><b>3</b><div><strong>Find your turning points</strong><p>Stockfish reviews the positions on your device. Explore the board, click the evaluation chart, and jump to mistakes. The best-move arrow shows the recommended move from the position currently on the board.</p></div></div><p>The public Chess.com API may take up to 24 hours to refresh. Live games and chess variants are not supported.</p>';
const method = `<p>Each position is evaluated by <a href="https://github.com/nmrugg/stockfish.js/tree/v19.0.1" target="_blank" rel="noopener noreferrer">Stockfish 19 Lite</a>. A positive score favors White; a negative score favors Black. One pawn equals 100 centipawns. “M” means a forced mate.</p>
<table class="method-table"><tbody><tr><td>Great</td><td>Top choice, clearly ahead of the alternative</td></tr><tr><td>Best</td><td>Matches the engine’s first choice</td></tr><tr><td>Good</td><td>Less than 0.50 pawn lost</td></tr><tr><td>Inaccuracy</td><td>0.50–0.99 pawn lost</td></tr><tr><td>Mistake</td><td>1.00–1.99 pawns lost</td></tr><tr><td>Blunder</td><td>2.00+ pawns lost</td></tr></tbody></table>
<p>Great moves match the engine’s top choice, beat its next candidate by at least one pawn at the same search depth of at least 8, and lose no more than 0.30 pawn in the resulting position. Best / Great counts combine both categories.</p>
<p>Move ratings are based on evaluation loss from the player’s perspective. They can change with deeper analysis. Mate scores use a large capped value for the chart and loss calculation.</p>
<p>Standard review uses 650 ms per position to give you a quick first pass. Deep review targets depth 18 with two candidate moves. If a position needs more time, Deepen remaining searches it again, allowing up to 80 seconds. You can pause and resume either review. The chart is capped at ±5 pawns.</p>
<p>For a connected account, summary counts cover your moves. Imported and demo games summarize both players. A colored badge on the moved piece rates the selected move; tap it to see the full label. The arrow recommends the next move in the current position; the insight card reviews the move just played.</p>
<p>Threats highlights only the leading new attack from the current move. The old highlight clears on the next move. Red means check or no immediate legal recapture; amber means a defended attack or risky exchange. Tap the square to see why. Explore moves lets you try legal continuations on the same board and return to the original game.</p>
<p>The compact coach stays above the board and updates with each move. Details expands the full explanation in the page. It describes legal Stockfish continuations and observable features such as captures, checks, castling, and development. Use Deep review to investigate critical decisions.</p>
<p><a href="/STOCKFISH-LICENSE.txt" target="_blank">Stockfish license</a> · <a href="/THIRD-PARTY-NOTICES.txt" target="_blank">Third-party notices</a></p>`;

$('username-form').addEventListener('submit', searchPlayer);
function openConnect() { $('connect-dialog').showModal(); $('username').focus({preventScroll:true}); }
$('focus-username').onclick = openConnect;
$('open-connect').onclick = openConnect;
$('games-search').onclick=openConnect;
$('home-search').addEventListener('submit',event=>{
  event.preventDefault();$('username').value=$('home-username').value;searchPlayer();
});
$('home-demo').onclick=()=>{setGame({pgn:DEMO_PGN},{demo:true,analyze:false});router.go('analysis');};
function homeAnalyze(){if(state.games.length)router.go('games');else openConnect();}
for(const id of ['home-analyze','home-path-review'])$(id).onclick=homeAnalyze;
for(const id of ['home-play','home-play-art','home-path-play'])$(id).onclick=()=>$('play-open').click();
for(const id of ['home-tactics','home-tactics-art'])$(id).onclick=()=>{
  router.go('tactics');
};
document.querySelectorAll('[data-home-filter]').forEach(button=>button.onclick=()=>{
  for(const option of document.querySelectorAll('[data-home-filter]'))option.setAttribute('aria-pressed',String(option===button));
  for(const card of document.querySelectorAll('[data-home-category]'))card.hidden=button.dataset.homeFilter!=='all'&&card.dataset.homeCategory!==button.dataset.homeFilter;
});
document.querySelectorAll('[data-home-answer]').forEach(button=>{
  button.setAttribute('aria-pressed','false');
  button.onclick=()=>{
    const correct=button.dataset.homeAnswer==='d5';
    for(const option of document.querySelectorAll('[data-home-answer]')){
      option.setAttribute('aria-pressed',String(option===button));
      option.classList.toggle('is-correct',option===button&&correct);
      option.classList.toggle('is-other',option===button&&!correct);
    }
    $('home-puzzle-feedback').textContent=correct?'Exactly. …d5 challenges White’s center.':'Legal, but try the central pawn break that defines the French.';
  };
});
$('games-nav').onclick = () => { selectWorkspaceView('board'); scrollToSection(document.querySelector('.workspace')); };
$('library-nav').onclick = () => scrollToSection($('game-library'));
for (const id of ['sidebar-import','hero-import','home-import']) $(id).onclick = openImport;
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
    searchBusy(false);
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
function stepMove(delta) { if(inline.active){boardCoach.close();inline.jump(inline.line.cursor+delta);boardCoach.reveal({playback:true});}else goTo(state.ply+delta); }
$('first-move').onclick = () => inline.active?inline.jump(0):goTo(0);
$('previous-move').onclick = () => stepMove(-1);
$('next-move').onclick = () => stepMove(1);
$('last-move').onclick = () => inline.active?inline.jump(inline.line.entries.length):goTo(state.parsed.moves.length);
$('try-move').onclick=()=>{
  if(inline.active) inline.exit();
  else { inline.start(); selectWorkspaceView('board'); scrollToSection(document.querySelector('.workspace')); }
};
$('toggle-threats').onclick=()=>{showThreats=!showThreats;selectedThreat=null;$('toggle-threats').classList.toggle('toggled',showThreats);$('toggle-threats').setAttribute('aria-pressed',String(showThreats));renderBoard();};
$('threat-close').onclick=()=>{selectedThreat=null;renderBoard();};
$('board').onclick = event => {
  const badge = event.target.closest('.piece-rating');
  if (badge) { badge.setAttribute('aria-pressed', String(badge.getAttribute('aria-pressed') !== 'true'));return; }
  const square=event.target.closest('[data-square]')?.dataset.square;
  if(!square) return;
  if(inline.active) inline.click(square);
  if(showThreats && threats.some(item=>item.square===square)) {selectedThreat=square;renderBoard();}
};
$('board').addEventListener('dragstart',event=>{
  const square=event.target.closest('[data-square]')?.dataset.square;
  if(!inline.active||!square){event.preventDefault();return;}
  boardDragging=true; inline.select(square,false); event.dataTransfer.setData('text/plain',square);event.dataTransfer.effectAllowed='move';
  for(const tile of $('board').querySelectorAll('[data-square]')) {tile.classList.toggle('piece-selected',tile.dataset.square===inline.selected);tile.classList.toggle('legal-target',inline.targets.has(tile.dataset.square));}
});
$('board').addEventListener('dragend',()=>{boardDragging=false;renderBoard();});
$('board').addEventListener('dragover',event=>{if(inline.active)event.preventDefault();});
$('board').addEventListener('drop',event=>{
  if(!inline.active)return;event.preventDefault();boardDragging=false;
  const from=event.dataTransfer.getData('text/plain'),to=event.target.closest('[data-square]')?.dataset.square;
  if(/^[a-h][1-8]$/.test(from)&&to)inline.attempt(from,to);
});
$('board').addEventListener('keydown',event=>{
  const square=event.target.closest('[data-square]')?.dataset.square;if(!square||event.target.closest('.piece-rating'))return;
  if(event.key==='Enter'||event.key===' '){event.preventDefault();event.target.click();return;}
  const offsets={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(!inline.active||!offsets[event.key])return;
  event.preventDefault();const [dx,dy]=offsets[event.key],sign=state.flipped?-1:1;
  const file=square.charCodeAt(0)+dx*sign,rank=Number(square[1])-dy*sign;
  if(file>=97&&file<=104&&rank>=1&&rank<=8)$('board').querySelector(`[data-square="${String.fromCharCode(file)+rank}"]`)?.focus();
});
$('flip-board').onclick = () => { state.flipped = !state.flipped; renderBoard(); saveReviewPosition(); boardCoach.reveal(); };
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
$('move-list').onclick = event => { const button = event.target.closest('[data-ply]'); if (button) { goTo(Number(button.dataset.ply)); if (compactLayout.matches) { selectWorkspaceView('board'); scrollToSection(document.querySelector('.workspace')); $('mobile-board-tab').focus({preventScroll:true}); } } };
function selectWorkspaceView(view) {
  if(view==='coach'){boardCoach.open();return;}
  state.mobileView = view;
  document.querySelector('.workspace').dataset.mobileView = view;
  if(view==='board'&&state.parsed)renderMoveStrip();
  if (view !== 'board') state.tab = view;
  for (const name of ['moves','overview']) {
    $(name+'-panel').hidden = name !== state.tab;
    $(name+'-tab').classList.toggle('selected', name === state.tab);
    $(name+'-tab').setAttribute('aria-selected', String(name === state.tab));
    $(name+'-tab').tabIndex = name === state.tab ? 0 : -1;
  }
  for (const name of ['board','moves','overview']) {
    $('mobile-'+name+'-tab').classList.toggle('selected', name === view);
    $('mobile-'+name+'-tab').setAttribute('aria-selected', String(name === view));
    $('mobile-'+name+'-tab').tabIndex = name === view ? 0 : -1;
  }
}
for (const name of ['moves','overview']) $(name+'-tab').onclick = () => selectWorkspaceView(name);
for (const name of ['board','moves','overview']) $('mobile-'+name+'-tab').onclick = () => { selectWorkspaceView(name); scrollToSection(document.querySelector('.workspace')); };
$('review-previous').onclick = () => stepMove(-1);
$('review-next').onclick = () => stepMove(1);
for (const tablist of document.querySelectorAll('[role="tablist"]')) tablist.addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const index = tabs.indexOf(event.target); if (index < 0) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (index+(event.key === 'ArrowRight' ? 1 : -1)+tabs.length)%tabs.length;
  tabs[next].click(); tabs[next].focus({preventScroll:true});
});
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
  if(router?.page!=='analysis')return;
  if(inline.active && event.target.closest('#board'))return;
  if (event.target.closest('[role="tablist"]') || ['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName) || document.querySelector('dialog[open]:not(#focus-dialog)')) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); stepMove(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); stepMove(1); }
  if (event.key === 'Home') { event.preventDefault(); $('first-move').onclick(); }
  if (event.key === 'End') { event.preventDefault(); $('last-move').onclick(); }
  if (event.key.toLowerCase() === 'f') $('flip-board').onclick();
});
window.addEventListener('pagehide', () => { saveReviewPosition(); inline.reset(); explorer.reset(); stopAnalysis(); state.request?.abort(); moveSounds.destroy(); });
try { $('username').value = $('home-username').value = localStorage.getItem('knightlab-username') || ''; } catch {}
const lastReview=reviewMemory.last();
try {
  if(lastReview){parseGame(lastReview.game.pgn);if(!lastReview.demo)state.games=[lastReview.game];setGame(lastReview.game,{demo:lastReview.demo,analyze:false});}
  else setGame({pgn:DEMO_PGN},{demo:true,analyze:false});
} catch {setGame({pgn:DEMO_PGN},{demo:true,analyze:false});}
const learning=createLearningUI({storage:reviewStorage,onCourseComplete:()=>router.go('learn'),onAnalyze:pgn=>{
  setGame({pgn},{analyze:false});router.go('analysis');
}});
const preview=new Chess();for(const san of ['e4','e6','d4','d5'])preview.move(san);
document.querySelectorAll('.milestone-piece').forEach((element,index)=>element.innerHTML=pieceSvg({type:['p','n','r','k'][index],color:'w'}));
for(const id of ['course-cover-board']){
  let html='';
  for(let rank=8;rank>=1;rank--)for(const file of 'abcdefgh'){
    const square=file+rank,piece=preview.get(square);
    html+=`<div class="square${(file.charCodeAt(0)-97+rank)%2===1?' dark':''}${['d7','d5'].includes(square)?' last':''}">${piece?pieceSvg(piece):''}</div>`;
  }
  $(id).innerHTML=html;
}
router=createPageRouter(page=>{
  for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  closeWorkspaceMenu();
  $('library-nav').classList.toggle('active',page==='games');
  $('games-nav').classList.toggle('active',page==='analysis');
  for(const [id,active] of [['library-nav',page==='games'],['games-nav',page==='analysis']]){
    if(active)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');
  }
  if(page==='analysis'){if(!state.running)startAnalysis();}
  else {saveReviewPosition();if(inline.active)inline.exit(false);stopAnalysis();}
  if(page==='games')setLibraryOpen(true);
  if(page==='learn'||page==='home')learning.refresh();
  if(['french','tactics','opengames'].includes(page))learning.open(page);
});
router.start();
