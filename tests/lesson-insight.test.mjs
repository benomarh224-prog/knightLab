import test from'node:test';import assert from'node:assert/strict';import{Chess}from'chess.js';import{tacticalFact}from'../src/tactical-facts.js';import{exercisePresentation,orderedLessons,lessonDisplay,lessonStepInsight}from'../src/lesson-insight.js';import{COURSES}from'../src/courses.js';import{LessonPlayer}from'../src/lesson-player.js';import{createLessonAnalysis}from'../src/lesson-analysis.js';
test('forks, pins and discovered checks come from legal positions rather than SAN keywords',()=>{
 const fork=new Chess('4k3/7q/8/3N4/8/8/8/6K1 w - - 0 1').move('Nf6+');assert.equal(tacticalFact(fork).kind,'fork');assert.match(tacticalFact(fork).text,/queen on h7/);assert.match(tacticalFact(fork).text,/does not prove a material win/);
 const pin=new Chess('8/4k3/5n2/8/8/8/8/2B3K1 w - - 0 1').move('Bg5');assert.equal(tacticalFact(pin).kind,'pin');assert.match(tacticalFact(pin).text,/knight on f6.*king on e7/);
 const discovered=new Chess('3k4/8/8/8/8/8/3B4/3R2K1 w - - 0 1').move('Bg5+');assert.equal(tacticalFact(discovered).kind,'discovered-check');
 assert.equal(tacticalFact({...fork,after:fork.before}),null);
});
test('topic order is gradual within each existing level and does not mutate source lessons or their saved signatures',()=>{
 const course=COURSES.tactics,original=course.lessons.map(lesson=>lesson.id),ordered=orderedLessons(course);assert.deepEqual(course.lessons.map(l=>l.id),original);assert.equal(new Set(ordered.map(l=>l.id)).size,144);
 for(const level of course.levels){let previous=null;for(const lesson of ordered.filter(l=>l.level===level)){const current=exercisePresentation(lesson);assert.ok(current.title&&!/Exercise \d/i.test(current.title));if(previous){assert.ok(current.rank>=previous.rank);if(current.rank===previous.rank)assert.ok(current.complexity>=previous.complexity);}previous=current;}}
 const saved=new Map(),storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},lesson=course.lessons[2],options={lesson,study:course.study(lesson.id),storage,progressKey:course.key,lessonIds:original};
 const player=new LessonPlayer(options);player.setStage('try');player.requestHint();const move=player.session.expected;player.attempt(move.from,move.to,move.promotion);const signature=player.plan.signature,cursor=player.session.cursor;
 lessonDisplay(course,lesson,course.study(lesson.id));const restored=new LessonPlayer(options);assert.equal(restored.plan.signature,signature);assert.equal(restored.session.cursor,cursor);assert.equal(restored.session.hints,1);
});
test('lesson explanations distinguish played move and actual study reply without exposing an unplayed solver move',()=>{
 const course=COURSES.tactics,lesson=course.lessons.find(l=>l.id==='beginner-03'),player=new LessonPlayer({lesson,study:course.study(lesson.id),progressKey:course.key});const first=player.session.expected;player.attempt(first.from,first.to,first.promotion);const anchor=Object.create(player.session);anchor.cursor=1;
 const insight=lessonStepInsight(anchor,{replyLimit:1});assert.match(insight.full,/Played:/);assert.match(insight.response,/Study reply:/);assert.match(insight.full,/not a claim that every reply is forced/);assert.ok(!insight.response.includes(player.session.lesson.verboseMoves[2].san));
});
test('engine comparisons dispose workers, cache verified results only, and give failed shallow searches a real retry',async()=>{
 const move=new Chess().move('Nf3');let destroyed=0,created=0,searches=[];
 const makeEngine=()=>{const attempt=++created;return{async evaluate(fen,options){searches.push(options);return{rootFen:fen,depth:attempt===1?8:16,cp:20,mate:null,best:fen===move.before?'g1f3':'d7d5',pv:fen===move.before?['g1f3']:['d7d5']};},destroy(){destroyed++;}};};
 const analysis=createLessonAnalysis({makeEngine});let text;await analysis.explain(move,result=>text=result);assert.match(text,/did not reach/);await analysis.explain(move,result=>text=result);assert.match(text,/engine prefers your move/);assert.equal(destroyed,2);assert.ok(searches[2].milliseconds>searches[0].milliseconds);
 await analysis.explain(move,result=>text=result);assert.equal(created,2);
});
