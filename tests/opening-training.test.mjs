import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { COURSES } from '../src/courses.js';
import { parseGame } from '../src/game.js';
import { LessonPlayer } from '../src/lesson-player.js';
import { pageFromPath } from '../src/routes.js';
import { createOpeningTraining, OpeningTestSession, openingPracticeLink, pickOpeningTest } from '../src/opening-training.js';

const training = createOpeningTraining(COURSES);
const sicilian = COURSES.sicilian;

test('a transposed Najdorf game links to the actual …d5 practice position', () => {
  const game = parseGame('1. e4 c5 2. Nc3 d6 3. Nf3 Nf6 4. d4 cxd4 5. Nxd4 a6 6. h3 e6 7. g4 d5 8. exd5 Nxd5 *');
  const match = training.review(game, 16);
  assert.equal(match.lessonId, 'sicilian-najdorf-central-break');
  assert.equal(match.ply, 14);
  assert.equal(training.review(game, 12).lessonId, 'sicilian-najdorf-e6');
  const url = new URL(openingPracticeLink(match), 'https://roqvyn.example');
  assert.equal(pageFromPath(url.pathname), 'sicilian');
  assert.equal(url.searchParams.get('lesson'), match.lessonId);
  assert.equal(url.searchParams.get('review'), 'practice');
  const lesson = sicilian.lessons.find(item => item.id === match.lessonId);
  const player = new LessonPlayer({lesson, study: sicilian.study(lesson.id), courseId: 'sicilian'});
  player.startChallenge(Number(url.searchParams.get('exercise')));
  const position = fen => fen.split(' ', 4).join(' ');
  assert.equal(position(player.session.fen), position(game.fens[match.ply]));
  assert.equal(player.session.expected.san, 'exd5');
});

test('opening labels and similar boards do not produce a match without the same legal position', () => {
  const game = parseGame('[Opening "Sicilian Defense"]\n\n1. d4 d5 2. c4 e6 *');
  assert.equal(training.review(game, 4), null);
  const sicilianGame = parseGame('1. e4 c5 2. Nf3 d6 *');
  assert.equal(training.review(sicilianGame, 4).lessonId, 'sicilian-open-center');
  const fields = sicilianGame.fens[4].split(' ');
  fields[2] = 'KQ';
  const missingCastling = {...sicilianGame, fens: [...sicilianGame.fens.slice(0, 4), fields.join(' ')]};
  assert.equal(training.review(missingCastling, 4), null);
});

function completed() {
  const ids = ['sicilian-open-center', 'sicilian-adams-attack', 'sicilian-dragon', 'sicilian-najdorf-central-break'];
  const storage = {getItem: key => key === sicilian.key ? JSON.stringify(ids) : null};
  return {ids, questions: training.completedPositions(storage)};
}

test('mixed tests draw five distinct positions only from completed opening lessons', () => {
  assert.deepEqual(training.completedPositions({getItem: () => null}), []);
  assert.deepEqual(pickOpeningTest([]), []);
  const {ids, questions} = completed();
  assert.ok(questions.every(q => q.answers.every(answer => ids.includes(answer.lessonId))));
  const picks = pickOpeningTest(questions, () => 0.25);
  assert.equal(picks.length, 5);
  assert.equal(new Set(picks.map(q => q.fen.split(' ', 4).join(' '))).size, 5);
  assert.equal(new Set(picks.map(q => q.answers[0].lessonId)).size, ids.length);
  assert.equal(pageFromPath('/train/opening-test/'), 'openingtest');
});

test('only the first legal answer counts, and a legal alternative gets the study move', () => {
  const {questions} = completed();
  const rounds = pickOpeningTest(questions, () => 0.5);
  const testRun = new OpeningTestSession(rounds);
  assert.equal(testRun.attempt('a1', 'a1'), null);
  testRun.next();
  assert.equal(testRun.index, 0);
  const {fen, answers} = testRun.question;
  const alternative = new Chess(fen).moves({verbose: true}).find(move => !answers.some(answer => answer.move.san === move.san));
  const result = testRun.attempt(alternative.from, alternative.to);
  assert.equal(result.matched, false);
  assert.equal(result.study.move.san, answers[0].move.san);
  assert.equal(testRun.attempt(answers[0].move.from, answers[0].move.to), null);
  testRun.next();
  while (!testRun.complete) {
    const {move} = testRun.question.answers[0];
    assert.equal(testRun.attempt(move.from, move.to).matched, true);
    testRun.next();
  }
  assert.equal(testRun.results.length, 5);
  assert.equal(testRun.results.filter(item => item.matched).length, 4);
});
