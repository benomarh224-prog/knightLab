import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {COURSES} from '../src/courses.js';
import {LessonPlayer} from '../src/lesson-player.js';
import {lessonCheckmate,exploreBeforeCheckmate,createLessonCheckmateDialog} from '../src/lesson-checkmate.js';
const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};};
const create=(course,lesson,store=storage())=>new LessonPlayer({lesson,study:course.study?.(lesson.id),storage:store,progressKey:course.key,lessonIds:course.lessons.map(l=>l.id)});
function solve(player){player.setStage('try');while(player.session.expected){const m=player.session.expected;player.attempt(m.from,m.to,m.promotion);}}

test('every current mating exercise can reopen one move earlier without losing solved progress or bypassing questions',()=>{
 let tested=0;
 for(const course of Object.values(COURSES))for(const lesson of course.lessons){
  const store=storage(),player=create(course,lesson,store);solve(player);
  if(!new Chess(player.session.fen).isCheckmate())continue;
  const state={fen:player.session.fen,correct:player.session.correct,done:player.boardComplete,complete:player.complete,answers:[...player.answers]};
  assert.ok(lessonCheckmate(player),lesson.id);assert.equal(exploreBeforeCheckmate(player),true,lesson.id);
  assert.ok(player.exploration.legal().length,lesson.id);assert.equal(lessonCheckmate(player),null);
  assert.equal(player.session.fen,state.fen);assert.equal(player.session.correct,state.correct);assert.equal(player.boardComplete,state.done);assert.equal(player.complete,state.complete);assert.deepEqual(player.answers,state.answers);
  const restored=create(course,lesson,store);assert.equal(restored.exploration.fen,player.exploration.fen);assert.equal(restored.session.fen,state.fen);assert.equal(restored.complete,state.complete);tested++;
 }
 assert.ok(tested>0);console.log(`Verified checkmate choices in ${tested} current lessons.`);
});

test('a checkmate found in free play never earns an unsolved exercise or unlocks its quiz',()=>{
 const course=COURSES.beginners,player=create(course,course.lessons.find(l=>l.id==='beginner-checkpoint'));
 player.setStage('try');const original=player.session.fen;player.startExploring();
 for(const move of player.session.lesson.verboseMoves.slice(player.session.cursor))assert.equal(player.exploreMove(move.from,move.to,move.promotion).status,'played');
 assert.ok(lessonCheckmate(player));assert.equal(player.boardComplete,false);assert.equal(player.checkUnlocked,false);
 assert.equal(exploreBeforeCheckmate(player),true);assert.equal(player.boardComplete,false);assert.equal(player.session.fen,original);
 player.stopExploring();assert.equal(player.session.fen,original);assert.equal(player.complete,false);
});

test('text-only lessons and positions without checkmate do not trigger a result or invent moves',()=>{
 const text={id:'reading',concepts:['Read this']},reader=create({key:'reading',lessons:[text]},text);
 assert.equal(lessonCheckmate(reader),null);assert.equal(exploreBeforeCheckmate(reader),false);
 const lesson={id:'static',activities:[{kind:'demonstration',fen:'7k/6Q1/5K2/8/8/8/8/8 b - - 0 1',moves:[],completion:'acknowledge'}]};
 const player=create({key:'static',lessons:[lesson]},lesson);player.setStage('try');
 assert.equal(lessonCheckmate(player).canExplore,false);assert.equal(exploreBeforeCheckmate(player),false);assert.equal(player.exploring,false);
});

function dialogFixture(){
 const element=()=>({textContent:'',focus(){this.focused=true;}}),events={};
 const dialog={open:false,shows:0,addEventListener:(name,fn)=>events[name]=fn,showModal(){this.open=true;this.shows++;},close(){this.open=false;events.close();}};
 let state={key:'first',winner:'White',canExplore:true,continueLabel:'Continue to Check →'},other=false,explores=0,continues=0,focuses=0,controller;
 const title=element(),description=element(),continueButton=element(),exploreButton=element(),closeButton=element();
 controller=createLessonCheckmateDialog({dialog,title,description,continueButton,exploreButton,closeButton,read:()=>state,otherDialogOpen:()=>other,onExplore(){explores++;state=null;controller.sync();},onContinue(){continues++;state={key:'next',winner:'Black',canExplore:true};controller.sync();},focusBoard(){focuses++;}});
 return {controller,dialog,events,title,description,continueButton,exploreButton,closeButton,set state(value){state=value;},set other(value){other=value;},get explores(){return explores;},get continues(){return continues;},get focuses(){return focuses;}};
}

test('the popup waits for animation, focuses Continue, and appears once per mating event',()=>{
 const h=dialogFixture();h.state={busy:true};h.controller.sync();assert.equal(h.dialog.shows,0);
 h.state={key:'mate',winner:'Black',canExplore:true};h.other=true;h.controller.sync();assert.equal(h.dialog.shows,0);
 h.other=false;h.controller.sync();assert.equal(h.dialog.shows,1);assert.equal(h.continueButton.focused,true);assert.match(h.description.textContent,/Black wins/);
 h.controller.sync();assert.equal(h.dialog.shows,1);h.exploreButton.onclick();assert.equal(h.explores,1);assert.equal(h.dialog.open,false);
 h.state={key:'mate',winner:'White',canExplore:true};h.controller.sync();assert.equal(h.dialog.shows,2);
});

test('Continue runs the existing lesson flow once without reopening during its render',()=>{
 const h=dialogFixture();h.controller.sync();h.continueButton.onclick();h.controller.sync();
 assert.equal(h.continues,1);assert.equal(h.explores,0);assert.equal(h.dialog.shows,1);assert.equal(h.dialog.open,false);
});

test('Escape and close use the free-play choice; a diagram without history closes without an illegal rewind',()=>{
 const h=dialogFixture();h.controller.sync();let prevented=false;
 h.events.cancel({preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(h.explores,1);
 h.state={key:'diagram',winner:'White',canExplore:false};h.controller.sync();assert.equal(h.exploreButton.textContent,'Done');
 h.closeButton.onclick();assert.equal(h.explores,1);assert.equal(h.focuses,1);assert.equal(h.dialog.open,false);
});
