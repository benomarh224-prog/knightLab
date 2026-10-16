import { Chess } from 'chess.js';
import { pieceSvg } from './pieces.js';
import { collectTraining, PracticeSession, moveLabel, pieceNames } from './training.js';

const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

export function createTrainingUI({ context, navigate, pause, resume, scrollToBoard, icon, playSound = () => {} }) {
  let data = { moments: [], exercises: [] }, session = null, savedContext = null, resumeReview = false;
  let previousEvaluations = null, previousCount = -1,previousColor=null;
  const dialog = $('practice-dialog');

  function reset() {
    resumeReview = false; session = null; previousEvaluations = null; previousCount = -1;
    data = { moments: [], exercises: [] };
    if (dialog.open) dialog.close();
  }

  function render() {
    const { parsed, evaluations, color, running } = context();
    const count = evaluations.filter(Boolean).length;
    const practiceColor=$('practice-side').value==='both'?null:$('practice-side').value;
    if (evaluations !== previousEvaluations || count !== previousCount||practiceColor!==previousColor) {
      previousEvaluations = evaluations; previousCount = count;previousColor=practiceColor;
      data = collectTraining(parsed, evaluations, practiceColor);
      $('moments-list').innerHTML = data.moments.length ? data.moments.map(event => {
        const owner = color ? event.move.color === color ? 'You' : 'Opponent' : event.move.color === 'w' ? 'White' : 'Black';
        const mate = event.before.mate != null || event.after.mate != null;
        const detail = event.move.san.endsWith('#') ? 'The move that delivers checkmate' : event.rating.label === 'Great' ? 'A standout engine choice' : mate ? 'A change in the forced-mate evaluation' : `${(event.rating.loss / 100).toFixed(2)} pawns lost in evaluation`;
        return `<button class="moment-item" data-moment="${event.ply}"><span class="moment-number">${escape(moveLabel(event.move))}</span><span class="moment-copy"><strong>${owner} · ${event.rating.label}</strong><small>${detail}</small></span><span class="moment-arrow">${icon('arrow')}</span></button>`;
      }).join('') : `<p class="training-empty">${count < 2 ? 'Review the game to find its turning points.' : 'No major evaluation swings or standout moves in the reviewed positions.'}</p>`;
      const exercises = data.exercises.length;
      $('start-practice').disabled = !exercises;
      $('start-practice').innerHTML = `${exercises ? `Practice ${exercises} position${exercises === 1 ? '' : 's'}` : count < parsed.fens.length ? 'Waiting for reviewed mistakes' : 'No mistakes to practice'} ${icon('arrow')}`;
      $('practice-description').textContent = exercises ? `${practiceColor==='w'?'White’s mistakes':practiceColor==='b'?'Black’s mistakes':'Mistakes from both players'}, turned into positions to solve.${count<parsed.fens.length?' Provisional: review is incomplete.':''} The answer stays hidden until you try or reveal it.` : count === parsed.fens.length ? 'No reviewed inaccuracies, mistakes, or blunders with a valid engine alternative were found for this side.' : 'Positions appear as the engine reviews inaccuracies, mistakes, and blunders.';
    }
    $('moments-status').textContent = running ? 'Updating as you review' : count === parsed.fens.length ? `${data.moments.length} moments found` : count ? 'From reviewed positions' : 'Awaiting review';
    document.querySelectorAll('[data-moment]').forEach(button => {
      const current = Number(button.dataset.moment) === context().ply;
      button.classList.toggle('selected', current); button.setAttribute('aria-current', current ? 'step' : 'false');
    });
  }

  function start(exercises=data.exercises) {
    const tasks=Array.isArray(exercises)?exercises:data.exercises;
    if (!tasks.length) return;
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
      const answer = session.status !== 'playing' && [exercise.solution.slice(0,2), exercise.solution.slice(2,4)].includes(square);
      const label = `${square}${piece ? `, ${piece.color === 'w' ? 'White' : 'Black'} ${pieceNames[piece.type]}` : ', empty'}${selected ? ', selected' : ''}${targets.has(square) ? ', legal destination' : ''}`;
      squares += `<button class="square practice-square${dark ? ' dark' : ''}${selected ? ' piece-selected' : ''}${targets.has(square) ? ' legal-target' : ''}${hintSquare === square ? ' hint-square' : ''}${answer ? ' answer-square' : ''}" data-square="${square}" tabindex="${square === tabSquare ? 0 : -1}" aria-label="${escape(label)}" aria-pressed="${selected}">${f === 0 ? `<span class="rank" aria-hidden="true">${ranks[r]}</span>` : ''}${r === 7 ? `<span class="file" aria-hidden="true">${files[f]}</span>` : ''}${piece ? pieceSvg(piece) : ''}</button>`;
    }
    $('practice-board').innerHTML = squares;
    $('practice-board').setAttribute('aria-label', `Practice position, ${exercise.color === 'w' ? 'White' : 'Black'} to move. Select a piece and its destination.`);
    $('practice-dialog-title').textContent = 'Find a better move';
    $('practice-counter').textContent = `Position ${session.index + 1} of ${session.exercises.length}`;
    $('practice-turn').textContent = `${exercise.color === 'w' ? 'White' : 'Black'} to move · Move ${exercise.moveNumber}`;
    $('practice-feedback').textContent = session.feedback || 'Choose a piece, then tap a highlighted destination.';
    $('practice-feedback').classList.toggle('success', session.status === 'correct');
    $('practice-promotion').hidden = !session.promotion;
    $('practice-answer').hidden = session.status === 'playing';
    if (session.status !== 'playing') $('practice-answer').innerHTML = `<strong>Engine’s choice: ${escape(exercise.bestSAN)}</strong><p>In the game, ${escape(exercise.played)} was rated ${exercise.label.toLowerCase()}.${exercise.mateSwing ? ' The engine found a change in the forced-mate evaluation.' : ` Its estimated evaluation loss was ${(exercise.loss / 100).toFixed(2)} pawns.`}</p>`;
    else $('practice-answer').replaceChildren();
    $('practice-hint').hidden = session.status !== 'playing';
    $('practice-reveal').hidden = session.status !== 'playing';
    $('practice-next').hidden = session.status === 'playing';
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
    if (['correct', 'retry'].includes(result.status)) playSound(chess.move({ from, to, promotion }));
    if (result.status === 'correct') { session.feedback = 'Correct! You found Stockfish’s first choice.'; session.selected = null; }
    else if (result.status === 'retry') { session.feedback = `${result.san} is legal, but it is not Stockfish’s first choice. Try another move.`; session.selected = null; }
    else session.feedback = 'That move is not legal. Choose a highlighted destination.';
    renderPractice(to);
  }

  $('moments-list').onclick = event => {
    const button = event.target.closest('[data-moment]'); if (!button) return;
    navigate(Number(button.dataset.moment)); scrollToBoard();
  };
  $('start-practice').onclick = start;
  $('practice-side').onchange=()=>render();
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
  $('practice-hint').onclick = () => {
    if (!session || session.status !== 'playing') return;
    session.hint = true; const piece = new Chess(session.exercise.fen).get(session.exercise.solution.slice(0,2));
    session.feedback = `Look for a move with the highlighted ${pieceNames[piece.type]}.`; renderPractice();
  };
  $('practice-reveal').onclick = () => {
    if (!session || session.status !== 'playing') return;
    const chess = new Chess(session.exercise.fen), solution = session.exercise.solution;
    session.reveal(); playSound(chess.move({ from: solution.slice(0,2), to: solution.slice(2,4), promotion: solution[4] }));
    session.feedback = 'Solution revealed. Study the move, then try the next position.'; renderPractice(); $('practice-next').focus();
  };
  $('practice-next').onclick = () => { if (!session) return; session.next(); renderPractice(); if (!session.finished) $('practice-board').querySelector('[tabindex="0"]').focus(); };
  $('practice-again').onclick = () => { session = new PracticeSession(session.exercises); renderPractice(); $('practice-board').querySelector('[tabindex="0"]').focus(); };
  $('practice-back').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { if (resumeReview && savedContext === context().parsed) resume(); resumeReview = false; session = null; });
  return { render, reset,startExercises:start };
}
