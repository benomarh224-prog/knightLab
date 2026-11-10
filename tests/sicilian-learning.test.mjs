import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {COURSES} from '../src/courses.js';
import {LessonPlayer} from '../src/lesson-player.js';
import {lessonContinuation} from '../src/lesson-navigation.js';
import {renderOpeningCatalog} from '../src/opening-catalog.js';
import {pageFromPath,PAGE_VIEWS} from '../src/routes.js';
import {accountKey} from '../src/account-policy.js';

const course=COURSES.sicilian;

function position(id,plies) {
  const lesson=course.lessons.find(item=>item.id===id);
  const board=new Chess();
  for(const san of lesson.moves.slice(0,plies ?? lesson.moves.length))board.move(san,{strict:true});
  return board;
}

test('every Sicilian line is legal and the player restores the exercise and quiz after reload',()=>{
  assert.equal(course.lessons.length,32);
  assert.equal(new Set(course.lessons.map(lesson=>lesson.id)).size,course.lessons.length);
  const startPositions=new Set();
  const saved=new Map();
  const storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
  storage.setItem(COURSES.french.key,'["advance"]');
  const make=lesson=>new LessonPlayer({lesson,study:course.study(lesson.id),storage,
    progressKey:course.key,lessonIds:course.lessons.map(item=>item.id),courseId:course.id});

  for(const lesson of course.lessons){
    assert.deepEqual(lesson.moves.slice(0,2),['e4','c5'],lesson.id);
    const end=position(lesson.id);
    let player=make(lesson);
    assert.equal(new Chess(player.session.fen).turn(),'w',lesson.id);
    assert.equal(player.session.cursor,lesson.study.start,lesson.id);
    assert.equal(player.session.lesson.notes.length,lesson.moves.length,lesson.id);
    assert.ok(accountKey(player.storageKey));
    player.setStage('try');
    assert.equal(lessonContinuation(player).enabled,false);
    const start=player.session.fen;
    const positionKey=start.split(' ').slice(0,4).join(' ');
    assert.ok(!startPositions.has(positionKey),`Duplicate exercise position: ${lesson.id}`);
    startPositions.add(positionKey);
    assert.equal(player.requestHint().level,1);
    assert.equal(player.session.fen,start);
    const first=player.session.expected;
    player.attempt(first.from,first.to,first.promotion);
    player=make(lesson);
    assert.equal(player.session.correct,1);
    while(player.session.expected){
      const move=player.session.expected;
      player.attempt(move.from,move.to,move.promotion);
    }
    assert.equal(player.session.fen,end.fen());
    assert.equal(player.boardComplete,true);
    assert.equal(player.complete,false);
    player.setStage('check');
    player.answer((player.question.answer+1)%3);
    assert.equal(player.complete,false);
    player.answer(player.question.answer);
    assert.equal(make(lesson).complete,true);
  }
  assert.deepEqual(JSON.parse(storage.getItem(course.key)),course.lessons.map(lesson=>lesson.id));
  assert.equal(storage.getItem(COURSES.french.key),'["advance"]');
});

test('Taimanov knight choice, Maróczy square control and Dragon castling match the board',()=>{
  const queen=position('sicilian-taimanov-queen-tempo',12);
  assert.ok(queen.moves().includes('Ncb5'));
  queen.move('Ndb5',{strict:true});
  assert.ok(queen.attackers('c7','w').includes('b5'));
  assert.ok(queen.attackers('e4','w').includes('c3'));

  const bind=position('sicilian-accelerated-dragon',9);
  for(const square of ['c4','e4'])assert.ok(bind.attackers('d5','w').includes(square));
  assert.equal(bind.get('c3'),undefined);

  const dragon=position('sicilian-dragon');
  assert.deepEqual(dragon.get('c1'),{type:'k',color:'w'});
  assert.deepEqual(dragon.get('g8'),{type:'k',color:'b'});
});

test('Sicilian appears in Openings with its own routable and syncable course',()=>{
  assert.equal(course.category,'openings');
  assert.equal(pageFromPath('/learn/sicilian-defense/?lesson=sicilian-dragon'),'sicilian');
  assert.equal(PAGE_VIEWS.sicilian,'french');
  assert.ok(accountKey(course.key));
  const catalog={},names={},doc={getElementById:()=>catalog,
    querySelectorAll:selector=>selector==='[data-opening-course-names]'?[names]:[]};
  renderOpeningCatalog(COURSES,doc);
  assert.match(catalog.innerHTML,/href="\/learn\/sicilian-defense\/" data-route="sicilian"/);
  assert.match(catalog.innerHTML,/sicilian-defense\.webp/);
  assert.ok(catalog.innerHTML.includes(`0 of ${course.lessons.length} lessons completed`));
  assert.match(names.textContent,/Sicilian Defense/);
});
