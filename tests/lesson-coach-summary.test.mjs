import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonCoachSummary,compactLessonAction,paintLessonSummary} from '../src/lesson-coach-summary.js';
import {COURSES} from '../src/courses.js';
import {LessonPlayer} from '../src/lesson-player.js';
import {solutionRecap} from '../src/lesson-experience.js';
import {lessonContinuation} from '../src/lesson-navigation.js';

test('coach summary presents the supplied instruction without adding chess judgements',()=>{
  assert.deepEqual(lessonCoachSummary({guidance:{status:'Black to move',instruction:'Find a pawn break.',mode:'practice'}}),{title:'Black to move',text:'Find a pawn break.',kind:'practice'});
});
test('an attempt takes precedence over an older hint; requesting a hint presents that hint',()=>{
  const hint={level:2,text:'Look at the pawn on c4.'};
  assert.equal(lessonCoachSummary({hint,feedback:hint.text}).title,'Hint 2 of 3');
  const response=lessonCoachSummary({hint,feedback:'c5 is legal, but it does not capture the pawn.',alternative:true});
  assert.equal(response.title,'Your move');assert.match(response.text,/c5 is legal/);assert.doesNotMatch(response.text,/mistake|blunder/);
});
test('solution summary uses the actual validated recap without bypassing Check',()=>{
  const c=COURSES.beginners,l=c.lessons.find(l=>l.id==='bishop-diagonals');
  const p=new LessonPlayer({lesson:l,study:c.study(l.id),progressKey:c.key,storage:{getItem:()=>null,setItem(){}}});
  assert.equal(solutionRecap(p),null);const move=p.session.expected;p.attempt(move.from,move.to);
  const recap=solutionRecap(p),summary=lessonCoachSummary({recap,feedback:'Exercise complete.'});
  assert.equal(summary.text,recap.shortText);assert.equal(summary.text,l.takeaway);assert.match(recap.text,/g5/);assert.equal(p.complete,false);
  const next=lessonContinuation(p);assert.equal(compactLessonAction(next),'Check →');assert.equal(p.complete,false);
});
test('short action labels preserve the original action and full accessible label',()=>{
  const next={action:'stage',stage:'check',label:'Continue to Check →',enabled:true};
  assert.equal(compactLessonAction(next),'Check →');assert.equal(next.label,'Continue to Check →');
  assert.equal(compactLessonAction({action:'activity',label:'Next exercise →'}),'Next exercise →');
  const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},textContent:'',setAttribute(k,v){this[k]=v;}});return nodes.get(id);};
  paintLessonSummary({doc:{getElementById:node},summary:{title:'Your coach',text:'Capture a pawn.',kind:'practice'},next});
  assert.equal(node('lesson-course-next')['aria-label'],next.label);assert.equal(node('lesson-course-next').dataset.compactLabel,'Check →');
});
test('unchanged summaries are not re-announced on selection-only renders',()=>{
  let writes=0;const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},value:'',get textContent(){return this.value;},set textContent(v){writes++;this.value=v;},setAttribute(){}});return nodes.get(id);};
  const data={doc:{getElementById:node},summary:{title:'Your coach',text:'Choose a move.',kind:'practice'},next:{action:'blocked',label:'Continue →'}};
  paintLessonSummary(data);paintLessonSummary(data);assert.equal(writes,2);
});

test('coach labels distinguish illegal moves, objective attempts and free-play stalemate',()=>{
 const illegal=lessonCoachSummary({attempt:{kind:'illegal'},feedback:'A pawn cannot move there.'});assert.equal(illegal.title,'Not a legal move');assert.equal(illegal.kind,'illegal');
 const different=lessonCoachSummary({attempt:{kind:'objective'},feedback:'c5 is legal, but it does not capture.'});assert.equal(different.kind,'objective');assert.doesNotMatch(different.title,/mistake|blunder|illegal/i);
 const ended=lessonCoachSummary({guidance:{mode:'explore',status:'Stalemate'},feedback:'Kxf1 played. Stalemate'});assert.equal(ended.title,'Stalemate');assert.match(ended.text,/not in check.*Undo/);assert.equal(ended.kind,'explore');
});
