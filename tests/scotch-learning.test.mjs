import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {SCOTCH_LESSONS} from '../src/scotch-lessons.js';
import {COURSES} from '../src/courses.js';
import {PAGE_PATHS,PAGE_VIEWS,pageFromPath} from '../src/routes.js';
import {LessonPlayer} from '../src/lesson-player.js';
import {lessonContinuation} from '../src/lesson-navigation.js';
import {renderOpeningCatalog} from '../src/opening-catalog.js';
const course=COURSES.scotch;
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
const make=(lesson,store=storage())=>new LessonPlayer({lesson,study:course.study(lesson.id),storage:store,progressKey:course.key,lessonIds:course.lessons.map(l=>l.id),courseId:course.id});
const position=(id,end)=>{const l=SCOTCH_LESSONS.find(l=>l.id===id),c=new Chess();for(const san of l.moves.slice(0,end))c.move(san,{strict:true});return c;};

test('all ten Scotch lessons are legal, begin on White’s decision, and have complete teaching content',()=>{
 assert.equal(SCOTCH_LESSONS.length,10);assert.equal(new Set(SCOTCH_LESSONS.map(l=>l.id)).size,10);
 for(const lesson of SCOTCH_LESSONS){
  const chess=new Chess();for(const san of lesson.moves)chess.move(san,{strict:true});
  assert.deepEqual(lesson.moves.slice(0,7),['e4','e5','Nf3','Nc6','d4','exd4','Bc4']);
  const player=make(lesson);assert.equal(new Chess(player.session.fen).turn(),'w');assert.ok(player.session.expected);
  assert.deepEqual(player.plan.stages,['learn','try','check']);assert.equal(player.session.lesson.notes.length,lesson.moves.length);
  assert.ok(player.session.lesson.notes.every(note=>note.length>15));assert.equal(lesson.guide.intro.length,2);
  assert.ok(lesson.quiz.options[lesson.quiz.answer]);assert.match(lesson.source,/David Regis.*printed/);
 }
});

test('each Scotch lesson keeps its exercise and quiz requirements through hints, retries, and reload',()=>{
 for(const lesson of SCOTCH_LESSONS){
  const store=storage();let p=make(lesson,store);p.setStage('try');
  assert.equal(lessonContinuation(p).enabled,false);const original=p.session.fen;
  const hint=p.requestHint();assert.equal(hint.level,1);assert.equal(p.session.fen,original);
  let n=0;while(p.session.expected){const move=p.session.expected;p.attempt(move.from,move.to,move.promotion);n++;if(n===1)p=make(lesson,store);}
  assert.equal(p.boardComplete,true);assert.equal(p.complete,false);assert.equal(lessonContinuation(p).action,'question');
  p.setStage('check');p.answer((p.question.answer+1)%3);assert.equal(p.complete,false);p.answer(p.question.answer);
  assert.equal(p.complete,true);assert.equal(make(lesson,store).complete,true);
  p.reset();assert.equal(p.complete,true);
 }
});

test('the forcing line really attacks the king and bishop, and the early check really permits the studied castle',()=>{
 const fork=position('scotch-check-and-recover',13);assert.equal(fork.isCheck(),true);
 assert.ok(fork.attackers('f7','w').includes('d5'));assert.ok(fork.attackers('c5','w').includes('d5'));
 const check=position('scotch-bishop-check',8);assert.equal(check.isCheck(),true);check.move('c3');check.move('dxc3');
 assert.equal(check.isCheck(),false);assert.ok(check.moves().includes('O-O'));
 const queen=position('scotch-gambit-declined',13);assert.ok(!queen.attackers('f7','w').includes('b3'));assert.ok(queen.attackers('c4','w').includes('b3'));
});

test('the historical finish is mate, and the Two Knights warning has a real mating reply',()=>{
 const mate=position('scotch-forcing-finish');assert.equal(mate.isCheckmate(),true);
 const before=position('scotch-forcing-finish',28);before.move('Nf6#');assert.ok(!before.moves().includes('Nxf6'));
 const trap=position('scotch-two-knights',18);for(const san of ['Nxd4','Nxd4','Qxd4','Qxe1#'])trap.move(san,{strict:true});
 assert.equal(trap.isCheckmate(),true);
 const rook=position('scotch-castle-and-rook');assert.equal(rook.get('e7').type,'b');assert.ok(rook.moves({square:'e4'}).length>0);
});

test('the Scotch course is routable under Openings and its completion never overwrites another course',()=>{
 assert.equal(course.category,'openings');assert.equal(PAGE_PATHS.scotch,'/learn/scotch-gambit/');assert.equal(PAGE_VIEWS.scotch,'french');assert.equal(pageFromPath(course.path),'scotch');
 const store=storage();store.setItem(COURSES.french.key,JSON.stringify(['advance']));const p=make(course.lessons[0],store);p.setStage('try');
 while(p.session.expected){const m=p.session.expected;p.attempt(m.from,m.to,m.promotion);}p.answer(p.question.answer);
 assert.deepEqual(JSON.parse(store.getItem(course.key)),['scotch-first-moves']);assert.deepEqual(JSON.parse(store.getItem(COURSES.french.key)),['advance']);
});

test('the opening catalog exposes Scotch and counts registered openings rather than a fixed pair',()=>{
 const root={},counter={},names={},doc={getElementById:()=>root,querySelectorAll:selector=>selector.includes('data-learn-filter')?[counter]:[names]};
 renderOpeningCatalog(COURSES,doc);assert.match(root.innerHTML,/href="\/learn\/scotch-gambit\/"/);assert.match(root.innerHTML,/Scotch Gambit/);assert.match(root.innerHTML,/10 lessons/);
 assert.equal(counter.textContent,'3');assert.match(names.textContent,/French Defense · Italian Game · Scotch Gambit/);
});
