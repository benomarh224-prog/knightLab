import { Chess } from 'chess.js';
import { classifyMove, uciToSan } from './game.js';

export const pieceNames = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export function moveLabel(move) { return `${move.before.split(' ')[5]}${move.color === 'w' ? '.' : '...'} ${move.san}`; }

export function collectTraining(parsed, evaluations, color = null) {
  const events = parsed.moves.flatMap((move, index) => {
    const rating = classifyMove(move, evaluations[index], evaluations[index + 1]);
    if (!rating) return [];
    return [{ ply: index + 1, move, rating, before: evaluations[index], after: evaluations[index + 1] }];
  });
  const swings = events.filter(event => ['Inaccuracy', 'Mistake', 'Blunder'].includes(event.rating.label)).sort((a, b) => b.rating.loss - a.rating.loss || a.ply - b.ply);
  const standouts = events.filter(event => event.rating.label === 'Great' || event.move.san.endsWith('#'))
    .sort((a, b) => Number(b.move.san.endsWith('#')) - Number(a.move.san.endsWith('#')) || a.ply - b.ply);
  const moments = [...swings, ...standouts].filter((event, index, all) => all.findIndex(item => item.ply === event.ply) === index)
    .slice(0, 3).sort((a, b) => a.ply - b.ply);
  const exercises = swings.filter(event => (!color || event.move.color === color) && !event.before.terminal)
    .flatMap(event => {
      const solution = event.before.best;
      const bestSAN = uciToSan(event.move.before, solution);
      if (bestSAN === '—' || solution === event.move.from + event.move.to + (event.move.promotion || '')) return [];
      return [{ fen: event.move.before, solution, bestSAN, played: event.move.san, label: event.rating.label,
        loss: event.rating.loss, color: event.move.color, ply: event.ply, moveNumber: event.move.before.split(' ')[5],
        mateSwing: event.before.mate != null || event.after.mate != null }];
    });
  return { moments, exercises };
}

export class PracticeSession {
  constructor(exercises) {
    if (!exercises.length) throw new Error('No reviewed mistakes to practice yet.');
    this.exercises = exercises.map(exercise => ({ ...exercise }));
    this.index = 0; this.solved = 0; this.revealed = 0; this.attempts = 0; this.finished = false;
    this.reset();
  }
  get exercise() { return this.exercises[this.index]; }
  reset() { this.status = 'playing'; this.selected = null; this.hint = false; this.promotion = null; this.answerFen = null; this.feedback = ''; }
  submit(from, to, promotion) {
    if (this.status !== 'playing' || this.finished) return { status: 'locked' };
    const chess = new Chess(this.exercise.fen);
    const candidates = chess.moves({ square: from, verbose: true }).filter(move => move.to === to);
    if (!candidates.length) return { status: 'illegal' };
    if (candidates.some(move => move.promotion) && !promotion) return { status: 'promotion', choices: candidates.map(move => move.promotion) };
    let move;
    try { move = chess.move({ from, to, promotion }); } catch { return { status: 'illegal' }; }
    this.attempts++;
    if (move.from + move.to + (move.promotion || '') !== this.exercise.solution) return { status: 'retry', san: move.san };
    this.status = 'correct'; this.solved++; this.answerFen = chess.fen();
    return { status: 'correct', san: move.san };
  }
  reveal() {
    if (this.status !== 'playing' || this.finished) return;
    const chess = new Chess(this.exercise.fen), solution = this.exercise.solution;
    chess.move({ from: solution.slice(0, 2), to: solution.slice(2, 4), promotion: solution[4] });
    this.status = 'revealed'; this.revealed++; this.answerFen = chess.fen(); this.promotion = null;
  }
  next() {
    if (this.status === 'playing' || this.finished) return false;
    if (this.index + 1 === this.exercises.length) { this.finished = true; return false; }
    this.index++; this.reset(); return true;
  }
}
