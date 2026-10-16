import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Chess } from 'chess.js';
import { COURSES } from '../src/courses.js';
import { TAL_LESSONS,TAL_COURSE_INFO } from '../src/tal-lessons.js';
import { PAGE_PATHS,PAGE_VIEWS,pageFromPath } from '../src/routes.js';
import { prepareLesson } from '../src/opening-course.js';
import { LessonPlayer } from '../src/lesson-player.js';
import { learningLink } from '../src/learning-memory.js';
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};};
const create=(course,lesson,storage)=>new LessonPlayer({lesson,study:course.study(lesson.id),storage,progressKey:course.key,lessonIds:course.lessons.map(l=>l.id),orientation:{toSolver:course.orientToSolver}});

test('three discoverable Tal courses contain twelve distinct, sourced, annotated positions',()=>{
 assert.equal(TAL_COURSE_INFO.length,3);assert.equal(TAL_LESSONS.length,12);
 assert.equal(new Set(TAL_LESSONS.map(l=>l.fen)).size,12);
 for(const info of TAL_COURSE_INFO){
  const course=COURSES[info.id];assert.equal(course.category,'attacking');assert.equal(course.lessons.length,4);
  assert.equal(PAGE_PATHS[info.id],course.path);assert.equal(pageFromPath(course.path),info.id);assert.equal(PAGE_VIEWS[info.id],'french');
  const link=learningLink(COURSES,{courseId:course.id,lessonId:course.lessons[0].id});assert.equal(link.route,course.id);assert.ok(link.href.startsWith(course.path));
  for(const lesson of course.lessons){
   const prepared=prepareLesson(lesson);assert.ok(prepared.verboseMoves.length>=3);
   assert.equal(prepared.notes.length,prepared.verboseMoves.length);assert.ok(prepared.notes.every(note=>typeof note==='string'&&note.trim().length>0));
   assert.equal(new Chess(lesson.fen).turn(),lesson.practiceColor);assert.equal(new Chess(lesson.fen).isCheck(),false);
   assert.equal(lesson.concepts.length,2);assert.equal(lesson.quiz.options.length,3);
   assert.ok(lesson.source.includes(lesson.game));assert.ok(lesson.pages.every(page=>lesson.source.includes(String(page))));
   if(lesson.diagramFen){const chess=new Chess(lesson.diagramFen);for(const san of lesson.setup||[])chess.move(san);assert.equal(chess.fen(),lesson.fen);}
  }
 }
});

test('Tal exercises save partial work and require the board plus knowledge check before completion',()=>{
 const storage=memory();
 for(const info of TAL_COURSE_INFO)for(const lesson of COURSES[info.id].lessons){
  const course=COURSES[info.id];let player=create(course,lesson,storage);
  assert.deepEqual(player.plan.stages,['learn','try','check']);assert.equal(player.complete,false);assert.equal(player.checkUnlocked,false);
  assert.equal(player.flipped,lesson.practiceColor==='b');player.learnNext();player.learnNext();assert.equal(player.stage,'try');
  player.requestHint();const m=player.session.expected;assert.equal(player.attempt(m.from,m.to,m.promotion).status,'correct');
  const fen=player.session.fen,correct=player.session.correct;player=create(course,lesson,storage);
  assert.equal(player.session.fen,fen);assert.equal(player.session.correct,correct);assert.equal(player.session.hints,1);
  while(player.session.expected){const move=player.session.expected;assert.equal(player.attempt(move.from,move.to,move.promotion).status,'correct');}
  assert.equal(player.boardComplete,true);assert.equal(player.complete,false);assert.equal(player.setStage('check'),true);
  assert.equal(player.answer((lesson.quiz.answer+1)%3),false);assert.equal(player.complete,false);
  assert.equal(player.answer(lesson.quiz.answer),true);assert.equal(player.complete,true);
  const restored=create(course,lesson,storage);assert.equal(restored.complete,true);assert.equal(restored.stage,'check');
  restored.setStage('try');restored.startExploring();const next=restored.exploration.chess.moves({verbose:true})[0];assert.ok(next);
  assert.equal(restored.exploreMove(next.from,next.to,next.promotion).status,'played');assert.equal(restored.complete,true);
 }
 for(const info of TAL_COURSE_INFO)assert.equal(create(COURSES[info.id],COURSES[info.id].lessons[0],storage).progress.read().length,4);
 assert.equal(create(COURSES.french,COURSES.french.lessons[0],storage).progress.read().length,0);
});

test('selected Tal lines demonstrate the concrete board relationships described in the lessons',()=>{
 const end=id=>{const l=TAL_LESSONS.find(l=>l.id===id),c=new Chess(l.fen);for(const san of l.moves)c.move(san);return c;};
 let c=end('draw-the-king-out');assert.equal(c.get('e7').type,'k');assert.equal(c.get('h5').type,'q');
 c=end('cut-off-the-defenders');assert.equal(c.get('d5').color,'w');assert.ok(c.attackers('e6','w').includes('d5'));assert.ok(c.attackers('e5','w').includes('f4'));
 c=end('build-an-attacking-outpost');assert.equal(c.get('e6').type,'n');assert.ok(c.attackers('e6','w').includes('d5'));assert.ok(c.attackers('g7','w').includes('e6'));
 c=end('use-the-long-diagonal');assert.equal(c.isCheck(),true);assert.ok(c.attackers('h8','w').includes('e5'));
 c=end('open-the-g-file');assert.equal(c.isCheck(),true);assert.equal(c.get('g2'),undefined);assert.equal(c.get('g5').type,'r');
 c=end('deflect-the-f7-defender');assert.ok(c.attackers('e8','w').includes('f6'));assert.equal(c.get('d7').type,'r');
});

test('learning catalogue has a dedicated attacking section and a home entry without bundling the PDF',async()=>{
 const html=await readFile('src/index.html','utf8');
 assert.ok(html.includes('data-learn-filter="attacking"'));assert.ok(html.includes('id="attacking-course-cards"'));
 assert.ok(html.includes('data-home-category="attacking"'));assert.ok(html.includes('/learn/?category=attacking'));
 const source=await readFile('src/attacking-catalog.js','utf8');assert.ok(source.includes('data-course-progress='));
 assert.equal(html.includes('pdfcoffee.com'),false);
});
