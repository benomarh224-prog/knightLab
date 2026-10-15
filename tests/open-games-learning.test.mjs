import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {OPEN_GAMES_LESSONS} from '../src/open-games-lessons.js';
import {OpeningLesson,createCourseProgress} from '../src/opening-course.js';
import {COURSES} from '../src/courses.js';
import {parseGame} from '../src/game.js';

test('all ten excerpt lessons have strictly legal lines and start on the advertised player’s decision',()=>{
  assert.equal(OPEN_GAMES_LESSONS.length,10);
  assert.equal(new Set(OPEN_GAMES_LESSONS.map(lesson=>lesson.id)).size,10);
  for(const lesson of OPEN_GAMES_LESSONS){
    const chess=new Chess(),session=new OpeningLesson(lesson);
    for(const san of lesson.moves)chess.move(san,{strict:true});
    assert.deepEqual(lesson.moves.slice(0,2),['e4','e5']);
    assert.equal(session.lesson.positions.at(-1),chess.fen());
    assert.equal(session.lesson.notes.length,lesson.moves.length);
    assert.ok(session.lesson.notes.every(note=>typeof note==='string'&&note.trim().length>10));
    session.practice({startPly:lesson.study.start});
    assert.equal(session.cursor,lesson.study.start);
    assert.equal(new Chess(session.fen).turn(),lesson.practiceColor);
    assert.equal(lesson.study.goals.length,2);
    assert.match(lesson.source,/John Emms.*printed/);
  }
});

test('focused Open Games lessons finish with automatic replies and export the full preceding opening',()=>{
  const colors=new Set();
  for(const lesson of OPEN_GAMES_LESSONS){
    const session=new OpeningLesson(lesson);session.practice({startPly:lesson.study.start});colors.add(lesson.practiceColor);
    const startingFen=session.fen;let solved=0;
    while(!session.completed){
      const move=session.expected;assert.equal(move.color,lesson.practiceColor);
      assert.equal(session.attempt(move.from,move.to,move.promotion).status,'correct');solved++;
    }
    assert.equal(session.correct,solved);assert.ok(solved>0);
    const replay=new Chess();replay.loadPgn(session.pgn());
    assert.equal(replay.fen(),session.fen);
    assert.match(replay.getHeaders().Event,/Italian Game/);
    assert.equal(parseGame(session.pgn()).fens.at(-1),session.fen);
    session.practice({startPly:lesson.study.start});assert.equal(session.fen,startingFen);
    assert.equal(session.correct,0);assert.equal(session.completed,false);
  }
  assert.deepEqual([...colors].sort(),['b','w']);
});

test('the published bishop-knight finish is mate and the final pin exercise really uncovers check',()=>{
  const mate=new OpeningLesson(OPEN_GAMES_LESSONS.find(lesson=>lesson.id==='bishop-knight-mate'));
  mate.practice({startPly:mate.lesson.study.start});
  const forcedReply=new Chess(mate.fen);forcedReply.move('Nf3+');
  assert.deepEqual(forcedReply.moves(),['Kf1']);
  assert.equal(mate.expected.san,'Nf3+');mate.attempt('d4','f3');
  assert.equal(mate.last.san,'Kf1');assert.equal(mate.expected.san,'Bh3#');
  mate.attempt('g4','h3');assert.equal(new Chess(mate.fen).isCheckmate(),true);
  const deflection=new OpeningLesson(OPEN_GAMES_LESSONS.find(lesson=>lesson.id==='deflect-the-blocker'));
  deflection.jump(deflection.lesson.moves.length);const chess=new Chess(deflection.fen);
  assert.equal(chess.isCheck(),true);assert.equal(chess.get('g8').type,'r');
  assert.equal(chess.get('f3').type,'b');assert.equal(chess.get('d1').type,'q');
  assert.ok(chess.attackers('d1','b').includes('f3'));
});

test('a legal alternative preserves the focused exercise and all courses keep independent progress',()=>{
  const session=new OpeningLesson(OPEN_GAMES_LESSONS[0]);session.practice({startPly:2});const before=session.fen;
  assert.equal(session.attempt('b1','c3').status,'different');assert.equal(session.fen,before);
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  for(const course of Object.values(COURSES))createCourseProgress(storage,course.lessons.map(lesson=>lesson.id),course.key).complete(course.lessons[0].id);
  assert.equal(values.size,Object.keys(COURSES).length);
  for(const course of Object.values(COURSES))assert.deepEqual(createCourseProgress(storage,course.lessons.map(lesson=>lesson.id),course.key).read(),[course.lessons[0].id]);
});
