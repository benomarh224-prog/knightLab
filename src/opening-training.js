import { Chess } from 'chess.js';
import { createCourseProgress, OpeningLesson } from './opening-course.js';
import { lessonPlan } from './lesson-player.js';

export const OPENING_TEST_SIZE = 5;

// Ignore the move counters. Side to move, castling, and en passant all matter.
const positionKey = fen => fen.split(' ', 4).join(' ');
const moveKey = move => `${move.from}${move.to}${move.promotion || ''}`;
const lessonKey = entry => `${entry.courseId}/${entry.lessonId}`;

export function openingPracticeLink(entry) {
  const query = new URLSearchParams({lesson: entry.lessonId, review: 'practice', exercise: entry.activityIndex});
  return `${entry.path}?${query}`;
}

export function createOpeningTraining(courses) {
  const openingCourses = Object.values(courses).filter(course => course.category === 'openings');
  const gameMatches = new WeakMap();
  let bank;

  function positions() {
    if (bank) return bank;
    const starts = new Map();
    const decisions = [];
    for (const course of openingCourses) {
      for (const lesson of course.lessons) {
        const study = course.study?.(lesson.id);
        const plan = lessonPlan(lesson, study);
        for (const [activityIndex, activity] of plan.activities.entries()) {
          if (activity.kind !== 'practice') continue;
          const session = new OpeningLesson(activity);
          session.practice({startPly: activity.startPly});
          const line = session.lesson;
          for (let ply = session.cursor; ply < line.verboseMoves.length; ply++) {
            const move = line.verboseMoves[ply];
            if (move.color !== line.practiceColor) continue;
            const entry = {
              courseId: course.id, courseTitle: course.title, path: course.path,
              lessonId: lesson.id, title: study?.title || lesson.title, activityIndex,
              fen: line.positions[ply], move, note: line.notes[ply], studyPly: ply
            };
            decisions.push(entry);
            if (ply === session.cursor) {
              const key = positionKey(entry.fen);
              if (!starts.has(key)) starts.set(key, entry);
            }
          }
        }
      }
    }
    bank = {starts, decisions};
    return bank;
  }

  return {
    review(parsed, ply) {
      if (!parsed?.fens) return null;
      if (!gameMatches.has(parsed)) {
        const {starts} = positions();
        const matches = new Map();
        let best = null;
        for (let at = 2; at < parsed.fens.length; at++) {
          const entry = starts.get(positionKey(parsed.fens[at]));
          if (!entry) continue;
          const match = {...entry, ply: at};
          matches.set(at, match);
          if (!best || match.studyPly > best.studyPly) best = match;
        }
        gameMatches.set(parsed, {matches, best});
      }
      const {matches, best} = gameMatches.get(parsed);
      return matches.get(ply) || best;
    },
    completedPositions(storage) {
      const completed = new Map(openingCourses.map(course => {
        const ids = course.lessons.map(lesson => lesson.id);
        return [course.id, new Set(createCourseProgress(storage, ids, course.key).read())];
      }));
      const questions = new Map();
      for (const entry of positions().decisions) {
        // The opening test uses one tap or drag per answer, so omit promotion decisions.
        if (entry.move.promotion || !completed.get(entry.courseId).has(entry.lessonId)) continue;
        const key = positionKey(entry.fen);
        if (!questions.has(key)) questions.set(key, {fen: entry.fen, answers: []});
        const question = questions.get(key);
        if (!question.answers.some(answer => moveKey(answer.move) === moveKey(entry.move))) question.answers.push(entry);
      }
      return [...questions.values()];
    }
  };
}

export function pickOpeningTest(questions, random = Math.random) {
  if (questions.length < OPENING_TEST_SIZE) return [];
  const pool = [...questions];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = [];
  const repeated = [];
  const lessons = new Set();
  for (const question of pool) {
    const key = lessonKey(question.answers[0]);
    if (lessons.has(key)) repeated.push(question);
    else {
      chosen.push(question);
      lessons.add(key);
    }
  }
  return [...chosen, ...repeated].slice(0, OPENING_TEST_SIZE);
}

export class OpeningTestSession {
  constructor(rounds) {
    this.rounds = rounds;
    this.index = 0;
    this.results = [];
  }

  get question() { return this.rounds[this.index]; }
  get result() { return this.results[this.index]; }
  get complete() { return this.index === this.rounds.length; }

  attempt(from, to, promotion) {
    if (!this.question || this.result) return null;
    const board = new Chess(this.question.fen);
    let move;
    try { move = board.move({from, to, promotion}); }
    catch { return null; }
    const expected = this.question.answers.find(entry => moveKey(entry.move) === moveKey(move));
    const result = {move, matched: Boolean(expected), study: expected || this.question.answers[0]};
    this.results.push(result);
    return result;
  }

  next() { if (this.result) this.index++; }
}
