import {animatePieces,moveTransitions} from './piece-motion.js';
import {finishBoard,enableBoardDrag} from './board-surface.js';
import { Chess } from 'chess.js';
import { PlaySession, playMoveRows } from './play.js';
import { Engine } from './engine.js';
import { formatEvaluation, terminalEvaluation, uciToSan } from './game.js';
import { pieceSvg } from './pieces.js';
import { pieceNames } from './training.js';
import { LEVEL_TEST_DIFFICULTY, PLAY_LEVELS, playSearch } from './play-settings.js';
import { assessLevelTestElo, assessPlayGame, formatLevelTestElo, MIN_ASSESSMENT_MOVES, MIN_LEVEL_TEST_MOVES, MIN_RATING_DECISIONS, reviewPlayGame } from './play-assessment.js';
import { restoreLevelTestAttempt } from './level-test.js';

const $ = id => document.getElementById(id);
const MIN_ENGINE_REPLY_MS = 1400;

export function createExploreUI({ context, pause, resume, playSound, onLevelTestResult = () => {}, onLevelTestAttempt = () => {}, onLevelTestDone = () => {} }) {
  const dialog = $('explore-dialog');
  const surface = $('play-surface');
  const levelTestMount = $('level-test-play');
  const settings = $('play-settings');
  const settingsButton = $('play-settings-open');
  settingsButton.onclick = () => settings.showModal();
  $('play-settings-done').onclick = () => settings.close();
  settings.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    settings.close();
  });
  settings.addEventListener('close', () => { if (dialog.open) settingsButton.focus({ preventScroll: true }); });
  let variation, selected = null, promotion = null, flipped = false, engine = null;
  let result = null, busy = false, run = 0, savedGame = null, resumeReview = false;
  let originFen = null, coursePractice = null;
  let hintRequested=false,painted=null;
  let scoresheetSession, scoresheetRevision;
  let assessment = null, assisted = false;
  let testMode = false, previousDifficulty = null;
  let legacyTestDifficulty = null;
  let testScores = [];
  let resignTrigger = null;
  const sessionVisible = () => testMode ? !levelTestMount.hidden : dialog.open;
  const evaluationEnabled = () => !testMode && $('play-show-evaluation').checked;
  function cancel({ keepIdleEngine = false } = {}) {
    run++;
    if (!keepIdleEngine || busy) { engine?.destroy(); engine = null; }
    busy = false;
  }
  function reset() {
    resumeReview = false;
    if (testMode) { leaveLevelTest(); return; }
    cancel(); clearAssessment(); if (dialog.open) dialog.close(); variation = null;
  }

  function saveTestAttempt() {
    if (!testMode) return;
    onLevelTestAttempt({ difficulty:legacyTestDifficulty || LEVEL_TEST_DIFFICULTY, color:variation.color,
      moves:variation.moves.map(move => move.lan), resigned:Boolean(variation.resignedColor), finished:Boolean(variation.ending) });
  }

  function scrollToSessionStart() {
    if (testMode) window.scrollTo({ top:0, behavior:'instant' });
    else dialog.scrollTop = 0;
  }
  function focusBoard() {
    $('explore-board').querySelector('[tabindex="0"]')?.focus({ preventScroll:true });
  }
  function setReportView(open) {
    $('play-report').hidden = !open;
    $('play-workspace').hidden = open;
    settingsButton.hidden = open;
    const fromPosition = $('play-origin').value === 'current';
    $('play-settings-summary').hidden = open || fromPosition;
    $('explore-origin').hidden = open || !fromPosition;
    scrollToSessionStart();
    if (open) {
      if (settings.open) settings.close();
      $('play-report-title').focus({ preventScroll: true });
    }
  }
  function clearAssessment() {
    const previous = assessment;
    assessment = null;
    previous?.engine?.destroy();
    if (!$('play-report').hidden) setReportView(false);
  }
  function renderAssessment() {
    const { game, scores, state, checkingElo } = assessment;
    const report = assessment.result;
    const outcome = game.ending === 'Resignation' ? 'You resigned' : { win: 'You won', loss: 'Stockfish won', draw: 'Game drawn' }[report.outcome];
    $('play-report-title').textContent = checkingElo ? 'Elo check' : testMode ? 'Your test results' : outcome;
    const reason = ['Checkmate','Stalemate'].includes(game.ending) ? `${game.ending} · ` : '';
    const opponent = testMode ? legacyTestDifficulty ? 'Earlier test format' : 'Full-strength Stockfish' : `Stockfish ${PLAY_LEVELS[game.difficulty].label}`;
    $('play-report-game').textContent = `${testMode && !checkingElo ? `${outcome} · ` : ''}${reason}${opponent} · ${report.moves} of your moves`;
    $('play-report-elo-card').hidden = !testMode;
    $('play-report-elo').textContent = state === 'done' && !report.rating ? 'Unavailable' : formatLevelTestElo(report.rating);
    const sample = $('play-report-sample');
    sample.hidden = report.decisions == null || state !== 'done';
    if (!sample.hidden) sample.textContent = report.rating ? `${report.decisions} eligible moves` : `${report.decisions} of ${MIN_RATING_DECISIONS} eligible moves`;
    $('play-report-accuracy').textContent = report.accuracy == null ? '—' : `${report.accuracy}%`;
    $('play-report-level').textContent = report.level || '—';
    const progress = $('play-report-progress');
    progress.hidden = state !== 'running';
    progress.max = game.fens.length;
    progress.value = scores.filter(Boolean).length;
    $('play-report-count').hidden = state !== 'running';
    $('play-report-count').textContent = `${progress.value} of ${progress.max} positions checked`;
    let status = '';
    if (state === 'running') status = 'Stockfish is reviewing the game…';
    else if (state === 'error') status = 'The review stopped. Retry to analyze the remaining positions.';
    else if (checkingElo) status = 'Your match is still in progress. Keep playing to add eligible moves.';
    else if (testMode && !report.rating) status = legacyTestDifficulty ? 'Start a fresh test against full-strength Stockfish for an Elo estimate.'
      : 'An Elo estimate needs ten decisions beyond the opening in positions that are still competitive.';
    else if (game.assisted) status = 'For a performance level, finish a game without hints, live evaluation, undo or mid-game settings changes.';
    else if (report.moves < MIN_ASSESSMENT_MOVES) status = `Play at least ${MIN_ASSESSMENT_MOVES} moves of your own for a performance level.`;
    if ($('play-report-status').textContent !== status) $('play-report-status').textContent = status;
    $('play-report-retry').hidden = state !== 'error';
    $('play-report-next').hidden = testMode || !report.recommended;
    $('play-report-next').textContent = report.recommended ? `Recommended opponent: Stockfish ${PLAY_LEVELS[report.recommended].label}.` : '';
    $('play-report-test-method').hidden = !testMode;
    $('play-report-standard-method').hidden = testMode;
    const again = $('play-report-again');
    again.textContent = !testMode && report.recommended ? `Play again · ${PLAY_LEVELS[report.recommended].label}` : 'Play again';
    again.hidden = testMode && (state !== 'done' || checkingElo);
    again.disabled = again.hidden;
    $('play-report-done').hidden = !testMode;
    const back = $('play-report-back');
    back.textContent = checkingElo ? 'Keep playing' : 'Back to board';
    back.classList.toggle('primary-button', checkingElo);
    back.classList.toggle('practice-secondary', !checkingElo);
    $('play-report-done').textContent = state === 'done' && !checkingElo ? 'Done' : 'Continue later';
  }
  async function runAssessment() {
    const current = assessment;
    if (!current || current.engine) return;
    const reviewer = new Engine();
    const active = () => assessment === current && sessionVisible();
    current.engine = reviewer;
    current.state = 'running';
    renderAssessment();
    try {
      await reviewPlayGame(current.game, current.scores, reviewer, { active, progress: renderAssessment });
      if (!active()) return;
      current.result = assessPlayGame(current.game, current.scores);
      if (current.result.accuracy == null) { current.state = 'error'; return; }
      if (testMode) {
        const opening = current.result.moves >= MIN_LEVEL_TEST_MOVES && current.game.difficulty === LEVEL_TEST_DIFFICULTY
          ? await import('./opening.js').catch(() => null) : null;
        if (!active()) return;
        const bookPly = opening?.identifyOpening(current.game).ply ?? 0;
        const elo = assessLevelTestElo(current.game, current.scores, bookPly);
        if (current.checkingElo && elo.rating && variation.resign()) {
          current.game.result = variation.result;
          current.game.ending = variation.ending;
          current.result = assessPlayGame(current.game, current.scores);
          current.checkingElo = false;
          render();
        }
        Object.assign(current.result, elo);
        if (!current.checkingElo) onLevelTestResult(current.game, current.result);
      }
      current.state = 'done';
    } catch { if (active()) current.state = 'error'; }
    finally {
      reviewer.destroy();
      if (active()) { current.engine = null; renderAssessment(); }
    }
  }
  function assessGame({ checkingElo = false } = {}) {
    if (assessment || variation.mode !== 'engine' || $('play-origin').value !== 'new') return;
    if (checkingElo && (variation.ending || variation.engineTurn || promotion)) return;
    const moves = variation.moves;
    if (!moves.some(move => move.color === variation.color)) return;
    const difficulty = testMode ? legacyTestDifficulty || LEVEL_TEST_DIFFICULTY : $('play-difficulty').value;
    const game = { moves, fens: [variation.startFen, ...moves.map(move => move.after)], color: variation.color,
      difficulty, result: variation.result, ending: variation.ending, assisted };
    assessment = { game, scores:testMode ? testScores : [], checkingElo, state:'running', result:assessPlayGame(game, []), engine:null };
    runAssessment();
    setReportView(true);
  }
  function renderScoresheet(moves) {
    if (scoresheetSession === variation && scoresheetRevision === variation.revision) return;
    scoresheetSession = variation;
    scoresheetRevision = variation.revision;
    const line = $('explore-line');
    const atLatest = line.scrollHeight - line.clientHeight - line.scrollTop < 12;
    const rows = playMoveRows(moves).map(({ number, white, black }) => {
      const row = document.createElement('tr');
      for (const value of [number, white || '—', black || '—']) row.insertCell().textContent = value;
      return row;
    });
    $('play-move-rows').replaceChildren(...rows);
    line.hidden = !rows.length;
    $('play-moves-empty').hidden = Boolean(rows.length);
    if (atLatest) line.scrollTop = line.scrollHeight;
  }
  function render(focusSquare) {
    if (!variation) return;
    focusSquare ||= document.activeElement?.closest('#explore-board [data-square]')?.dataset.square;
    const chess = variation.chess, files = flipped ? 'hgfedcba' : 'abcdefgh';
    const ranks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
    const targets = new Set(selected && !variation.engineTurn ? variation.legal(selected).map(move => move.to) : []);
    const moves = variation.moves;
    const last = moves.at(-1), tabSquare = focusSquare || selected || files[0] + ranks[7];
    let html = '';
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const square = files[f] + ranks[r], piece = chess.get(square);
      const label = `${square}, ${piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${pieceNames[piece.type]}` : 'empty'}${targets.has(square) ? ', legal destination' : ''}`;
      html += `<button class="square practice-square${(files.charCodeAt(f)-97+ranks[r])%2 === 1 ? ' dark' : ''}${selected === square ? ' piece-selected' : ''}${targets.has(square) ? ' legal-target' : ''}${last && [last.from,last.to].includes(square) ? ' last' : ''}" data-square="${square}" tabindex="${square === tabSquare ? 0 : -1}" aria-label="${label}" aria-pressed="${selected === square}">${f === 0 ? `<span class="rank" aria-hidden="true">${ranks[r]}</span>` : ''}${r === 7 ? `<span class="file" aria-hidden="true">${files[f]}</span>` : ''}${piece ? pieceSvg(piece) : ''}</button>`;
    }
    $('explore-board').innerHTML = html;finishBoard($('explore-board'),chess,selected);
    const position={game:variation,fen:variation.fen,last,flipped};animatePieces($('explore-board'),moveTransitions(painted,position));painted=position;
    const fromPosition=$('play-origin').value==='current';
    const practicing=coursePractice&&fromPosition;
    $('explore-course-practice').hidden=!practicing;
    if(practicing){
      const count=moves.filter(move=>move.color===coursePractice.color).length;
      $('explore-course-goal').textContent=coursePractice.goal;
      $('explore-course-progress').textContent=variation.ending?'Position finished. Review your decisions or return to the lesson.':count>=coursePractice.moves?'Practice target reached. Keep playing or return to the lesson.':`${count} / ${coursePractice.moves} of your moves · Apply the idea and compare replies.`;
    }
    $('explore-turn').textContent = variation.ending ? `${variation.ending}${variation.result === '1-0' ? ' · White wins' : variation.result === '0-1' ? ' · Black wins' : ''}` : `${chess.turn() === 'w' ? 'White' : 'Black'} to move${variation.engineTurn ? ' · Stockfish' : variation.mode === 'engine' ? ' · Your turn' : ''}${chess.isCheck() ? ' · Check' : ''}`;
    $('play-evaluation-perspective').hidden=!evaluationEnabled();
    $('explore-evaluation').textContent=result?formatEvaluation(result):'—';
    $('explore-best').hidden=!hintRequested;
    if(hintRequested){
      const suggestion=uciToSan(variation.fen,result?.best);
      $('explore-best').textContent=busy?'Finding a suggestion…':suggestion==='—'?'No suggestion available. Try Hint again.':`Suggested move: ${suggestion} · Depth ${result.depth}`;
    }
    $('play-hint').hidden=testMode;
    $('play-hint').disabled=testMode||busy||variation.engineTurn||Boolean(variation.ending);
    renderScoresheet(moves);
    $('explore-undo').hidden = testMode;
    $('explore-undo').disabled = testMode || !variation.canUndo;
    $('explore-undo').setAttribute('aria-label', variation.mode === 'engine' ? 'Undo turn' : 'Undo move');
    $('explore-reset').hidden = !fromPosition;
    $('explore-reset').disabled = !moves.length;
    $('explore-reply').hidden = variation.mode === 'engine' && (!variation.engineTurn || busy);
    $('explore-reply').disabled = busy || Boolean(variation.ending) || Boolean(promotion);
    $('explore-reply').textContent = busy ? 'Stockfish is thinking…' : variation.mode === 'engine' ? 'Retry engine reply' : 'Play engine reply';
    const viewingReport = !$('play-report').hidden;
    $('play-settings-summary').hidden = fromPosition || viewingReport;
    $('explore-origin').hidden = !fromPosition || viewingReport;
    const color = variation.color === 'w' ? 'White' : 'Black';
    $('play-settings-summary').textContent = testMode ? `Full-strength Stockfish · ${color}` : variation.mode === 'free' ? 'Free play · Both sides' : `Stockfish · ${PLAY_LEVELS[$('play-difficulty').value].label} · ${color}`;
    $('play-color-field').hidden = testMode || variation.mode === 'free';
    $('play-difficulty-field').hidden=testMode||variation.mode==='free';
    for (const id of ['play-mode','play-origin','play-show-evaluation']) $(id).closest('label').hidden = testMode;
    $('play-difficulty-description').textContent=PLAY_LEVELS[$('play-difficulty').value].description;
    $('play-export').disabled = !moves.length;
    const finishedMatch = !fromPosition && variation.mode === 'engine' && Boolean(variation.ending);
    for (const id of ['play-mode','play-color','play-difficulty','play-origin','play-show-evaluation']) $(id).disabled = testMode || finishedMatch && id !== 'play-show-evaluation';
    $('play-resign').hidden = fromPosition || variation.mode !== 'engine' || Boolean(variation.ending) || !variation.canUndo;
    $('play-new').hidden = testMode;
    const testMoves = testMode ? moves.filter(move => move.color === variation.color).length : 0;
    $('play-test-progress').hidden = !testMode || finishedMatch;
    const testMinimum = legacyTestDifficulty ? MIN_ASSESSMENT_MOVES : MIN_LEVEL_TEST_MOVES;
    $('play-test-count').textContent = testMoves < testMinimum ? `${testMoves} / ${testMinimum} of your moves` : `${testMoves} of your moves`;
    $('play-test-finish').hidden = testMoves < testMinimum;
    $('play-test-finish').disabled = !legacyTestDifficulty && (variation.engineTurn || Boolean(promotion));
    $('play-report-open').hidden = !assessment;
    $('play-level-test-link').hidden = testMode;
    $('explore-board').setAttribute('aria-label', `Play board, ${variation.ending || (chess.turn() === 'w' ? 'White' : 'Black') + ' to move'}. Select a piece and its destination.`);
    $('explore-promotion').hidden = !promotion;
    if (variation.ending) $('explore-feedback').textContent = !testMode && variation.canUndo ? 'Undo to try another idea, or start a new game.' : 'Start a new game when you’re ready.';
    if (focusSquare) $('explore-board').querySelector(`[data-square="${focusSquare}"]`)?.focus({ preventScroll: true });
  }
  async function evaluate({playReply=false}={}) {
    cancel({ keepIdleEngine:true }); result = null;
    if (variation.ending) {
      cancel();
      closeResignation();
      if (!variation.resignedColor) result = terminalEvaluation(variation.fen, { startFen:variation.startFen, moves:variation.moves.map(move=>move.lan) });
      assessGame();
      render();
      return;
    }
    const automaticReply = variation.engineTurn;
    if (!automaticReply && !evaluationEnabled() && !hintRequested && !playReply) { render(); return; }
    const current = run, snapshot = variation.snapshot(), active = engine || new Engine();
    engine = active; busy = true; render();
    const replyAt = automaticReply ? performance.now() + MIN_ENGINE_REPLY_MS : 0;
    let replied = false;
    try {
      const history = { startFen:variation.startFen, moves:variation.moves.map(move=>move.lan) };
      const search = automaticReply ? playSearch(testMode ? LEVEL_TEST_DIFFICULTY : $('play-difficulty').value) : { milliseconds:650, skill:20 };
      const score = await active.evaluate(snapshot.fen, search, history);
      // Let the player's move settle while Stockfish searches in the background.
      const remaining = replyAt - performance.now();
      if (remaining > 0) await new Promise(resolve => setTimeout(resolve, Math.ceil(remaining)));
      if (current !== run || !sessionVisible() || !variation?.matches(snapshot)) return;
      result = score;
      if (automaticReply || playReply) {
        const outcome = variation.engineMove(score.best, snapshot);
        if (outcome.status !== 'played') throw Error('Stockfish did not supply a legal move.');
        replied = true; selected = null; promotion = null; result = null;hintRequested=false;
        saveTestAttempt();
        $('explore-feedback').textContent = `Stockfish played ${outcome.move.san}.`;
        render();playSound(outcome.move,{completion:Boolean(variation.ending)});
      }
    } catch (error) {
      if (current === run) {
        active.destroy(); engine = null;
        const retry = testMode ? 'Select Retry engine reply. Your moves are kept.' : 'Use Retry engine reply or switch to Free play.';
        $('explore-feedback').textContent = `${error.message} ${variation.engineTurn ? retry : 'Move a piece or reset to try again.'}`;
      }
    } finally {
      if (current === run && sessionVisible()) { busy = false; render(); if (replied) evaluate(); }
    }
  }
  function afterMove(move) {
    selected = null; promotion = null;hintRequested=false;
    saveTestAttempt();
    $('explore-feedback').textContent = variation.engineTurn ? `${move.san} played. Stockfish is thinking…` : `${move.san} played.`;
    evaluate();playSound(move,{completion:Boolean(variation.ending)});
  }
  function attempt(from, to, piece) {
    const outcome = variation.play(from, to, piece);
    if (outcome.status === 'promotion') { promotion = { from, to }; render(); $('explore-promotion').querySelector('button').focus(); }
    else if (outcome.status === 'played') afterMove(outcome.move);
    else { $('explore-feedback').textContent = 'Choose a highlighted legal destination.'; render(from); }
  }
  function startPosition(restored = null) {
    cancel(); clearAssessment(); closeResignation();
    testScores = [];
    const fen = $('play-origin').value === 'current' ? originFen : new Chess().fen();
    variation = restored || new PlaySession(fen, { mode: $('play-mode').value, color: $('play-color').value });
    assisted = evaluationEnabled();
    flipped = variation.mode === 'engine' ? variation.color === 'b' : context().flipped;
    selected = null; promotion = null; result = null;hintRequested=false;
    $('explore-origin').textContent = coursePractice?.title || 'From your analysis position';
    $('explore-feedback').textContent = variation.engineTurn ? 'Stockfish is preparing the first move.' : 'Tap a piece, then a highlighted square to play.';
    saveTestAttempt();
    evaluate();
  }
  function open(fromGame, fenOverride = null, practice = null) {
    leaveLevelTest();
    coursePractice=practice;
    $('play-origin').querySelector('option[value="current"]').textContent=practice?'Course position':'Analysis position';
    const current = context(); savedGame = current.parsed; resumeReview = pause();
    originFen = fenOverride || current.parsed.fens[current.ply];
    $('play-origin').value = fromGame ? 'current' : 'new';
    $('play-mode').value = practice?'engine':fromGame ? 'free' : 'engine';
    $('play-color').value = practice?.color || (fromGame ? new Chess(originFen).turn() : 'w');
    surface.querySelector('.play-game-menu').open = false;
    dialog.showModal(); startPosition();
  }
  function startLevelTest(options) {
    if (testMode || dialog.open) return;
    const restored = options.moves ? restoreLevelTestAttempt(options) : null;
    if (options.moves && !restored) return;
    testMode = true;
    legacyTestDifficulty = options.difficulty !== LEVEL_TEST_DIFFICULTY && restored?.moves.some(move => move.color !== restored.color) ? options.difficulty : null;
    resumeReview = false;
    coursePractice = null;
    previousDifficulty = $('play-difficulty').value;
    $('play-origin').value = 'new';
    $('play-mode').value = 'engine';
    $('play-color').value = options.color;
    $('play-difficulty').value = LEVEL_TEST_DIFFICULTY;
    surface.dataset.levelTest = 'true';
    surface.querySelector('.play-game-menu').open = false;
    levelTestMount.append(surface);
    levelTestMount.hidden = false;
    $('level-test-intro').hidden = true;
    $('level-test-setup').hidden = true;
    startPosition(restored);
    if ($('play-report').hidden) { scrollToSessionStart(); focusBoard(); }
  }
  function leaveLevelTest({ focus = false } = {}) {
    if (!testMode) return;
    cancel();
    levelTestMount.hidden = true;
    testMode = false;
    legacyTestDifficulty = null;
    $('play-difficulty').value = previousDifficulty;
    previousDifficulty = null;
    delete surface.dataset.levelTest;
    dialog.prepend(surface);
    clearAssessment(); closeResignation(); variation = null;
    $('level-test-intro').hidden = false;
    $('level-test-setup').hidden = false;
    if (focus) onLevelTestDone();
  }
  $('level-test-exit').onclick = () => leaveLevelTest({ focus:true });
  $('try-move').onclick = () => open(true);
  $('play-open').onclick = () => open(false);
  $('explore-course-return').onclick=()=>dialog.close();
  enableBoardDrag($('explore-board'),{read:()=>({chess:variation?.chess,disabled:!variation||variation.engineTurn||Boolean(promotion)||Boolean(variation.ending)}),select:from=>{selected=from;render();},play:attempt});
  $('explore-board').onclick = event => {
    const button = event.target.closest('[data-square]'); if (!button || !variation || promotion || variation.ending) return;
    if (variation.engineTurn) {
      $('explore-feedback').textContent = busy ? 'Waiting for Stockfish’s move…' : testMode ? 'Select Retry engine reply to continue.' : 'Retry the engine reply or switch to Free play.';
      return;
    }
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
    if (!result?.best){evaluate({playReply:true});return;}
    const outcome = variation.engineMove(result.best, variation.snapshot());
    if (outcome.status === 'played') afterMove(outcome.move);
  };
  $('explore-undo').onclick = () => { const undone = variation.undoTurn(); if (!undone.length) return; clearAssessment(); closeResignation(); assisted=true; selected = null; promotion = null;hintRequested=false; $('explore-feedback').textContent = 'Back to your previous position. Try a different idea.'; evaluate(); };
  $('explore-reset').onclick = () => { variation.reset(); selected = null; promotion = null;hintRequested=false; $('explore-feedback').textContent = 'Back to the game position. Try another move.'; evaluate(); };
  $('explore-flip').onclick = () => { flipped = !flipped; render(); };
  $('play-origin').onchange = () => startPosition();
  for (const id of ['play-mode', 'play-color','play-difficulty']) $(id).onchange = () => {
    if (variation.moves.length) assisted = true;
    closeResignation();
    cancel(); variation.configure($('play-mode').value, $('play-color').value);
    selected = null; promotion = null; result = null;hintRequested=false;
    if (variation.mode === 'engine') flipped = variation.color === 'b';
    $('explore-feedback').textContent = variation.engineTurn ? 'Stockfish will play the next move.' : 'Settings updated. Choose your next move.';
    evaluate();
  };
  $('play-show-evaluation').onchange=()=>{if(evaluationEnabled()&&!variation.ending)assisted=true;evaluate();};
  $('play-hint').onclick=()=>{assisted=true;hintRequested=true;evaluate();};
  function newGame() {
    $('play-origin').value = 'new'; startPosition();
    surface.querySelector('.play-game-menu').open = false;
    scrollToSessionStart();
    focusBoard();
  }
  $('play-new').onclick = newGame;
  function closeResignation() {
    $('play-resign-confirmation').hidden = true;
    $('play-resign').setAttribute('aria-expanded', 'false');
    $('play-test-finish').setAttribute('aria-expanded', 'false');
    resignTrigger = null;
  }
  function showResignation(trigger) {
    resignTrigger = trigger;
    const checkingElo = trigger.id === 'play-test-finish' && !legacyTestDifficulty;
    $('play-resign-description').textContent = checkingElo ? 'Stockfish will check your moves. The match ends if there are enough eligible moves for an Elo estimate.' : 'Resigning ends the game as a loss.';
    $('play-resign-confirm').textContent = checkingElo ? 'Check Elo' : 'Confirm resignation';
    $('play-resign-confirmation').hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    $('play-resign-cancel').focus();
  }
  $('play-resign').onclick = event => showResignation(event.currentTarget);
  $('play-test-finish').onclick = event => showResignation(event.currentTarget);
  $('play-resign-cancel').onclick = () => { const trigger = resignTrigger; closeResignation(); trigger?.focus(); };
  $('play-resign-confirmation').addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    $('play-resign-cancel').click();
  });
  $('play-resign-confirm').onclick = () => {
    const checkingElo = resignTrigger?.id === 'play-test-finish' && !legacyTestDifficulty;
    closeResignation();
    if (checkingElo) { assessGame({ checkingElo:true }); return; }
    if (variation.resign()) { selected=null; promotion=null; hintRequested=false; saveTestAttempt(); evaluate(); }
  };
  $('play-report-open').onclick = () => setReportView(true);
  $('play-report-retry').onclick = () => { $('play-report-title').focus({ preventScroll: true }); runAssessment(); };
  $('play-report-again').onclick = () => {
    if (testMode) legacyTestDifficulty = null;
    else if (assessment.result?.recommended) $('play-difficulty').value = assessment.result.recommended;
    newGame();
  };
  $('play-report-back').onclick = () => {
    if (assessment?.checkingElo) { clearAssessment(); render(); }
    else setReportView(false);
    focusBoard();
  };
  $('play-report-done').onclick = () => leaveLevelTest({ focus:true });
  $('play-export').onclick = () => {
    if (!variation?.moves.length) return;
    const url = URL.createObjectURL(new Blob([variation.exportPgn()], {type:'application/x-chess-pgn'}));
    const link = document.createElement('a'); link.href = url; link.download = 'roqvyn-play.pgn'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  };
  dialog.addEventListener('close', () => {
    if (dialog.open || testMode) return;
    if (settings.open) settings.close();
    cancel(); clearAssessment(); variation = null;
    if (resumeReview && savedGame === context().parsed) resume();
    resumeReview = false;
  });
  return { reset, levelTest:startLevelTest, leaveLevelTest, practice: value=>open(true,value.fen,value), tryMove: (fen, uci) => {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci || '')) return;
    open(true, fen); $('explore-origin').textContent = 'Trying the coach’s idea · From before the selected move';
    attempt(uci.slice(0,2), uci.slice(2,4), uci[4]);
  } };
}
