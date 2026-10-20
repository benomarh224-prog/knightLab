import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {boardIndicators,enableBoardDrag} from '../src/board-surface.js';
import {createAutoplay} from '../src/autoplay.js';
import {createLessonMotion,lessonFrames} from '../src/lesson-motion.js';
import {OpeningLesson} from '../src/opening-course.js';
import {PIECE_FRAMES} from '../src/piece-frames.js';

test('check marks only the checked king, and capture targets follow legal moves including en passant',()=>{
 const check=new Chess('4k3/8/8/8/8/8/4R3/K7 b - - 0 1');assert.equal(boardIndicators(check).kingInCheck,'e8');
 const position=new Chess();position.move('e4');position.move('d5');assert.deepEqual([...boardIndicators(position,'e4').captures],['d5']);
 const ep=new Chess('7k/8/8/3pP3/8/8/8/K7 w - d6 0 1');assert.deepEqual([...boardIndicators(ep,'e5').captures],['d6']);
 const pinned=new Chess('4r2k/8/8/8/8/8/3pR3/4K3 w - - 0 1');assert.equal(boardIndicators(pinned,'e2').captures.has('d2'),false);
});

test('shared dragging accepts one legal drop, keeps taps native, and rejects stale or canceled gestures',()=>{
 let chess=new Chess(),destination=null,played=0;const listeners=new Map(),tiles=new Map();
 const classes=()=>{const values=new Set();return {add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v)};};
 for(const square of ['e2','e4','d2','d4']){
  const tile={dataset:{square},classList:classes(),getBoundingClientRect:()=>({width:50}),querySelector:()=>({cloneNode:()=>({})}),closest(selector){return selector==='[data-square]'?this:null;}};tiles.set(square,tile);
 }
 const board={ownerDocument:{createElement:()=>({style:{},setAttribute(){},append(){},remove(){}}),body:{append(){}},elementFromPoint:()=>destination},
  addEventListener:(name,fn)=>listeners.set(name,fn),querySelector:selector=>selector==='.is-drag-origin'?[...tiles.values()].find(t=>t.classList.contains('is-drag-origin')):tiles.get(selector.match(/"([a-h][1-8])"/)?.[1]),
  contains:tile=>[...tiles.values()].includes(tile),hasPointerCapture:()=>false,setPointerCapture(){},releasePointerCapture(){}};
 enableBoardDrag(board,{read:()=>({chess}),select(){},play:(from,to)=>{chess.move({from,to});played++;}});
 const event=(square,x=0,y=0)=>({target:tiles.get(square),button:0,isPrimary:true,pointerId:1,clientX:x,clientY:y,preventDefault(){},stopImmediatePropagation(){}});
 listeners.get('pointerdown')(event('e2'));listeners.get('pointerup')(event('e2'));assert.equal(played,0);
 listeners.get('pointerdown')(event('e2'));listeners.get('pointermove')(event('e2',20));destination=tiles.get('e4');listeners.get('pointerup')(event('e2',20));assert.equal(played,1);assert.equal(chess.get('e4').type,'p');
 chess=new Chess();listeners.get('pointerdown')(event('d2'));listeners.get('pointermove')(event('d2',20));chess.move('e4');destination=tiles.get('d4');listeners.get('pointerup')(event('d2',20));assert.equal(played,1);
 chess=new Chess();listeners.get('pointerdown')(event('d2'));listeners.get('pointermove')(event('d2',20));listeners.get('pointercancel')();listeners.get('pointerup')(event('d2',20));assert.equal(played,1);
});
test('balanced piece viewports preserve full strokes and consistent white/black proportions',()=>{
 for(const type of ['K','Q','R','B','N','P']){
  const white=PIECE_FRAMES['w'+type].split(' ').map(Number),black=PIECE_FRAMES['b'+type].split(' ').map(Number);
  for(const [x,y,w,h] of [white,black]){assert.ok(x>=0&&y>=0&&x+w<=800&&y+h<=800);assert.ok(w>300&&h>500);}
  assert.ok(Math.abs(white[2]-black[2])/white[2]<.025);assert.ok(Math.abs(white[3]-black[3])/white[3]<.025);
 }
});
test('autoplay advances one displayed move at a time, stops at the end, and cancels stale callbacks',()=>{
 const source={},jobs=[],played=[];let cursor=0;
 const autoplay=createAutoplay({read:()=>({source,cursor,total:3}),next:()=>played.push(++cursor),schedule:fn=>(jobs.push(fn),jobs.length),unschedule:()=>{}});
 assert.equal(jobs.length,0);autoplay.start();assert.deepEqual(played,[]);jobs.shift()();assert.deepEqual(played,[1]);
 autoplay.stop();jobs.shift()();assert.deepEqual(played,[1]);autoplay.start();jobs.shift()();jobs.shift()();assert.deepEqual(played,[1,2,3]);assert.equal(autoplay.active,false);
});
test('autoplay cannot advance an imported game or changed variation using an old timer',()=>{
 let source={},cursor=0;const jobs=[];
 const player=createAutoplay({read:()=>({source,cursor,total:4}),next:()=>cursor++,schedule:fn=>(jobs.push(fn),jobs.length),unschedule:()=>{}});
 player.start();source={};jobs.shift()();assert.equal(cursor,0);assert.equal(player.active,false);
});
test('lesson audio follows displayed validated frames once; final rerender and canceled frames stay silent',()=>{
 const lesson=new OpeningLesson({id:'audio-motion',title:'Center',moves:['e4','e5'],notes:['a','b'],practiceColor:'w'});lesson.practice();lesson.attempt('e2','e4');
 const heard=[],painted=[],jobs=[];let motion;
 motion=createLessonMotion({paint:()=>painted.push(motion.frame?.last?.san||'final'),onFrame:frame=>heard.push(frame.last.san),schedule:fn=>(jobs.push(fn),jobs.length),unschedule:()=>{}});
 motion.play(lessonFrames(lesson,0));assert.deepEqual(heard,['e4']);jobs.shift()();assert.deepEqual(heard,['e4','e5']);jobs.shift()();assert.equal(painted.at(-1),'final');assert.equal(heard.length,2);
 motion.play(lessonFrames(lesson,0));motion.cancel();jobs.shift()();assert.equal(heard.length,3);
});
