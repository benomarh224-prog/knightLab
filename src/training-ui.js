import {animatePieces,moveTransitions} from './piece-motion.js';
import {finishBoard,enableBoardDrag} from './board-surface.js';
import { Chess } from 'chess.js';
import { pieceSvg } from './pieces.js';
import { collectTraining, PracticeSession, moveLabel, pieceNames } from './training.js';
import { practiceTheme, relatedPractice } from './practice-themes.js';
import { evaluationReady } from './review-quality.js';

const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

export function createTrainingUI({ context, navigate, pause, resume, scrollToBoard, icon, playSound = () => {},feedbackSound=()=>{}, onExerciseSolved=()=>{}, onExerciseHelp=()=>{} }) {
  let painted=null;
  let data = { moments: [], exercises: [] }, session = null, savedContext = null, resumeReview = false;
  let previousEvaluations = null, previousColor = null, previousMode = null;
  let practiceOptions={};
  let related = null, initialExercises = [];
  const dialog = $('practice-dialog');

  function reset() {
    resumeReview = false; session = null; previousEvaluations = null;
    data = { moments: [], exercises: [] };
    if (dialog.open) dialog.close();
  }

  function render() {
    const { parsed, evaluations, color, running, mode, ply } = context();
    const count = evaluations.filter(Boolean).length;
    const complete = parsed.fens.every((_, index) => evaluationReady(evaluations[index], mode));
    const provisional = mode === 'quick' || !complete;
    const practiceColor=$('practice-side').value==='both'?null:$('practice-side').value;
    const evidenceChanged = !previousEvaluations || evaluations.length !== previousEvaluations.length ||
      evaluations.some((score, index) => score !== previousEvaluations[index]);
    if (evidenceChanged || practiceColor !== previousColor || mode !== previousMode) {
      previousEvaluations = evaluations.slice();
      previousColor = practiceColor;
      previousMode = mode;
      data = collectTraining(parsed, evaluations, practiceColor);
      $('moments-list').innerHTML = data.moments.length ? data.moments.map(event => {
        const owner = color ? event.move.color === color ? 'You' : 'Opponent' : event.move.color === 'w' ? 'White' : 'Black';
        const mate = event.before.mate != null || event.after.mate != null;
        const detail = event.move.san.endsWith('#') ? 'The move that delivers checkmate' : event.rating.label === 'Brilliant' ? 'An engine-supported piece sacrifice' : event.rating.label === 'Great' ? 'A standout engine choice' : mate ? 'A change in the forced-mate evaluation' : `${(event.rating.loss / 100).toFixed(2)} pawns lost in evaluation`;
        return `<button class="moment-item" data-moment="${event.ply}"><span class="moment-number">${escape(moveLabel(event.move))}</span><span class="moment-copy"><strong>${owner} · ${event.rating.label}</strong><small>${detail}</small></span><span class="moment-arrow">${icon('arrow')}</span></button>`;
      }).join('') : `<p class="training-empty">${count < 2 ? 'Review the game to find its turning points.' : 'No major evaluation swings or standout moves in the reviewed positions.'}</p>`;
      const exercises = data.exercises.length;
      $('start-practice-focus').hidden = !exercises;
      $('start-practice-focus').textContent = provisional ? 'Practice biggest mistake found' : 'Practice biggest mistake';
      $('start-practice').disabled = !exercises;
      $('start-practice').hidden = exercises === 1;
      $('start-practice').innerHTML = `${exercises ? `Practice all ${exercises}` : !complete ? 'Waiting for reviewed mistakes' : 'No mistakes to practice'} ${icon('arrow')}`;
      $('practice-description').textContent = exercises
        ? (provisional ? 'From the positions reviewed so far. Results are provisional.' : 'Try a better move in a position from this game.')
        : (complete ? provisional?'No confirmed mistakes in the fast preview. Deepen the review for more evidence.':'No reviewed mistakes with a valid alternative were found for this side.' : 'Positions appear as the engine reviews the game.');
    }
    $('moments-status').textContent = running ? 'Updating as you review' : count === parsed.fens.length ? `${data.moments.length} moments found` : count ? 'From reviewed positions' : 'Awaiting review';
    document.querySelectorAll('[data-moment]').forEach(button => {
      const current = Number(button.dataset.moment) === ply;
      button.classList.toggle('selected', current); button.setAttribute('aria-current', current ? 'step' : 'false');
    });
  }

  function start(exercises=data.exercises,options={}) {
    const tasks=Array.isArray(exercises)?exercises:data.exercises;
    if (!tasks.length) return;
    practiceOptions=options;
    initialExercises=tasks;
    related=null;
    dialog.toggleAttribute('data-level-moment', Boolean(tasks[0].reviewNote));
    $('practice-back').textContent = options.backLabel || 'Back to analysis';
    session = new PracticeSession(tasks);
    savedContext = context().parsed;
    resumeReview = pause();
    renderPractice(); dialog.showModal();
  }

  function renderPractice(focusSquare = null) {
    if (!session) return;
    $('practice-play').hidden = session.finished;
    $('practice-complete').hidden = !session.finished;
    if (session.finished) {
      $('practice-dialog-title').textContent = 'Your practice results';
      $('practice-complete-summary').textContent = `${session.solved} of ${session.exercises.length} solved · ${session.revealed} solution${session.revealed === 1 ? '' : 's'} revealed · ${session.attempts} move attempt${session.attempts === 1 ? '' : 's'}. Keep revisiting these positions to build the habit.`;
      $('practice-again').focus({ preventScroll: true }); return;
    }
    const exercise = session.exercise;
    const chess = new Chess(session.answerFen || exercise.fen);
    const flipped = exercise.color === 'b';
    const files = flipped ? 'hgfedcba' : 'abcdefgh', ranks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
    const targets = session.selected && session.status === 'playing' ? new Set(chess.moves({ square: session.selected, verbose: true }).map(move => move.to)) : new Set();
    const hintSquare = session.hint && session.status === 'playing' ? exercise.solution.slice(0, 2) : null;
    // Only one square is in the tab order; arrow keys move around the grid.
    const tabSquare = focusSquare || session.selected || files[0] + ranks[7];
    let squares = '';
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const square = files[f] + ranks[r], piece = chess.get(square);
      const dark = (files.charCodeAt(f) - 97 + ranks[r]) % 2 === 1;
      const selected = square === session.selected;
      const answer = session.answerMove && [session.answerMove.from, session.answerMove.to].includes(square);
      const label = `${square}${piece ? `, ${piece.color === 'w' ? 'White' : 'Black'} ${pieceNames[piece.type]}` : ', empty'}${selected ? ', selected' : ''}${targets.has(square) ? ', legal destination' : ''}`;
      squares += `<button class="square practice-square${dark ? ' dark' : ''}${selected ? ' piece-selected' : ''}${targets.has(square) ? ' legal-target' : ''}${hintSquare === square ? ' hint-square' : ''}${answer ? ' answer-square' : ''}" data-square="${square}" tabindex="${square === tabSquare ? 0 : -1}" aria-label="${escape(label)}" aria-pressed="${selected}">${f === 0 ? `<span class="rank" aria-hidden="true">${ranks[r]}</span>` : ''}${r === 7 ? `<span class="file" aria-hidden="true">${files[f]}</span>` : ''}${piece ? pieceSvg(piece) : ''}</button>`;
    }
    $('practice-board').innerHTML = squares;finishBoard($('practice-board'),chess,session.selected);
    const position={game:session.exercise,fen:chess.fen(),last:session.answerMove,flipped};
    animatePieces($('practice-board'),moveTransitions(painted,position));painted=position;
    $('practice-board').setAttribute('aria-label', `Practice position, ${exercise.color === 'w' ? 'White' : 'Black'} to move. Select a piece and its destination.`);
    const followup = exercise.source === 'followup';
    $('practice-dialog-title').textContent = followup ? exercise.title : 'Find a better move';
    dialog.querySelector('.practice-instructions').textContent = followup ? exercise.prompt : 'Find Stockfish’s first choice. Tap a piece, then its destination.';
    $('practice-counter').textContent = `Position ${session.index + 1} of ${session.exercises.length}`;
    $('practice-turn').textContent = `${exercise.color === 'w' ? 'White' : 'Black'} to move · Move ${exercise.moveNumber}`;
    $('practice-feedback').textContent = session.feedback || 'Choose a piece, then tap a highlighted destination.';
    $('practice-feedback').classList.toggle('success', session.status === 'correct');
    $('practice-promotion').hidden = !session.promotion;
    $('practice-answer').hidden = session.status === 'playing';
    if (session.status === 'playing') $('practice-answer').replaceChildren();
    else if (exercise.reviewNote) $('practice-answer').innerHTML = `<strong>${followup?'Solution':'Engine’s choice'}: ${escape(session.answerMove.san)}</strong><p>${escape(exercise.reviewNote)}</p>`;
    else $('practice-answer').innerHTML = `<strong>Engine’s choice: ${escape(exercise.bestSAN)}</strong><p>In the game, ${escape(exercise.played)} was rated ${exercise.label.toLowerCase()}.${exercise.mateSwing ? ' The engine found a change in the forced-mate evaluation.' : ` Its estimated evaluation loss was ${(exercise.loss / 100).toFixed(2)} pawns.`}</p>`;
    $('practice-hint').hidden = session.status !== 'playing';
    $('practice-reveal').hidden = session.status !== 'playing';
    $('practice-next').hidden = session.status === 'playing';
    if (session.status === 'correct' && !followup && !related) related=relatedPractice(practiceTheme(exercise.fen,exercise.solution),exercise.fen);
    $('practice-related').hidden = !related || session.status !== 'correct' || followup;
    $('practice-hint').disabled = session.hint;
    $('practice-next').innerHTML = `${session.index + 1 === session.exercises.length ? 'See results' : 'Next position'} ${icon('arrow')}`;
    if (focusSquare) $('practice-board').querySelector(`[data-square="${focusSquare}"]`)?.focus({ preventScroll: true });
  }

  function attempt(from, to, promotion) {
    const chess = new Chess(session.exercise.fen);
    const result = session.submit(from, to, promotion);
    if (result.status === 'promotion') {
      session.promotion = { from, to }; session.feedback = 'Choose which piece your pawn promotes to.';
      renderPractice(); $('practice-promotion').querySelector('button').focus(); return;
    }
    session.promotion = null;
    const accepted=result.status==='correct'?chess.move({from,to,promotion}):null;
    const followup = session.exercise.source === 'followup';
    if (result.status === 'correct') {
      session.feedback = followup ? 'Correct! You found the idea in this position.' : 'Correct! You found Stockfish’s first choice.';
      session.selected = null;
      const outcome = {hints:Number(session.hint),alternatives:Math.max(0,session.currentAttempts-1),known:true};
      onExerciseSolved(session.exercise,outcome);
      if (!followup) practiceOptions.onSolved?.(session.exercise,outcome);
    }
    else if (result.status === 'retry') { session.feedback = followup ? `${result.san} is legal. Look for a move that fits the goal.` : `${result.san} is legal, but it is not Stockfish’s first choice. Try another move.`; session.selected = null; markHelp(); }
    else session.feedback = 'That move is not legal. Choose a highlighted destination.';
    renderPractice(to);if(accepted)playSound(accepted);else if(['retry','illegal'].includes(result.status))feedbackSound('incorrect');
  }

  $('moments-list').onclick = event => {
    const button = event.target.closest('[data-moment]'); if (!button) return;
    navigate(Number(button.dataset.moment)); scrollToBoard();
  };
  $('start-practice').onclick = () => start();
  $('start-practice-focus').onclick = () => start(data.exercises.slice(0, 1));
  $('practice-side').onchange=()=>render();
  enableBoardDrag($('practice-board'),{read:()=>({chess:session?new Chess(session.exercise.fen):null,disabled:!session||session.status!=='playing'||Boolean(session.promotion)}),select:from=>{session.selected=from;renderPractice();},play:attempt});
  $('practice-board').onclick = event => {
    const button = event.target.closest('[data-square]');
    if (!button || !session || session.status !== 'playing' || session.promotion) return;
    const square = button.dataset.square, chess = new Chess(session.exercise.fen), piece = chess.get(square);
    if (session.selected === square) { session.selected = null; session.feedback = ''; renderPractice(square); }
    else if (piece?.color === session.exercise.color) { session.selected = square; session.feedback = `Choose a destination for your ${pieceNames[piece.type]}.`; renderPractice(square); }
    else if (session.selected) attempt(session.selected, square);
    else { session.feedback = `Choose a ${session.exercise.color === 'w' ? 'White' : 'Black'} piece first.`; renderPractice(square); }
  };
  $('practice-board').onkeydown = event => {
    const shifts = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 };
    if (!(event.key in shifts)) return;
    const buttons = [...$('practice-board').querySelectorAll('[data-square]')], index = buttons.indexOf(event.target);
    if (index < 0) return;
    event.preventDefault();
    const next = index + shifts[event.key];
    if (next < 0 || next > 63 || Math.abs(shifts[event.key]) === 1 && Math.floor(index / 8) !== Math.floor(next / 8)) return;
    buttons.forEach((button, position) => button.tabIndex = position === next ? 0 : -1); buttons[next].focus();
  };
  document.querySelectorAll('[data-promotion]').forEach(button => button.onclick = () => {
    if (session?.promotion) attempt(session.promotion.from, session.promotion.to, button.dataset.promotion);
  });
  function markHelp() {
    onExerciseHelp(session.exercise);
    if(session.exercise.source!=='followup')practiceOptions.onHelp?.(session.exercise);
  }
  $('practice-hint').onclick = () => {
    if (!session || session.status !== 'playing') return;
    session.hint = true; const piece = new Chess(session.exercise.fen).get(session.exercise.solution.slice(0,2));
    markHelp();
    session.feedback = `Look for a move with the highlighted ${pieceNames[piece.type]}.`; renderPractice();
  };
  $('practice-reveal').onclick = () => {
    if (!session || session.status !== 'playing') return;
    const chess = new Chess(session.exercise.fen), solution = session.exercise.solution;
    session.reveal();const accepted=chess.move({from:solution.slice(0,2),to:solution.slice(2,4),promotion:solution[4]});
    markHelp();
    session.feedback = 'Solution revealed. Study the move, then try the next position.'; renderPractice();playSound(accepted);$('practice-next').focus();
  };
  function next() {
    related=null;
    session.next();
    renderPractice();
    if(session.finished)feedbackSound('complete');
    else $('practice-board').querySelector('[tabindex="0"]').focus();
  }
  $('practice-next').onclick = () => { if (session) next(); };
  $('practice-related').onclick = () => {
    if (!session || !related || session.status !== 'correct') return;
    session.exercises.splice(session.index+1,0,related);
    next();
  };
  $('practice-again').onclick = () => { related=null; session = new PracticeSession(initialExercises); renderPractice(); $('practice-board').querySelector('[tabindex="0"]').focus(); };
  $('practice-back').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { if (resumeReview && savedContext === context().parsed) resume(); resumeReview = false; session = null;const callback=practiceOptions.onClose;practiceOptions={};callback?.(); });
  return { render, reset,startExercises:start };
}
