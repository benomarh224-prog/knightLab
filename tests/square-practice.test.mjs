import test from 'node:test';
import assert from 'node:assert/strict';
import {SquarePractice,squareGrid,squareNeighbor} from '../src/square-practice.js';
import {COURSES} from '../src/courses.js';
import {LessonPlayer,lessonPlan} from '../src/lesson-player.js';
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};};
const course=COURSES.beginners,lesson=course.lessons[0],key='coordinates';
const make=(storage=memory(),data=lesson.squarePractice)=>new SquarePractice({data,storage,key});

test('beginner square practice checks each coordinate, retries wrong answers, and changes perspective',()=>{
  const p=make();assert.equal(p.prompt,'Click e4');assert.equal(p.showCoordinates,true);
  assert.equal(p.attempt('d4').status,'retry');assert.equal(p.solved.length,0);assert.match(p.feedback,/That is d4/);
  assert.equal(p.attempt('e9').status,'invalid');assert.equal(p.solved.length,0);
  for(let i=0;i<4;i++)assert.equal(p.attempt(p.target.square).status,'correct');
  assert.equal(p.showCoordinates,false);p.toggleCoordinates();assert.equal(p.showCoordinates,true);
  for(let i=4;i<8;i++)p.attempt(p.target.square);
  assert.equal(p.target.orientation,'b');assert.equal(p.target.square,'e4');
  while(!p.complete)p.attempt(p.target.square);
  assert.equal(p.solved.length,12);assert.match(p.feedback,/All squares found/);
  assert.equal(p.attempt('e4').status,'complete');assert.equal(p.solved.length,12);
});

test('square progress and label preference survive reload and review, without touching lesson saves',()=>{
  const storage=memory(),p=make(storage),player=new LessonPlayer({lesson,study:lesson.study,storage,progressKey:course.key});
  player.setStage('try');player.attempt('e2','e4');player.setStage('check');player.answer(lesson.quiz.answer);
  const saved=storage.getItem(player.storageKey),earned=storage.getItem(course.key);
  p.attempt('e4');p.attempt('d5');p.toggleCoordinates();
  const restored=make(storage);assert.equal(restored.target.square,'a1');assert.equal(restored.solved.length,2);assert.equal(restored.showCoordinates,false);
  restored.reset();assert.equal(restored.prompt,'Click e4');assert.equal(restored.showCoordinates,true);
  assert.equal(storage.getItem(player.storageKey),saved);assert.equal(storage.getItem(course.key),earned);
  assert.equal(new LessonPlayer({lesson,study:lesson.study,storage,progressKey:course.key}).complete,true);
});

test('adding or updating optional square practice preserves old exercise signatures and drafts',()=>{
  const {squarePractice,...previousLesson}=lesson,storage=memory();
  assert.equal(lessonPlan(previousLesson,lesson.study).signature,lessonPlan(lesson,lesson.study).signature);
  const previous=new LessonPlayer({lesson:previousLesson,study:lesson.study,storage,progressKey:course.key});
  previous.setStage('try');previous.attempt('e2','e4');previous.setStage('check');previous.answer((lesson.quiz.answer+1)%3);
  const current=new LessonPlayer({lesson,study:lesson.study,storage,progressKey:course.key});
  assert.equal(current.stage,'check');assert.equal(current.boardComplete,true);assert.equal(current.complete,false);assert.equal(current.answers[0],previous.answers[0]);
});

test('saved prefixes are validated and unavailable storage still permits practice',()=>{
  const storage=memory(),p=make(storage);p.attempt('e4');
  const saved=JSON.parse(storage.getItem(key));saved.solved=['w:e4','w:h8','w:a1'];storage.setItem(key,JSON.stringify(saved));
  assert.equal(make(storage).solved.length,1);
  const changed=make(storage,{targets:['a1']});assert.equal(changed.solved.length,0);
  storage.setItem(key,'broken');assert.equal(make(storage).solved.length,0);
  const unavailable={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
  const local=make(unavailable);local.attempt('e4');assert.equal(local.solved.length,1);
  assert.throws(()=>make(storage,{targets:['e9']}),/valid board coordinates/);
});

test('all 64 squares retain their identities in both orientations and keyboard movement never wraps',()=>{
  for(const orientation of ['w','b']){
    const grid=squareGrid(orientation);assert.equal(new Set(grid).size,64);
    assert.equal(grid[0],orientation==='w'?'a8':'h1');assert.equal(grid[63],orientation==='w'?'h1':'a8');
    for(let i=0;i<64;i++)for(const [direction,delta] of [['ArrowLeft',-1],['ArrowRight',1],['ArrowUp',-8],['ArrowDown',8]]){
      const valid=!(direction==='ArrowLeft'&&i%8===0||direction==='ArrowRight'&&i%8===7)&&grid[i+delta];
      assert.equal(squareNeighbor(grid[i],direction,orientation),valid||null);
    }
  }
  assert.equal(squareNeighbor('e4','Enter'),null);
});
