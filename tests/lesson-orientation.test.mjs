import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES } from '../src/courses.js';
import { LessonPlayer } from '../src/lesson-player.js';
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};};
function player(course,lesson,storage,legacy=false){return new LessonPlayer({lesson,study:course.study(lesson.id),storage,progressKey:course.key,lessonIds:course.lessons.map(l=>l.id),orientation:legacy?undefined:{toSolver:course.orientToSolver,revision:course.orientationRevision||0}});}
test('all French lessons open from Black’s side, including legacy saves; manual flips persist',()=>{
  const course=COURSES.french;
  for(const lesson of course.lessons){
    assert.equal(lesson.practiceColor,'b');
    assert.equal(player(course,lesson,memory()).flipped,true);
    const storage=memory();let old=player(course,lesson,storage,true);
    old.setStage('try');old.requestHint();
    const move=old.session.expected;old.attempt(move.from,move.to,move.promotion);
    old.startExploring();const fen=old.exploration.fen;
    const before=JSON.parse(storage.getItem(old.storageKey));
    // Simulate the original schema without an orientation policy marker.
    delete before.orientationRevision;storage.setItem(old.storageKey,JSON.stringify(before));
    let current=player(course,lesson,storage);
    assert.equal(current.flipped,true);assert.equal(current.exploration.fen,fen);
    const after=JSON.parse(storage.getItem(current.storageKey));
    delete after.orientationRevision;delete after.flipped;delete before.flipped;
    assert.deepEqual(after,before,lesson.id);
    current.flipped=false;current.save();
    current=player(course,lesson,storage);assert.equal(current.flipped,false);
  }
});
test('other courses retain saved manual orientation and completed French lessons remain completed',()=>{
  for(const course of Object.values(COURSES).filter(c=>c.id!=='french')){
    const storage=memory(),lesson=course.lessons[0],old=player(course,lesson,storage,true);
    old.flipped=true;old.save();assert.equal(player(course,lesson,storage).flipped,true);
  }
  const course=COURSES.french,lesson=course.lessons[0],storage=memory(),old=player(course,lesson,storage,true);
  while(old.session.expected){const m=old.session.expected;old.attempt(m.from,m.to,m.promotion);}
  assert.equal(old.complete,true);
  const current=player(course,lesson,storage);assert.equal(current.complete,true);assert.equal(current.flipped,true);
});
