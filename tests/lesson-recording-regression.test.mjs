import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {COURSES} from '../src/courses.js';
import {LessonPlayer} from '../src/lesson-player.js';
import {lessonContinuation} from '../src/lesson-navigation.js';
import {exploreBeforeCheckmate} from '../src/lesson-checkmate.js';
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
const make=(course,lesson,storage=memory())=>new LessonPlayer({lesson,study:course.study?.(lesson.id),storage,progressKey:course.key,lessonIds:course.lessons.map(l=>l.id)});
function solve(p){p.setStage('try');while(p.session.expected){const m=p.session.expected;p.attempt(m.from,m.to,m.promotion);}}
function san(p,text){const move=new Chess(p.exploration.fen).move(text);assert.equal(p.exploreMove(move.from,move.to,move.promotion).status,'played');}

test('recording regression: Explore never jumps from Ke5 to the cached 12.a7+ position',()=>{
 const c=COURSES.beginners,l=c.lessons.find(l=>l.id==='take-opposition'),storage=memory();let p=make(c,l,storage);solve(p);
 const original=p.session.fen,correct=p.session.correct;
 p.startExploring();
 for(const move of ['Kd7','Kd5','Kc7','Kc5','Kb7','Kb5','Kc7','Kc5','Kb8','Kb6','Kc8','Ka5','Kb8','Kb6','Kc8','a4','Kb8','a5','Kc8','a6','Kb8','a7+'])san(p,move);
 const old=p.exploration.fen;assert.equal(p.exploration.last.san,'a7+');assert.equal(p.exploration.last.before.split(' ')[5],'12');
 assert.equal(p.exploration.chess.get('b8').type,'k');assert.equal(p.exploration.chess.get('b6').color,'w');
 p.stopExploring();p=make(c,l,storage); // A returning visitor, exactly as in the recording.
 for(let i=0;i<4;i++){
  p.startExploring({fresh:true});assert.equal(p.exploration.fen,original);assert.equal(p.exploration.last.san,'Ke5');
  p.stopExploring();assert.equal(p.session.fen,original);assert.equal(p.session.correct,correct);assert.equal(p.resumableExploration.fen,old);
  assert.equal(lessonContinuation(p).action,'question');
 }
 p=make(c,l,storage);assert.equal(p.resumeExploration(),true);assert.equal(p.exploration.fen,old);
 p.stopExploring();p.setStage('check');p.answer(p.question.answer);assert.equal(p.complete,true);
});

test('every lesson starts fresh on the displayed board while an explicit resume preserves the previous line',()=>{
 let count=0;
 for(const c of Object.values(COURSES))for(const l of c.lessons){
  const storage=memory(),p=make(c,l,storage);p.setStage('try');const anchor=p.session.fen;
  p.startExploring();const move=p.exploration.legal()[0];assert.ok(move,l.id);p.exploreMove(move.from,move.to,move.promotion);
  const branch=p.exploration.fen;p.stopExploring();p.startExploring({fresh:true});assert.equal(p.exploration.fen,anchor,l.id);
  p.stopExploring();const restored=make(c,l,storage);assert.equal(restored.resumeExploration(),true,l.id);assert.equal(restored.exploration.fen,branch,l.id);
  assert.equal(restored.session.fen,anchor);assert.equal(restored.boardComplete,false);count++;
 }
 assert.equal(count,Object.values(COURSES).reduce((total,course)=>total+course.lessons.length,0));
});

test('clicking a completed board can start fresh, play the selected piece, and return without a position jump',()=>{
 const c=COURSES.beginners,l=c.lessons.find(l=>l.id==='take-opposition'),p=make(c,l);solve(p);const original=p.session.fen;
 p.startExploring();san(p,'Kd7');p.stopExploring();
 p.startExploring({fresh:true}); // Same entry used by a piece tap on the completed board.
 assert.equal(p.exploration.chess.turn(),'b');san(p,'Kf7');assert.equal(p.exploration.last.from,'e7');
 p.stopExploring();assert.equal(p.session.fen,original);assert.equal(p.boardComplete,true);assert.equal(p.checkUnlocked,true);
});

test('the checkmate Free play choice rewinds the actual mating position even when another cached line exists',()=>{
 const c=COURSES.beginners,l=c.lessons.find(l=>l.id==='beginner-checkpoint'),p=make(c,l);solve(p);
 const original=p.session.fen;p.startExploring();p.undo();const beforeMate=p.exploration.fen;
 const different=p.exploration.legal().find(m=>!m.san.endsWith('#'));assert.ok(different);p.exploreMove(different.from,different.to,different.promotion);
 const other=p.exploration.fen;p.stopExploring();assert.equal(exploreBeforeCheckmate(p),true);
 assert.equal(p.exploration.fen,beforeMate);assert.notEqual(p.exploration.fen,other);assert.equal(p.session.fen,original);assert.equal(p.boardComplete,true);
});

test('malformed archived variations are ignored without losing the current exercise',()=>{
 const c=COURSES.beginners,l=c.lessons[0],storage=memory(),p=make(c,l,storage);p.save();
 const saved=JSON.parse(storage.getItem(p.storageKey));saved.activities[0].savedExploration={anchorCursor:0,moves:['e2e5']};storage.setItem(p.storageKey,JSON.stringify(saved));
 const restored=make(c,l,storage);assert.equal(restored.resumableExploration,null);assert.equal(restored.resumeExploration(),false);assert.equal(restored.session.fen,p.session.fen);
});
