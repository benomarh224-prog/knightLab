import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { COURSES } from '../src/courses.js';
import { LessonPlayer } from '../src/lesson-player.js';
import { LessonExploration } from '../src/lesson-exploration.js';

const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),values};};
const create=(course,lesson,storage=memory())=>new LessonPlayer({lesson,study:course.study?.(lesson.id),storage,progressKey:course.key,lessonIds:course.lessons.map(l=>l.id)});
function solve(player){while(player.session.expected){const move=player.session.expected;player.attempt(move.from,move.to,move.promotion);}}

test('every current lesson allows legal free play after solving without changing exercise progress or quiz requirements',()=>{
  let count=0;
  for(const course of Object.values(COURSES))for(const lesson of course.lessons){
    const storage=memory(),player=create(course,lesson,storage);solve(player);
    const fen=player.session.fen,correct=player.session.correct,complete=player.complete;
    assert.equal(player.startExploring(),true,lesson.id);assert.equal(player.exploration.fen,fen);
    if(player.exploration.ending){assert.equal(player.undo(),true);}
    const move=player.exploration.chess.moves({verbose:true})[0];assert.ok(move,lesson.id);
    assert.equal(player.exploreMove(move.from,move.to,move.promotion).status,'played');
    assert.equal(player.session.fen,fen);assert.equal(player.session.correct,correct);assert.equal(player.complete,complete);
    const restored=create(course,lesson,storage);assert.equal(restored.exploring,true);assert.equal(restored.exploration.fen,player.exploration.fen);assert.equal(restored.session.fen,fen);
    player.stopExploring();assert.equal(player.session.fen,fen);assert.equal(player.complete,complete);count++;
  }
  assert.equal(count,190);
});
test('exploration before solving cannot earn completion, change hint/retry counts or advance a study move',()=>{
  const course=COURSES.opengames,player=create(course,course.lessons[0]);
  const original=player.session.fen;player.startExploring();
  const move=player.session.expected;assert.equal(player.attempt(move.from,move.to,move.promotion).status,'inactive');
  assert.equal(player.exploreMove(move.from,move.to,move.promotion).status,'played');
  assert.equal(player.exploreMove('a1','a8').status,'illegal');
  assert.equal(player.boardComplete,false);assert.equal(player.complete,false);assert.equal(player.setStage('check'),false);
  assert.equal(player.session.correct,0);assert.equal(player.session.hints,0);assert.equal(player.activity.mistakes,0);assert.equal(player.session.fen,original);
  player.stopExploring();assert.equal(player.attempt(move.from,move.to,move.promotion).status,'correct');
});
test('both colors play, undo/reset/reload work, and stage changes retain an independent branch',()=>{
  const course=COURSES.opengames,lesson=course.lessons[0],storage=memory();let player=create(course,lesson,storage);
  player.startExploring();const anchor=player.exploration.fen;
  assert.equal(player.exploreMove('g1','f3').status,'played');assert.equal(player.exploreMove('b8','c6').status,'played');
  const branch=player.exploration.fen;player.setStage('learn');player=create(course,lesson,storage);player.setStage('try');assert.equal(player.exploration.fen,branch);
  player.undo();assert.equal(player.exploration.chess.turn(),'b');player.reset();assert.equal(player.exploration.fen,anchor);
  player.stopExploring();assert.equal(player.session.fen,anchor);
});
test('mate exploration permits undoing the finishing move; study positions with insufficient material remain explorable',()=>{
  const course=COURSES.beginners,player=create(course,course.lessons.find(l=>l.id==='beginner-checkpoint'));
  solve(player);player.startExploring();assert.equal(player.exploration.ending,'Checkmate');assert.equal(player.exploreMove('a8','b8').status,'finished');
  player.undo();assert.equal(player.exploreMove('h1','g1').status,'played');player.stopExploring();assert.equal(new Chess(player.session.fen).isCheckmate(),true);
  const knight=create(course,course.lessons.find(l=>l.id==='knight-jumps'));knight.startExploring();
  assert.equal(knight.exploration.ending,null);const move=knight.exploration.chess.moves({verbose:true})[0];assert.equal(knight.exploreMove(move.from,move.to,move.promotion).status,'played');
});
test('castling, explicit underpromotion, en passant and their undo preserve all legal state',()=>{
  const course=COURSES.beginners;
  for(const [id,from,to,promotion] of [['castle-kingside','e1','g1'],['en-passant','e5','d6'],['promote-a-pawn','e7','e8','n']]){
    const player=create(course,course.lessons.find(l=>l.id===id));player.startExploring();const before=player.exploration.fen;
    if(promotion)assert.equal(player.exploreMove(from,to).status,'promotion');
    assert.equal(player.exploreMove(from,to,promotion).status,'played');player.undo();assert.equal(player.exploration.fen,before);
  }
});
test('invalid saved branches are ignored while original v1 progress remains intact',()=>{
  const course=COURSES.beginners,lesson=course.lessons[0],storage=memory(),player=create(course,lesson,storage);solve(player);player.answer(lesson.quiz.answer);player.startExploring();
  const saved=JSON.parse(storage.getItem(player.storageKey));saved.activities[0].exploration.moves=['e2e5'];storage.setItem(player.storageKey,JSON.stringify(saved));
  const restored=create(course,lesson,storage);assert.equal(restored.exploring,false);assert.equal(restored.complete,true);assert.equal(restored.session.fen,player.session.fen);
  assert.equal(LessonExploration.restore(player.session,{anchorCursor:-1,moves:[]}),null);
});
test('structured demonstrations and multiple exercises inherit exploration; reading-only lessons do not invent a board',()=>{
  const lesson={id:'multi',title:'Several boards',concepts:['Review'],activities:[{kind:'demonstration',moves:['e4'],completion:'acknowledge'},{kind:'practice',moves:['d4','d5']} ]};
  const course={key:'structured',lessons:[lesson]},player=create(course,lesson);player.startExploring();player.exploreMove('e2','e4');assert.equal(player.boardComplete,false);
  player.selectActivity(1);assert.equal(player.exploring,false);player.startExploring();player.exploreMove('d2','d4');player.selectActivity(0);player.startExploring();assert.equal(player.exploration.last.san,'e4');
  const text={id:'read',concepts:['Reading']},reader=create({key:'read',lessons:[text]},text);assert.equal(reader.startExploring(),false);
});
