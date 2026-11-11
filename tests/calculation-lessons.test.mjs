import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import puzzles from '../src/calculation-puzzles.json' with {type:'json'};
import {CALCULATION_LESSONS,CALCULATION_GROUPS,CALCULATION_LEVELS,CALCULATION_REFERENCE} from '../src/calculation-lessons.js';
import {COURSES,courseLessons} from '../src/courses.js';
import {LessonPlayer} from '../src/lesson-player.js';
import {PAGE_PATHS,pageFromPath} from '../src/routes.js';
import {positionIdentity,gameIdentity,solverValue} from '../scripts/lib/puzzle-selection.mjs';
import {renderCourseLevels} from '../src/course-levels.js';

const uci=move=>move.from+move.to+(move.promotion||'');
const play=(board,move)=>board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
const memory=()=>{const values=new Map();return {values,getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
const create=(lesson,storage)=>new LessonPlayer({lesson,study:lesson.study,storage,progressKey:COURSES.calculation.key,lessonIds:CALCULATION_LESSONS.map(l=>l.id),orientation:{toSolver:true}});

test('120 hard puzzles use different games and positions, including mirrors, with balanced themes, levels and colors',()=>{
  assert.equal(puzzles.length,120);assert.equal(new Set(puzzles.map(p=>p.id)).size,120);
  assert.equal(new Set(puzzles.map(p=>positionIdentity(p.fen))).size,120);
  const games=puzzles.map(p=>gameIdentity(p.gameUrl));assert.ok(games.every(Boolean));assert.equal(new Set(games).size,120);
  assert.equal(puzzles.filter(p=>p.fen.split(' ')[1]==='w').length,60);
  for(const level of Object.keys(CALCULATION_LEVELS)){
    assert.equal(courseLessons(COURSES.calculation,level).length,40);
    for(const group of Object.keys(CALCULATION_GROUPS))for(const color of ['w','b'])assert.equal(puzzles.filter(p=>p.level===level&&p.group===group&&p.fen.split(' ')[1]===color).length,2);
  }
});

test('source setup, every UCI and SAN move and stored engine variations are legal; there is no mate-in-one shortcut',()=>{
  for(const p of puzzles){
    const before=new Chess(p.sourceFen);play(before,p.setup);assert.equal(before.fen(),p.fen,p.id);
    const board=new Chess(p.fen),solver=board.turn();assert.equal(board.isGameOver(),false,p.id);
    assert.equal(board.moves({verbose:true}).some(move=>{const copy=new Chess(p.fen);copy.move(move);return copy.isCheckmate();}),false,p.id);
    const san=p.uci.map(move=>play(board,move).san);assert.deepEqual(san,p.moves,p.id);
    const decisions=Math.ceil(san.length/2);assert.ok(decisions>=3&&decisions<=6,p.id);
    assert.ok(p.rating>=1900&&p.rating<=2699,p.id);assert.ok(p.ratingDeviation<=90&&p.popularity>=80&&p.plays>=100,p.id);
    assert.ok(!p.themes.some(theme=>['mateIn1','mateIn2'].includes(theme)),p.id);
    assert.equal(p.verification.root.best,p.uci[0],p.id);assert.equal(p.verification.root.rootFen,p.fen,p.id);
    assert.ok(p.verification.root.depth>=16,p.id);assert.equal(p.verification.finish.rootFen,board.fen(),p.id);
    assert.ok(solverValue(p.verification.root,solver)>=(p.group==='defense'?-100:150),p.id);
    const finish=p.verification.finish;
    if(!board.isGameOver()){assert.ok(finish.depth>=14,p.id);assert.ok(solverValue(finish,solver)>=(p.group==='defense'?-100:180),p.id);}
    else assert.ok(board.isCheckmate()||p.group==='defense'&&board.isDraw(),p.id);
    for(const score of [p.verification.root,p.verification.root.alternative,finish].filter(Boolean)){
      const check=new Chess(score.rootFen);for(const move of score.pv||[])assert.ok(play(check,move),p.id);
    }
  }
});

test('every challenge requires the complete multi-move line, survives reload and replays every opponent reply',()=>{
  for(const lesson of CALCULATION_LESSONS){
    const storage=memory();let player=create(lesson,storage);
    assert.equal(player.stage,'try');assert.equal(player.flipped,lesson.practiceColor==='b');
    assert.equal(player.complete,false);assert.equal(player.session.cursor,0);
    const first=player.session.expected;player.attempt(first.from,first.to,first.promotion);
    assert.equal(player.complete,false,lesson.id);assert.equal(player.session.cursor,2);
    const partial=player.session.fen;player=create(lesson,storage);assert.equal(player.session.fen,partial);
    while(player.session.expected){const next=player.session.expected;assert.equal(player.attempt(next.from,next.to,next.promotion).status,'correct');}
    assert.equal(player.complete,true,lesson.id);assert.equal(player.session.cursor,lesson.moves.length);
    player=create(lesson,storage);assert.equal(player.complete,true);player.reviewing=true;
    const board=new Chess(lesson.fen);player.jump(0);assert.equal(player.session.fen,board.fen());
    for(let index=0;index<lesson.moves.length;index++){board.move(lesson.moves[index]);player.jump(index+1);assert.equal(player.session.fen,board.fen(),`${lesson.id}/${index}`);}
    assert.ok(player.progress.read().includes(lesson.id));assert.equal(player.complete,true);
  }
});

test('progressive hints do not reveal a destination early and legal alternatives remain distinct from illegal moves',()=>{
  const lesson=CALCULATION_LESSONS[0],player=create(lesson,memory()),expected=player.session.expected;
  const alternative=new Chess(lesson.fen).moves({verbose:true}).find(move=>uci(move)!==uci(expected));
  assert.equal(player.attempt(alternative.from,alternative.to,alternative.promotion).status,'different');
  assert.equal(player.attempt('a1','a1').status,'illegal');assert.equal(player.session.cursor,0);
  const rule=player.requestHint();assert.equal(rule.level,1);assert.equal(rule.to,undefined);assert.doesNotMatch(rule.text,/[a-h][1-8]/);
  const piece=player.requestHint();assert.equal(piece.level,2);assert.equal(piece.from,expected.from);assert.equal(piece.to,undefined);
  const reveal=player.requestHint();assert.equal(reveal.level,3);assert.equal(reveal.to,expected.to);
});

test('old warm-up progress is preserved and cannot complete or unlock new calculation challenges',()=>{
  const storage=memory(),old=JSON.stringify(COURSES.mates.lessons.map(l=>l.id));storage.setItem('knightlab-mate-course-v1',old);
  const player=create(CALCULATION_LESSONS[0],storage);assert.equal(player.complete,false);assert.deepEqual(player.progress.read(),[]);
  while(player.session.expected){const next=player.session.expected;player.attempt(next.from,next.to,next.promotion);}
  assert.equal(storage.getItem('knightlab-mate-course-v1'),old);assert.equal(player.progress.read().length,1);
  assert.equal(COURSES.mates.key,'knightlab-mate-course-v1');assert.equal(COURSES.mates.catalog,undefined);
  assert.equal(PAGE_PATHS.calculation,'/learn/calculation/');assert.equal(pageFromPath(PAGE_PATHS.calculation),'calculation');
  // Adding a second leveled course does not change the existing daily tactics selector.
  assert.equal(Object.values(COURSES).find(course=>course.levels?.length).id,'tactics');
});

function levelRoot(doc){
  let html='',buttons=[],renders=0;const root={dataset:{},get renders(){return renders;},contains:el=>buttons.includes(el),querySelectorAll:()=>buttons};
  Object.defineProperty(root,'innerHTML',{get:()=>html,set:value=>{html=value;renders++;buttons=[...value.matchAll(/data-course-level="([^"]+)"/g)].map(match=>({dataset:{courseLevel:match[1]},attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus(){doc.activeElement=this;}}));}});return root;
}
test('level controls derive labels from metadata, preserve focused buttons and retain existing tactics levels',()=>{
  const doc={},root=levelRoot(doc);renderCourseLevels(root,COURSES.tactics,'beginner',doc);
  assert.match(root.innerHTML,/>Intermediate</);assert.equal(root.querySelectorAll().length,3);doc.activeElement=root.querySelectorAll()[2];
  renderCourseLevels(root,COURSES.tactics,'advanced',doc);assert.equal(root.renders,1);assert.equal(doc.activeElement.attrs['aria-pressed'],'true');
  renderCourseLevels(root,COURSES.calculation,'expert',doc);assert.equal(doc.activeElement.dataset.courseLevel,'advanced');assert.match(root.innerHTML,/>Challenging</);assert.match(root.innerHTML,/type="button"/);
  renderCourseLevels(root,COURSES.french,undefined,doc);assert.equal(root.hidden,true);
});

test('featured training consistently opens hard challenges and source ratings are identified as puzzle ratings',()=>{
  const html=readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
  assert.match(html,/href="\/learn\/calculation\/" data-route="calculation" data-home-reveal><div><h3>Calculation Lab/);
  assert.match(html,/Optional mate warm-ups/);assert.doesNotMatch(html,/new mate-in-one positions|Spot the only mating move/);
  assert.match(CALCULATION_REFERENCE,/CC0/);assert.match(CALCULATION_REFERENCE,/puzzle ratings, not player ratings/);
  for(const lesson of CALCULATION_LESSONS){assert.equal(lesson.quiz,undefined);assert.doesNotMatch(lesson.takeaway,/undefined/);assert.match(lesson.source,/https:\/\/lichess.org\/training\//);assert.equal(lesson.notes.length,lesson.moves.length);}
});
