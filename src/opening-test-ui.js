import { Chess } from 'chess.js';
import { enableBoardDrag, finishBoard } from './board-surface.js';
import { pieceSvg } from './pieces.js';
import { squareGrid, squareNeighbor } from './square-practice.js';
import { OPENING_TEST_SIZE, OpeningTestSession, pickOpeningTest } from './opening-training.js';

const pieceNames = {p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'};
const sideName = color => color === 'w' ? 'White' : 'Black';

export function createOpeningTestUI({training, storage, playSound = () => {}}) {
  const $ = id => document.getElementById(`opening-test-${id}`);
  const board = $('board');
  let session = null;
  let active = false;
  let selected = null;
  let chess = null;
  let soundId = 0;

  function tile(square) { return board.querySelector(`[data-square="${square}"]`); }
  function focusBoard() { board.querySelector('[tabindex="0"]')?.focus({preventScroll: true}); }

  function renderBoard(focusSquare) {
    const {question, result} = session;
    chess = new Chess(result?.study.move.after || question.fen);
    const color = question.fen.split(' ')[1];
    const squares = squareGrid(color);
    const tabbable = focusSquare || selected || squares[56];
    const targets = new Set(selected ? chess.moves({square: selected, verbose: true}).map(move => move.to) : []);
    board.setAttribute('aria-label', result ? `Position after ${result.study.move.san}` : `${sideName(color)} to move`);
    board.innerHTML = squares.map((square, index) => {
      const piece = chess.get(square);
      const label = `${square}, ${piece ? `${sideName(piece.color)} ${pieceNames[piece.type]}` : 'empty'}`;
      const classes = ['square'];
      if ((square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 1) classes.push('dark');
      if (square === selected) classes.push('piece-selected');
      if (targets.has(square)) classes.push('legal-target');
      if (result && [result.study.move.from, result.study.move.to].includes(square)) classes.push('last');
      const rank = index % 8 === 0 ? `<span class="rank" aria-hidden="true">${square[1]}</span>` : '';
      const file = index >= 56 ? `<span class="file" aria-hidden="true">${square[0]}</span>` : '';
      return `<button type="button" class="${classes.join(' ')}" data-square="${square}" aria-label="${label}" tabindex="${!result && square === tabbable ? 0 : -1}" ${result ? 'disabled' : ''}>${rank}${file}${piece ? pieceSvg(piece) : ''}</button>`;
    }).join('');
    finishBoard(board, chess, selected);
    if (focusSquare && !result) tile(focusSquare)?.focus({preventScroll: true});
  }

  function lessonLink(anchor, study) {
    anchor.href = `${study.path}?${new URLSearchParams({lesson: study.lessonId})}`;
    anchor.textContent = `${study.courseTitle} · ${study.title}`;
    anchor.dataset.route = study.courseId;
  }

  function render() {
    const question = session?.question;
    $('intro').hidden = Boolean(session);
    $('workspace').hidden = !question;
    $('summary').hidden = !session?.complete;
    if (!session) {
      const count = training.completedPositions(storage).length;
      $('ready').textContent = count >= OPENING_TEST_SIZE
        ? `${count} positions available from your completed lessons.`
        : `${count} of ${OPENING_TEST_SIZE} positions unlocked. Complete more opening lessons to start.`;
      $('start').disabled = count < OPENING_TEST_SIZE;
      $('learn').hidden = count >= OPENING_TEST_SIZE;
    } else if (question) {
      const result = session.result;
      $('round').textContent = `Position ${session.index + 1} of ${OPENING_TEST_SIZE}`;
      $('prompt').textContent = `${sideName(question.fen.split(' ')[1])} to move`;
      $('answer').hidden = !result;
      $('message').textContent = '';
      if (result) {
        $('verdict').textContent = result.matched ? 'Matched the study line.' : 'Different from the study line.';
        $('move').textContent = result.matched ? `Study move: ${result.move.san}` : `You played ${result.move.san}. The board shows the study move ${result.study.move.san}.`;
        $('note').textContent = result.study.note;
        lessonLink($('lesson'), result.study);
        $('next').textContent = session.index === OPENING_TEST_SIZE - 1 ? 'See results' : 'Next position';
      } else {
        $('lesson').textContent = '';
        $('lesson').removeAttribute('href');
        delete $('lesson').dataset.route;
        $('move').textContent = '';
        $('note').textContent = '';
      }
      renderBoard();
    } else {
      const matched = session.results.filter(result => result.matched).length;
      $('score').textContent = `${matched} of ${OPENING_TEST_SIZE} matched the study lines`;
      $('results').replaceChildren(...session.results.map((result, index) => {
        const row = document.createElement('li');
        const detail = document.createElement('p');
        detail.textContent = `Position ${index + 1} · ${result.matched ? 'Matched' : `Played ${result.move.san}, study move ${result.study.move.san}`}`;
        const link = document.createElement('a');
        lessonLink(link, result.study);
        row.append(detail, link);
        return row;
      }));
    }
  }

  function start() {
    const rounds = pickOpeningTest(training.completedPositions(storage));
    if (!rounds.length) { session = null; render(); return; }
    session = new OpeningTestSession(rounds);
    selected = null;
    render();
    focusBoard();
  }

  function play(from, to) {
    if (!active || !session?.question || session.result) return;
    const result = session.attempt(from, to);
    if (!result) {
      $('message').textContent = 'That move is not legal here. Try another square.';
      tile(to)?.focus({preventScroll: true});
      return;
    }
    selected = null;
    render();
    playSound(result.study.move, {eventId: `opening-test-${++soundId}`});
    $('next').focus();
  }

  function select(square) {
    selected = selected === square ? null : square;
    $('message').textContent = '';
    renderBoard(square);
  }

  board.addEventListener('click', event => {
    const square = event.target.closest('[data-square]')?.dataset.square;
    if (!square || !active || !session?.question || session.result) return;
    if (chess.get(square)?.color === chess.turn()) select(square);
    else if (selected) play(selected, square);
  });
  board.addEventListener('keydown', event => {
    if (!active || !session?.question || session.result || !event.key.startsWith('Arrow')) return;
    event.preventDefault();
    const next = squareNeighbor(event.target.dataset.square, event.key, chess.turn());
    if (!next) return;
    for (const button of board.querySelectorAll('button')) button.tabIndex = button.dataset.square === next ? 0 : -1;
    tile(next).focus({preventScroll: true});
  });
  enableBoardDrag(board, {
    read: () => ({chess, disabled: !active || !session?.question || Boolean(session.result)}),
    select: square => { selected = square; renderBoard(); },
    play
  });

  $('start').onclick = start;
  $('restart').onclick = start;
  $('next').onclick = () => {
    session.next();
    selected = null;
    render();
    if (session.complete) $('score').focus({preventScroll: true});
    else focusBoard();
  };
  return {
    setActive(value) {
      active = value;
      if (!value) return;
      render();
      $('title').focus({preventScroll: true});
    }
  };
}
