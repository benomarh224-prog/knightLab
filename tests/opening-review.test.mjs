import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { COURSES } from '../src/courses.js';
import { createOpeningTraining, OpeningTestSession, openingPositionKey, pickOpeningTest } from '../src/opening-training.js';
import { createOpeningReview, OPENING_REVIEW_KEY } from '../src/opening-review.js';
import { createDailyTraining, dailyPracticeTask } from '../src/daily-training.js';
import { createDailyTrainingUI } from '../src/daily-training-ui.js';
import { createOpeningTestUI } from '../src/opening-test-ui.js';
import { accountKey } from '../src/account-policy.js';
import { mergeAccountValue } from '../src/account-merge.js';

function fixture() {
  const data = new Map(), storage = {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  const completed = ['sicilian-najdorf-e6','sicilian-najdorf-e5','sicilian-najdorf-central-break','sicilian-dragon'];
  storage.setItem(COURSES.sicilian.key,JSON.stringify(completed));
  const training = createOpeningTraining(COURSES);
  let date;
  const setDate = value => { date = new Date(value+'T12:00:00'); };
  const now = () => date;
  setDate('2026-11-11');
  const makeReview = () => createOpeningReview({training,storage,now});
  const questions = training.completedPositions(storage);
  const question = questions.find(q=>q.answers.some(a=>a.lessonId==='sicilian-najdorf-e6'&&a.move.san==='g4'));
  return {storage,training,questions,question,now,setDate,makeReview};
}

const key = q => openingPositionKey(q.fen);
const coordinates = move => `${move.from}${move.to}${move.promotion||''}`;
function attempt(question, matched) {
  const move = matched ? question.answers[0].move : new Chess(question.fen).moves({verbose:true}).find(move=>!question.answers.some(a=>coordinates(a.move)===coordinates(move)));
  return new OpeningTestSession([question]).attempt(move.from,move.to,move.promotion);
}

test('a missed exact position returns tomorrow; only recalls on due days earn longer spacing and a verified related position',()=>{
  const f=fixture(), q=f.question, ok=attempt(q,true), miss=attempt(q,false);
  let review=f.makeReview();
  assert.equal(review.record(q,ok),null);
  assert.deepEqual(review.record(q,miss),{due:'2026-11-12',related:false});
  assert.equal(review.record(q,ok),null);
  assert.equal(review.due(),null);
  f.setDate('2026-11-12');review=f.makeReview();
  assert.deepEqual(review.due(),{position:key(q),due:'2026-11-12',source:null});
  assert.deepEqual(review.record(q,ok),{due:'2026-11-15',related:false});
  f.setDate('2026-11-14');assert.equal(review.record(q,ok),null);
  f.setDate('2026-11-15');assert.deepEqual(review.record(q,ok),{due:'2026-11-22',related:true});
  assert.equal(review.due(),null);
  f.setDate('2026-11-16');review=f.makeReview();
  const task=review.due(), transfer=review.question(task.position);
  assert.equal(task.source,key(q));assert.notEqual(task.position,key(q));
  assert.ok(transfer.sources.some(a=>a.lessonId.startsWith('sicilian-najdorf-')));
  assert.equal(transfer.fen.split(' ')[1],q.fen.split(' ')[1]);
  assert.equal(review.record(transfer,attempt(transfer,true),{source:task.source}),null);
  assert.equal(review.due(),null);
  f.setDate('2026-11-22');assert.equal(review.due().position,key(q));
  assert.deepEqual(review.record(q,miss),{due:'2026-11-23',related:false});
  f.setDate('2026-11-23');assert.deepEqual(review.record(q,ok),{due:'2026-11-26',related:false});
});

test('a missed related position earns its own recall without resetting the original position',()=>{
  const f=fixture(), q=f.question, review=f.makeReview(), ok=attempt(q,true);
  review.record(q,attempt(q,false));
  f.setDate('2026-11-12');review.record(q,ok);
  f.setDate('2026-11-15');review.record(q,ok);
  f.setDate('2026-11-16');const task=review.due(), transfer=review.question(task.position);
  assert.equal(review.record(transfer,attempt(transfer,false),{source:task.source}).due,'2026-11-17');
  f.setDate('2026-11-17');assert.deepEqual(review.due(),{position:task.position,due:'2026-11-17',source:null});
  assert.equal(review.record(transfer,attempt(transfer,true)).due,'2026-11-20');
  f.setDate('2026-11-22');assert.equal(review.record(q,ok).due,'2026-12-06');
});

test('the daily plan reserves one opening slot, keeps active tasks stable, and saves the first legal answer',()=>{
  const f=fixture(), q=f.question, review=f.makeReview(), make=()=>createDailyTraining({storage:f.storage,courses:COURSES,openingReview:review,now:f.now});
  const mistake={fen:'7k/8/8/8/8/8/p7/7K b - - 0 1',solution:'a2a1q',color:'b'};
  const early=make();review.record(q,attempt(q,false));
  const yesterday=early.today({mistakes:[mistake]});assert.ok(yesterday.tasks.every(task=>task.kind!=='opening'));
  f.setDate('2026-11-12');const day=early.today({mistakes:[mistake]}), [recall,challenge,personal]=day.tasks;
  assert.equal(recall.position,key(q));assert.equal(personal.kind,'mistake');
  assert.ok(dailyPracticeTask(COURSES,challenge.courseId,challenge.lessonId,challenge.index));
  const url=new URL(early.link(day.date,recall),'https://roqvyn.example');
  assert.equal(url.pathname,'/train/opening-test/');
  assert.equal(early.openingContext(new URLSearchParams({daily:day.date,task:'unrelated'})),null);
  const ctx=early.openingContext(url.searchParams);
  assert.equal(key(ctx.question),key(q));assert.equal(early.solveOpening(ctx,coordinates(q.answers[0].move)),null);
  assert.equal(early.start(ctx.date,ctx.task.id),true);
  assert.equal(early.solveOpening(ctx,'a1a1'),null);assert.equal(early.done(ctx.date,ctx.task.id),false);
  const miss=coordinates(attempt(q,false).move), answer=early.solveOpening(ctx,miss);
  assert.deepEqual(answer,{move:miss,matched:false,schedule:{due:'2026-11-13',related:false}});
  assert.deepEqual(early.solveOpening(ctx,coordinates(q.answers[0].move)),answer);
  const restored=make(), saved=restored.openingContext(url.searchParams);
  assert.equal(saved.complete,true);assert.deepEqual(saved.answer,answer);
  assert.equal(restored.report(day.date).opening,1);assert.equal(restored.report(day.date).openingMatched,0);
  assert.equal(restored.report(day.date).unknown,0);
  assert.deepEqual(restored.today({mistakes:[mistake]}).tasks,day.tasks);
  assert.equal(f.storage.getItem(COURSES.sicilian.key),JSON.stringify(['sicilian-najdorf-e6','sicilian-najdorf-e5','sicilian-najdorf-central-break','sicilian-dragon']));
});

test('the study-test and daily view handlers share the board and show the saved reveal after reload',()=>{
  const f=fixture(), review=f.makeReview(), random=()=>0.25;
  const q=pickOpeningTest(f.questions,random)[0], miss=attempt(q,false).move;
  function page() {
    const elements=new Map(), routes=[], audio=[];
    const doc={querySelectorAll:()=>[],getElementById(id){
      if(!elements.has(id))elements.set(id,{dataset:{},hidden:false,ownerDocument:doc,listeners:{},classList:{add(){}},
        addEventListener(name,fn,capture){if(!capture)this.listeners[name]=fn;},querySelector:()=>null,querySelectorAll:()=>[],
        focus(){doc.focused=id;},setAttribute(){},removeAttribute(){}});
      return elements.get(id);
    }};
    const daily=createDailyTrainingUI({storage:f.storage,courses:COURSES,openingReview:review,now:f.now,doc,mistakes:()=>[],go:(name,opts)=>routes.push({name,...opts})});
    const testUI=createOpeningTestUI({training:f.training,storage:f.storage,openingReview:review,daily,doc,random,playSound:move=>audio.push(move.san)});
    const el=id=>doc.getElementById(id);
    const square=value=>el('opening-test-board').listeners.click({target:{closest:()=>({dataset:{square:value}})}});
    return {doc,el,daily,testUI,routes,audio,square};
  }
  const p=page();p.testUI.setActive(true);p.el('opening-test-start').onclick();
  p.square(miss.from);p.square(miss.to);
  assert.match(p.el('opening-test-verdict').textContent,/Different/);
  assert.equal(p.audio.length,1);assert.equal(p.doc.focused,'opening-test-next');
  assert.match(p.el('opening-test-schedule').textContent,/Next recall/);
  f.setDate('2026-11-12');const day=p.daily.render(), task=day.tasks[0];
  assert.equal(task.position,key(q));p.el('daily-start').onclick();
  assert.equal(p.routes.at(-1).name,'openingtest');const query=new URLSearchParams(p.routes.at(-1).search);
  p.testUI.setActive(true,query);
  assert.equal(p.el('opening-test-title').textContent,'Opening review');assert.equal(p.el('opening-test-answer').hidden,true);
  const move=q.answers[0].move;p.square(move.from);p.square(move.to);
  assert.match(p.el('opening-test-verdict').textContent,/Matched/);
  const restored=page();restored.testUI.setActive(true,query);
  assert.equal(restored.el('opening-test-answer').hidden,false);assert.match(restored.el('opening-test-verdict').textContent,/Matched/);
  assert.equal(restored.audio.length,0);
  restored.el('opening-test-next').onclick();assert.equal(restored.routes.at(-1).name,'train');
  restored.daily.render();assert.match(restored.el('daily-report').innerHTML,/Opening review: 1 of 1/);
});

test('account sync preserves independent queued positions and cannot undo a completed related review',()=>{
  const f=fixture(), [q, other, related]=f.questions, qid=key(q), oid=key(other), rid=key(related);
  const row={date:'2026-11-15',matched:true,streak:2,transfer:{position:rid,due:'2026-11-16',done:false}};
  const a={version:1,records:{[qid]:row}}, b={version:1,records:{[qid]:{...row,matched:false,streak:0,transfer:{...row.transfer,done:true}},[oid]:{date:'2026-11-14',matched:false,streak:0}}};
  assert.equal(accountKey(OPENING_REVIEW_KEY),true);
  for(const [first,second] of [[a,b],[b,a]]){
    const {records}=JSON.parse(mergeAccountValue(OPENING_REVIEW_KEY,JSON.stringify(first),JSON.stringify(second)));
    assert.deepEqual(records[oid],b.records[oid]);assert.deepEqual(records[qid],b.records[qid]);
  }
});
