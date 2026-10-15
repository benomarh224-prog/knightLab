import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess,validateFen} from 'chess.js';
import {BEGINNER_LESSONS} from '../src/beginner-lessons.js';
import {OpeningLesson} from '../src/opening-course.js';
import {createLessonCheck} from '../src/lesson-check.js';
import {parseGame} from '../src/game.js';

const find=id=>BEGINNER_LESSONS.find(lesson=>lesson.id===id);
const finish=lesson=>{const session=new OpeningLesson(lesson);session.practice({startPly:lesson.study.start});while(!session.completed){const move=session.expected;assert.equal(session.attempt(move.from,move.to,move.promotion).status,'correct');}return session;};

test('28 beginner lessons cover four units with complete teaching, concept checks and strictly legal exercises',()=>{
  assert.equal(BEGINNER_LESSONS.length,28);assert.equal(new Set(BEGINNER_LESSONS.map(lesson=>lesson.id)).size,28);
  const units=new Map();
  for(const lesson of BEGINNER_LESSONS){
    units.set(lesson.unit,(units.get(lesson.unit)||0)+1);
    if(lesson.fen)assert.equal(validateFen(lesson.fen).ok,true,lesson.id);
    const chess=new Chess(lesson.fen);for(const move of lesson.moves)chess.move(move,{strict:true});
    const session=new OpeningLesson(lesson);assert.equal(session.lesson.positions.at(-1),chess.fen());
    assert.equal(session.lesson.notes.length,lesson.moves.length);assert.ok(session.lesson.notes.every(note=>note.trim().length>10));
    assert.equal(lesson.guide.intro.length,2);assert.equal(lesson.guide.rules.length,3);
    assert.equal(new Set(lesson.quiz.options).size,3);assert.ok(Number.isInteger(lesson.quiz.answer)&&lesson.quiz.answer>=0&&lesson.quiz.answer<3);
    assert.ok(lesson.quiz.explanation.length>25);assert.ok(lesson.source&&lesson.takeaway);
    session.practice({startPly:lesson.study.start});assert.equal(session.cursor,lesson.study.start);assert.equal(new Chess(session.fen).turn(),'w');
  }
  assert.deepEqual([...units.values()],[10,6,6,6]);
});

test('every beginner exercise finishes, resets and exports its actual played position to analysis',()=>{
  for(const lesson of BEGINNER_LESSONS){
    const session=finish(lesson);assert.equal(session.completed,true);assert.ok(session.correct>0);
    assert.equal(parseGame(session.pgn()).fens.at(-1),session.fen,lesson.id);
    session.practice({startPly:lesson.study.start});assert.equal(session.completed,false);assert.equal(session.correct,0);
    assert.equal(session.fen,session.lesson.positions[lesson.study.start]);
  }
});

test('completion requires both understanding and board practice, in either order, while older courses remain supported',()=>{
  for(const lesson of BEGINNER_LESSONS){
    const check=createLessonCheck(lesson.quiz);assert.equal(check.required,true);assert.equal(check.canContinue(false),false);
    check.answer((lesson.quiz.answer+1)%3);assert.equal(check.passed,false);assert.equal(check.canContinue(true),false);assert.match(check.feedback,/Not quite/);
    const selected=check.selected;check.answer(-1);check.answer(3);check.answer(1.5);assert.equal(check.selected,selected);
    check.answer(lesson.quiz.answer);assert.equal(check.passed,true);assert.match(check.feedback,/Correct/);
    assert.equal(check.canContinue(false),false);assert.equal(check.canContinue(true),true);
    check.answer((lesson.quiz.answer+1)%3);assert.equal(check.passed,true);
    assert.equal(createLessonCheck(lesson.quiz).canContinue(false,true),true);
  }
  const oldCourse=createLessonCheck();assert.equal(oldCourse.required,false);assert.equal(oldCourse.passed,true);assert.equal(oldCourse.canContinue(true),true);assert.equal(oldCourse.canContinue(false),false);
});

test('special-move exercises preserve castling rights, require promotion choice and perform a genuine en passant capture',()=>{
  for(const [id,king,rook] of [['castle-kingside','g1','f1'],['castle-queenside','c1','d1']]){
    const chess=new Chess(finish(find(id)).fen);assert.equal(chess.get(king).type,'k');assert.equal(chess.get(rook).type,'r');
  }
  const promotion=new OpeningLesson(find('promote-a-pawn'));promotion.practice();const before=promotion.fen;
  assert.equal(promotion.attempt('e7','e8').status,'illegal');assert.equal(promotion.attempt('e7','e8','n').status,'different');assert.equal(promotion.fen,before);
  assert.equal(promotion.attempt('e7','e8','q').completed,true);
  const ep=new OpeningLesson(find('en-passant'));ep.practice();assert.equal(ep.expected.isEnPassant(),true);
  ep.attempt('e5','d6');const chess=new Chess(ep.fen);assert.equal(chess.get('d5'),undefined);assert.equal(chess.get('d6').color,'w');
});

test('the mate/stalemate comparison, knight fork and absolute pin explain the actual board facts',()=>{
  const draw=new Chess(find('avoid-stalemate').fen);draw.move('Qf7');assert.equal(draw.isStalemate(),true);
  assert.equal(new Chess(finish(find('avoid-stalemate')).fen).isCheckmate(),true);
  for(const id of ['deliver-checkmate','simple-rook-mate','capablanca-rook-finish','beginner-checkpoint'])assert.equal(new Chess(finish(find(id)).fen).isCheckmate(),true,id);
  const fork=new Chess(find('knight-fork').fen);fork.move('Nc7+');assert.equal(fork.isCheck(),true);assert.ok(fork.attackers('a8','w').includes('c7'));
  const pin=new Chess(finish(find('pin-a-piece')).fen);assert.equal(pin.moves({square:'c6'}).length,0);
  const blocker=new Chess(find('friendly-blockers').fen);assert.throws(()=>blocker.move('Rxa5'));assert.doesNotThrow(()=>blocker.move('Rc1'));
});

test('the credited breakthrough actually clears the a-pawn’s route and the book rook demonstration ends in mate',()=>{
  const breakthrough=finish(find('create-a-passed-pawn')),chess=new Chess(breakthrough.fen);
  assert.equal(chess.get('a6').color,'w');for(const square of ['a7','a8','b7','b8'])assert.equal(chess.get(square),undefined);
  assert.match(breakthrough.lesson.source,/Example 24/);
  const rook=finish(find('capablanca-rook-finish'));assert.equal(rook.correct,4);assert.match(rook.lesson.source,/Example 1/);assert.equal(new Chess(rook.fen).isCheckmate(),true);
});
