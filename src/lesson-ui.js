import {finishBoard,enableBoardDrag} from './board-surface.js';
import {navigationSoundMove} from './sound.js';
import { Chess } from 'chess.js';
import { pieceSvg } from './pieces.js';
import { COURSES,courseLessons } from './courses.js';
import { createCourseProgress } from './opening-course.js';
import { LessonPlayer } from './lesson-player.js';
import { renderLearningProgress } from './learning-progress.js';
import { createLessonLayout } from './lesson-layout.js';
import { createLearningMemory } from './learning-memory.js';
import { renderLearningCompanion } from './learning-companion.js';
import { createLessonDock,lessonContinuation } from './lesson-navigation.js';
import { moveTransitions,animatePieces } from './piece-motion.js';
import { createLessonMotion,lessonFrames } from './lesson-motion.js';
import { illegalMoveReason } from './lesson-move-help.js';
import { coursePractice } from './course-practice.js';
import { renderAttackingCatalog } from './attacking-catalog.js';
import { renderOpeningCatalog } from './opening-catalog.js';
import { lessonCheckmate,exploreBeforeCheckmate,createLessonCheckmateDialog } from './lesson-checkmate.js';
import { lessonEntry,lessonGuidance } from './lesson-guidance.js';
import { createSquarePracticeUI } from './square-practice.js';
import { createLessonViewport } from './lesson-viewport.js';
import { createGuidedExample } from './lesson-demonstration.js';

const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'},stageNames={learn:'Learn',try:'Try',check:'Check'};

export function createLearningUI({storage,onAnalyze,onCourseComplete,onCoursePractice,playSound=()=>{},feedbackSound=()=>{}}){
  renderAttackingCatalog(COURSES);
  renderOpeningCatalog(COURSES);
  const memoryFor=course=>createCourseProgress(storage,course.lessons.map(lesson=>lesson.id),course.key),players=new Map(),memory=createLearningMemory(storage,COURSES);
  const squarePractice=createSquarePracticeUI({storage,feedbackSound});
  const guidedExample=createGuidedExample({storage,playSound});
  let course=COURSES.french,lessons=course.lessons,progress=memoryFor(course),player;
  let selected=null,hint=null,message='',promotion=null;
  let focus=false,painted=null;
  let audioSequence=0;
  const motion=createLessonMotion({onFrame:frame=>playSound(frame.last,{eventId:'lesson-motion-'+(++audioSequence)}),paint:()=>render(),reduced:()=>matchMedia('(prefers-reduced-motion: reduce)').matches});
  const studyFor=id=>course.study?.(id)||{},activeLessons=()=>courseLessons(course,player.lesson.level);
  function getPlayer(lesson){
    const key=`${course.id}:${lesson.id}`;
    if(!players.has(key)){
      const value=new LessonPlayer({lesson,study:studyFor(lesson.id),storage,progressKey:course.key,lessonIds:lessons.map(item=>item.id),memory,courseId:course.id,orientation:{toSolver:course.orientToSolver,revision:course.orientationRevision||0}});
      players.set(key,value);
    }
    return players.get(key);
  }
  player=getPlayer(lessonEntry(course,{rememberedId:memory.lastFor(course.id),completed:progress.read()}));
  const layout=createLessonLayout({compact:matchMedia('(max-width:1020px)'),layout:document.querySelector('.course-layout'),sidebar:document.querySelector('.course-sidebar'),drawer:$('course-drawer'),drawerBody:$('course-drawer-body'),openButton:$('lesson-list-open'),closeButton:$('lesson-list-close'),outline:$('course-outline')});
  const dock=createLessonDock({footer:document.querySelector('.lesson-course-footer'),root:document.documentElement});
  const lessonViewport=createLessonViewport();
  const continuation=()=>{
    const lastLesson=lessons.indexOf(player.lesson)===lessons.length-1,next=lessonContinuation(player,{lastLesson,label:course.label});
    return lastLesson&&next.action==='next-lesson'&&coursePractice(course)?{...next,label:'Finish course →',help:'Optional practice or back to courses'}:next;
  };
  const focusBoard=()=>{
    ($('lesson-board').querySelector('[tabindex="0"]')||$('lesson-board')).focus({preventScroll:true});
    $('lesson-board').scrollIntoView({block:'nearest'});
  };
  const checkmateDialog=createLessonCheckmateDialog({dialog:$('lesson-checkmate-dialog'),title:$('lesson-checkmate-title'),description:$('lesson-checkmate-description'),continueButton:$('lesson-checkmate-continue'),exploreButton:$('lesson-checkmate-explore'),closeButton:$('lesson-checkmate-close'),
    read:()=>{
      if(document.body.dataset.layout!=='lesson')return null;
      if(motion.active)return {busy:true};
      const result=lessonCheckmate(player);if(!result)return null;
      const next=continuation();
      return {...result,key:`${course.id}:${player.lesson.id}:${player.activityIndex}:${player.exploring?'explore':player.reviewing?'review':'study'}:${result.fen}`,continueLabel:next.enabled?next.label:'Return to lesson'};
    },
    otherDialogOpen:()=>Boolean(document.querySelector('dialog[open]:not(#lesson-checkmate-dialog)')),
    beforeOpen:()=>{for(const menu of document.querySelectorAll('.compact-options[open]'))menu.open=false;},
    onContinue:()=>{if(player.exploring)player.stopExploring();clearTurn();if(continuation().enabled)continueLesson();else{render();focusStage();}},
    onExplore:()=>{exploreBeforeCheckmate(player);clearTurn();render();focusBoard();},focusBoard});
  function updateProgress(){renderLearningProgress({progress,activeLessons,course,player,memoryFor,studyFor});renderLearningCompanion({memory,courses:COURSES,storage});}
  function clearTurn(){motion.cancel();selected=null;hint=null;message='';promotion=null;}
  function focusStage(){
    $('lesson-stage-heading').focus({preventScroll:true});
    document.querySelector('.lesson-topline').scrollIntoView({block:'start'});
  }
  function changeStage(stage){if(player.setStage(stage)){clearTurn();render();focusStage();}}
  function selectLesson(id,updateUrl=true){
    const lesson=lessons.find(item=>item.id===id);if(!lesson)return;
    player.save();player=getPlayer(lesson);clearTurn();$('lesson-more').open=false;
    memory.remember(course.id,lesson.id);
    if(updateUrl)history.replaceState({},'',`${course.path}?lesson=${lesson.id}`);
    render();
  }
  function render(){
    const lesson=player.lesson,study=studyFor(lesson.id),session=player.exploration||motion.frame||player.session,activity=player.activity,exploring=Boolean(player.exploration);
    const visible=activeLessons(),index=visible.findIndex(item=>item.id===lesson.id),globalIndex=lessons.findIndex(item=>item.id===lesson.id);
    const stage=player.stage,practice=activity?.data.kind==='practice'&&!player.reviewing&&!exploring;
    document.body.dataset.lessonFocus=String(focus&&stage==='try');
    $('lesson-focus').hidden=stage!=='try';$('lesson-focus').textContent=focus?'Exit focus':'Focus';$('lesson-focus').setAttribute('aria-pressed',String(focus));
    $('lesson-board').setAttribute('aria-busy',String(motion.active));
    hint=exploring?null:player.currentHint;
    $('french-title').textContent=course.title;$('lesson-mobile-course').textContent=course.title;
    for(const link of document.querySelectorAll('.lesson-player a[data-route="learn"]'))link.dataset.learnCategoryLink=course.category;
    $('lesson-title').textContent=study.title||lesson.title;
    $('lesson-page-position').textContent=`${course.label} ${index+1} / ${visible.length}`;
    $('lesson-stage-heading').textContent=`${stageNames[stage]}: ${study.title||lesson.title}`;
    const activeStage=document.activeElement?.closest('[data-lesson-stage]')?.dataset.lessonStage;
    $('lesson-stages').innerHTML=player.plan.stages.map((value,i)=>`<button type="button" data-lesson-stage="${value}" aria-pressed="${value===stage}" aria-controls="lesson-stage-panel" ${value==='check'&&!player.checkUnlocked?'disabled':''}><span aria-hidden="true">${player.stageComplete(value)?'✓':i+1}</span> ${stageNames[value]}</button>`).join('');
    if(activeStage)$('lesson-stages').querySelector(`[data-lesson-stage="${activeStage}"]`)?.focus({preventScroll:true});
    for(const value of ['learn','try','check'])$('lesson-'+value).hidden=value!==stage;
    squarePractice.update({lesson,progressKey:course.key,stage,conceptIndex:player.conceptIndex});
    guidedExample.update({lesson,progressKey:course.key,stage,conceptIndex:player.conceptIndex});
    $('lesson-instruction').hidden=stage!=='try';
    $('lesson-mode-status').hidden=stage!=='try';
    if(activity){
      const guidance=lessonGuidance(player,{session,busy:motion.active});
      $('lesson-instruction').textContent=guidance.instruction;
      $('lesson-mode-status').textContent=guidance.status;
      $('lesson-mode-status').dataset.mode=guidance.mode;
      $('lesson-counter').textContent=`${session.completed?'Exercise complete':`${new Chess(session.fen).turn()==='w'?'White':'Black'} to move`}${player.activities.length>1?` · Exercise ${player.activityIndex+1} / ${player.activities.length}`:''}`;
      $('lesson-counter').hidden=player.activities.length<2;
      $('lesson-promotion').hidden=!promotion;
      $('lesson-hint').hidden=player.challengeMode||exploring||session.completed||!practice;
      $('lesson-explore-toggle').hidden=!exploring&&!(session.mode==='practice'&&session.completed);
      $('lesson-explore-toggle').textContent=exploring?'Back to lesson':'Explore';$('lesson-explore-toggle').setAttribute('aria-label',exploring?'Return to study position':'Start free play from the current position');
      $('lesson-explore-toggle').disabled=motion.active;
      $('lesson-explore-start').hidden=exploring||player.challengeMode||session.completed;
      $('lesson-explore-resume').hidden=exploring||player.challengeMode||!player.resumableExploration;
      $('lesson-hint').disabled=motion.active||!practice||session.completed||hint?.level===3;
      $('lesson-hint').textContent=hint?.level===1?'Show piece':hint?.level===2?'Reveal move':hint?.level===3?'Revealed':'Hint';
      $('lesson-hint').setAttribute('aria-label',hint?.level===1?'Show the piece':hint?.level===2?'Reveal the study move':hint?.level===3?'Study move revealed':'Get a hint');
      $('lesson-controls').dataset.practice=String(session.mode==='practice'||exploring);
      $('lesson-undo').hidden=session.mode!=='practice'&&!exploring;$('lesson-undo').disabled=!(exploring?session.canUndo:player.session.canUndo)||motion.active;
      $('lesson-undo').setAttribute('aria-label',exploring?'Undo exploration move':'Undo last practice move');
      $('lesson-replay').hidden=activity.data.kind!=='practice'||player.challengeMode;$('lesson-replay').textContent=player.reviewing?'Resume practice':'Review line';$('lesson-replay').setAttribute('aria-pressed',String(player.reviewing));
      $('lesson-challenge').hidden=activity.data.kind!=='practice'||!activity.done&&!player.storedComplete&&!player.challengeMode;
      $('lesson-challenge').textContent=player.challengeMode?'Back to lesson':'Practice without hints';
      $('lesson-previous').disabled=practice||session.cursor===0;$('lesson-next').disabled=practice||session.cursor===session.lesson.moves.length;
      $('lesson-reset').setAttribute('aria-label',practice?'Restart this exercise':'Restart study line');
      $('lesson-reset').textContent=exploring?'Reset free play':practice?'Restart exercise':'Restart review';
      if(exploring)$('lesson-reset').setAttribute('aria-label','Reset exploration to study position');
      $('lesson-feedback').textContent=message||hint?.text||(practice?(session.completed?`Well played.${session.hints?` ${session.hints} hint${session.hints===1?'':'s'} used.`:''}`:'Select a piece, then a highlighted destination.'):'Use the arrows or a move in the line to review.');
      $('lesson-feedback').hidden=!message&&!hint;
      if(exploring){$('lesson-feedback').textContent=message||(session.ending?`${session.ending}. Use Undo to try a different line.`:'');$('lesson-feedback').hidden=!message&&!session.ending;}
      $('lesson-current-note').hidden=true;$('lesson-current-note').textContent=session.note;
      $('lesson-current-move').textContent=session.last?`${session.last.before.split(' ')[5]}${session.last.color==='w'?'.':'…'} ${session.last.san}`:'Start';
      $('lesson-activities').hidden=player.activities.length<2;
      const focusedActivity=document.activeElement?.closest('[data-lesson-activity]')?.dataset.lessonActivity;
      $('lesson-activities').innerHTML=player.activities.map((item,i)=>`<button data-lesson-activity="${i}" aria-pressed="${i===player.activityIndex}">${item.done?'✓ ':''}Exercise ${i+1}</button>`).join('');
      if(focusedActivity)$('lesson-activities').querySelector(`[data-lesson-activity="${focusedActivity}"]`)?.focus({preventScroll:true});
      $('lesson-demonstration-done').hidden=activity.data.kind!=='demonstration'||activity.done||Boolean(session.lesson.moves.length&&activity.data.completion!=='acknowledge');
      if(stage==='try')renderBoard();
    }
    const currentConcept=player.plan.concepts[player.conceptIndex];
    const squareWarmup=Boolean(lesson.squarePractice&&stage==='learn'&&player.conceptIndex===0);
    for(const id of ['lesson-concept-position','lesson-concept-title','lesson-concept-text'])$(id).hidden=squareWarmup;
    if(currentConcept){
      $('lesson-concept-position').textContent=`Idea ${player.conceptIndex+1} of ${player.plan.concepts.length}`;
      $('lesson-concept-title').textContent=currentConcept.title||study.coach||'Learn the idea';$('lesson-concept-text').textContent=currentConcept.text||'';
      $('lesson-concept-previous').hidden=player.conceptIndex===0;
      $('lesson-learn-next').textContent=player.conceptIndex<player.plan.concepts.length-1?'Next idea →':player.plan.stages.includes('try')?'Try on the board →':player.plan.stages.includes('check')?'Check understanding →':player.learned?'Reviewed ✓':'Finish reading ✓';
    }
    const q=player.question;
    if(q){
      const answer=player.answers[player.questionIndex],passed=answer===q.answer;
      $('lesson-question-position').textContent=`Question ${player.questionIndex+1} of ${player.plan.questions.length}`;$('lesson-question').textContent=q.question;
      const focusedAnswer=document.activeElement?.closest('[data-lesson-answer]')?.dataset.lessonAnswer;
      $('lesson-answers').innerHTML=q.options.map((option,i)=>`<button data-lesson-answer="${i}" aria-pressed="${answer===i}" ${passed?'disabled':''} data-state="${answer===i?(passed?'correct':'retry'):''}">${String.fromCharCode(65+i)}. ${escape(option)}</button>`).join('');
      $('lesson-check-feedback').textContent=answer===undefined||answer===null?'':`${passed?'Correct.':'Not quite. Try again.'} ${q.explanation||''}`;
      $('lesson-question').tabIndex=-1;
      if(focusedAnswer&&!passed)$('lesson-answers').querySelector(`[data-lesson-answer="${focusedAnswer}"]`)?.focus({preventScroll:true});
      else if(focusedAnswer&&passed)$('lesson-question').focus({preventScroll:true});
      $('lesson-question-previous').hidden=player.questionIndex===0;$('lesson-question-next').hidden=player.questionIndex===player.plan.questions.length-1;$('lesson-question-next').disabled=q.required&&!passed;
    }
    const detailConcepts=player.plan.concepts.filter((_,i)=>squareWarmup||stage!=='learn'||i!==player.conceptIndex),rules=lesson.guide?.rules||[];
    const present=new Set([...player.plan.concepts.map(item=>item.text),...rules]);
    const goals=(study.goals||[]).filter(goal=>{if(present.has(goal))return false;present.add(goal);return true;});
    $('lesson-more-content').innerHTML=detailConcepts.map(item=>`<p>${escape(item.text)}</p>`).join('')+
      (rules.length?`<h3>Keep in mind</h3><ul>${rules.map(rule=>`<li>${escape(rule)}</li>`).join('')}</ul>`:'')+
      (goals.length?`<h3>What you’ll learn</h3><ul>${goals.map(goal=>`<li>${escape(goal)}</li>`).join('')}</ul>`:'')+
      (session?`<p>${escape(practice&&!session.completed?session.lesson.notes[session.cursor]:session.note)}</p>`:'')+
      (course.method?`<h3>Calculation routine</h3><ol>${course.method.map(step=>`<li>${escape(step)}</li>`).join('')}</ol>`:'')+
      (lesson.takeaway&&!present.has(lesson.takeaway)?`<p>${escape(lesson.takeaway)}</p>`:'')+
      `<details><summary>Source &amp; study line</summary><p>${escape(lesson.source||'')} ${escape(course.reference||'')}</p>${activity?'<p>Practice follows one selected legal continuation. Other good moves exist; a different legal move is not automatically a mistake.</p>':''}</details>`;
    $('lesson-analyze').hidden=!session;$('lesson-analyze').disabled=!session||session.cursor===0;
    $('lesson-more').hidden=player.challengeMode&&stage==='try';
    $('lesson-recap').hidden=!player.complete||stage==='learn'||player.challengeMode;
    $('lesson-recap-text').textContent=lesson.takeaway||study.goals?.[0]||player.plan.concepts[0]?.text||'Keep this idea in mind when you play.';
    const practiceActivities=player.activities.filter(item=>item.data.kind==='practice'),movesPlayed=practiceActivities.reduce((sum,item)=>sum+item.session.correct,0),hintsUsed=practiceActivities.reduce((sum,item)=>sum+item.session.hints,0),retries=practiceActivities.reduce((sum,item)=>sum+item.mistakes,0);
    $('lesson-recap-stats').parentElement.hidden=!practiceActivities.length;
    $('lesson-recap-stats').textContent=`This visit’s practice: ${movesPlayed} correct move${movesPlayed===1?'':'s'}, ${hintsUsed} hint step${hintsUsed===1?'':'s'}, ${retries} other attempt${retries===1?'':'s'}. Your earned lesson completion is saved.`;
    const next=continuation();
    $('lesson-course-previous').disabled=globalIndex===0;$('lesson-course-next').disabled=!next.enabled||motion.active;
    $('lesson-course-next').textContent=next.label;$('lesson-next-help').textContent=next.help;
    $('lesson-after-board').hidden=stage!=='try'||!next.enabled||!['next-lesson','question','activity','stage'].includes(next.action);
    $('lesson-after-board').textContent=next.label;
    $('lesson-course-practice').hidden=!player.complete||globalIndex!==lessons.length-1||!coursePractice(course);
    dock.measure();
    lessonViewport.arrange(stage);
    updateProgress();
    checkmateDialog.sync();
  }
  function renderBoard(){
    const session=player.exploration||motion.frame||player.session,chess=new Chess(session.fen),practice=session.mode==='practice'&&!session.completed,interactive=player.exploring||session.mode==='practice';
    const files=player.flipped?'hgfedcba':'abcdefgh',ranks=player.flipped?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];
    const targets=new Set(selected?chess.moves({square:selected,verbose:true}).map(move=>move.to):[]),focusSquare=document.activeElement?.closest('#lesson-board [data-square]')?.dataset.square;
    let html='';
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){
      const square=files[f]+ranks[r],piece=chess.get(square),dark=(files.charCodeAt(f)-97+ranks[r])%2===1,last=session.last&&[session.last.from,session.last.to].includes(square);
      const label=`${square}: ${piece?`${piece.color==='w'?'White':'Black'} ${names[piece.type]}`:'empty'}${targets.has(square)?'. Legal destination':''}`,tag=interactive?'button':'div';
      html+=`<${tag} class="square${dark?' dark':''}${last?' last':''}${selected===square?' lesson-selected':''}${targets.has(square)?' lesson-target':''}${hint&&[hint.from,hint.to].includes(square)?' lesson-hint-square':''}" data-square="${square}" ${tag==='button'?`type="button" tabindex="${square===(focusSquare||selected||files[0]+ranks[7])?0:-1}"`:''} aria-label="${escape(label)}">${f===0?`<span class="rank" aria-hidden="true">${ranks[r]}</span>`:''}${r===7?`<span class="file" aria-hidden="true">${files[f]}</span>`:''}${piece?pieceSvg(piece):''}</${tag}>`;
    }
    $('lesson-board').innerHTML=html;finishBoard($('lesson-board'),chess,selected);$('lesson-board').setAttribute('aria-label',`${player.lesson.title}. ${chess.turn()==='w'?'White':'Black'} to move. ${player.flipped?'Black':'White'} view. ${session.fen}`);
    const nextPaint={game:player.exploration||player.session,fen:session.fen,last:session.last,flipped:player.flipped};
    animatePieces($('lesson-board'),moveTransitions(painted,nextPaint));painted=nextPaint;
    $('lesson-counter').tabIndex=-1;
    if(focusSquare){const tile=$('lesson-board').querySelector(`[data-square="${focusSquare}"]`);if(tile?.tagName==='BUTTON')tile.focus({preventScroll:true});else $('lesson-counter').focus({preventScroll:true});}
    const focusedPly=document.activeElement?.closest('[data-lesson-ply]')?.dataset.lessonPly;
    $('lesson-moves').innerHTML=(player.exploration?.moves||session.lesson.verboseMoves).map((move,i)=>`<button data-lesson-ply="${i+1}" ${session.mode!=='watch'?'disabled':''} aria-current="${i+1===session.cursor?'step':'false'}" aria-label="${practice&&i>=session.cursor?'Unplayed study move':`Go to ${move.before.split(' ')[5]}${move.color==='w'?'.':'…'} ${move.san}`}">${practice&&i>=session.cursor?'···':`${move.color==='w'?move.before.split(' ')[5]+'. ':''}${escape(move.san)}`}</button>`).join('');
    if(focusedPly)$('lesson-moves').querySelector(`[data-lesson-ply="${focusedPly}"]`)?.focus({preventScroll:true});
  }
  $('lesson-stages').onclick=event=>{const stage=event.target.closest('[data-lesson-stage]')?.dataset.lessonStage;if(stage)changeStage(stage);};
  $('lesson-squares-open').onclick=()=>{player.conceptIndex=0;if(player.setStage('learn')){clearTurn();render();$('lesson-square-prompt').tabIndex=-1;$('lesson-square-prompt').focus({preventScroll:true});$('lesson-square-practice').scrollIntoView({block:'nearest'});}};
  $('lesson-learn-next').onclick=()=>{player.learnNext();clearTurn();render();focusStage();};
  $('lesson-concept-previous').onclick=()=>{player.conceptIndex=Math.max(0,player.conceptIndex-1);player.save();render();focusStage();};
  $('lesson-activities').onclick=event=>{const item=event.target.closest('[data-lesson-activity]');if(item){player.selectActivity(Number(item.dataset.lessonActivity));clearTurn();render();focusStage();}};
  function continueLesson(){
    const next=continuation();if(!next.enabled)return;
    if(player.exploring)player.stopExploring();
    if(next.action==='next-lesson'){
      if(!player.complete)return;const i=lessons.indexOf(player.lesson);
      if(i===lessons.length-1){motion.cancel();showCoursePractice();return;}
      selectLesson(lessons[i+1].id);focusStage();return;
    }
    if(next.action==='learn-next')player.learnNext();
    else if(next.action==='stage')player.setStage(next.stage);
    else if(next.action==='question'){player.questionIndex=next.index;player.setStage('check');}
    else if(next.action==='activity'){player.selectActivity(next.index);player.setStage('try');}
    else if(next.action==='resume-practice'){player.reviewing=false;player.save();}
    else if(next.action==='end-exploration')player.stopExploring();
    else if(next.action==='demonstration-done')player.acknowledgeDemonstration();
    else if(next.action==='next-study-move'){jumpStudy(player.session.cursor+1);return;}
    else if(next.action==='end-challenge'){player.endChallenge();history.replaceState({},'',`${course.path}?lesson=${encodeURIComponent(player.lesson.id)}`);}
    clearTurn();render();focusStage();
  }
  $('lesson-after-board').onclick=continueLesson;
  $('lesson-demonstration-done').onclick=()=>{player.acknowledgeDemonstration();render();};
  $('lesson-answers').onclick=event=>{const item=event.target.closest('[data-lesson-answer]');if(item){const answer=Number(item.dataset.lessonAnswer);player.answer(answer);render();if(answer!==player.question.answer)feedbackSound('incorrect');else if(player.complete)feedbackSound('complete');}};
  for(const [id,delta] of [['lesson-question-previous',-1],['lesson-question-next',1]])$(id).onclick=()=>{player.questionIndex=Math.max(0,Math.min(player.plan.questions.length-1,player.questionIndex+delta));player.save();render();focusStage();};
  $('course-lessons').onclick=event=>{const item=event.target.closest('[data-lesson]');if(item){selectLesson(item.dataset.lesson);layout.close();$('lesson-title').focus({preventScroll:true});document.querySelector('.lesson-page-heading').scrollIntoView({block:'start'});}};
  $('lesson-reset').onclick=()=>{player.reset();clearTurn();render();};
  $('lesson-undo').onclick=()=>{const exploring=player.exploring;clearTurn();if(player.undo())message=exploring?'Move taken back. Try another continuation.':'Back to your previous decision. Your earned completion is saved.';render();};
  function toggleExploration(){
    clearTurn();if(player.exploring)player.stopExploring();else player.startExploring({fresh:true});render();
    if($('lesson-explore-toggle').hidden)focusBoard();else $('lesson-explore-toggle').focus({preventScroll:true});
  }
  $('lesson-explore-toggle').onclick=toggleExploration;$('lesson-explore-start').onclick=toggleExploration;
  $('lesson-explore-resume').onclick=()=>{clearTurn();if(player.resumeExploration()){render();focusBoard();}};
  $('lesson-focus').onclick=()=>{focus=!focus;render();$('lesson-focus').focus({preventScroll:true});document.querySelector('.lesson-topline').scrollIntoView({block:'start'});};
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&focus&&!document.querySelector('dialog[open]')){focus=false;render();$('lesson-focus').focus({preventScroll:true});}});
  function jumpStudy(cursor){
    const session=player.session,previous=session.cursor;player.jump(cursor);clearTurn();render();
    playSound(navigationSoundMove(session.lesson.verboseMoves,previous,session.cursor),{eventId:'lesson-navigation-'+(++audioSequence)});
  }
  $('lesson-previous').onclick=()=>jumpStudy(player.session.cursor-1);$('lesson-next').onclick=()=>jumpStudy(player.session.cursor+1);
  $('lesson-replay').onclick=()=>{player.stopExploring();player.reviewing=!player.reviewing;player.save();clearTurn();render();};
  $('lesson-flip').onclick=()=>{motion.cancel();player.flipped=!player.flipped;player.save();render();};
  $('lesson-hint').onclick=()=>{hint=player.requestHint();message=hint?.text||'';render();if(hint)$('lesson-feedback').scrollIntoView({block:'nearest'});};
  $('lesson-challenge').onclick=()=>{
    if(player.challengeMode){player.endChallenge();history.replaceState({},'',`${course.path}?lesson=${encodeURIComponent(player.lesson.id)}`);}
    else player.startChallenge();
    clearTurn();$('lesson-more').open=false;render();focusStage();
  };
  $('lesson-course-previous').onclick=()=>{const i=lessons.indexOf(player.lesson);if(i>0){selectLesson(lessons[i-1].id);focusStage();}};
  $('lesson-course-next').onclick=continueLesson;
  $('lesson-moves').onclick=event=>{const item=event.target.closest('[data-lesson-ply]');if(item)jumpStudy(Number(item.dataset.lessonPly));};
  $('lesson-analyze').onclick=()=>{const session=player.exploration||player.session;if(session?.cursor)onAnalyze(session.pgn());};
  function attemptMove(from,to,promote){
    if(motion.active)return;
    const active=player.exploration||player.session;
    if(active&&!promote&&new Chess(active.fen).moves({square:from,verbose:true}).some(move=>move.to===to&&move.promotion)){
      promotion={from,to};message='Choose the promotion piece.';render();$('lesson-promotion').querySelector('button').focus();return;
    }
    if(player.exploration){
      const fen=player.exploration.fen,result=player.exploreMove(from,to,promote);clearTurn();
      message=result.status==='played'?`${result.move.san} played. ${player.exploration.ending||`${player.exploration.chess.turn()==='w'?'White':'Black'} to move.`}`:result.status==='finished'?`${result.ending}. Undo to try another continuation.`:illegalMoveReason(fen,from,to,promote);
      render();if(result.status==='played')playSound(result.move);return;
    }
    const session=player.session,cursor=session.cursor,fen=session.fen;
    const result=player.attempt(from,to,promote);
    if(result.status==='correct'){clearTurn();message=`${result.move.san} fits this study line.${result.completed?' Exercise complete.':''}`;motion.play(lessonFrames(session,cursor));return;}
    else{promotion=null;message=result.status==='different'?result.feedback:illegalMoveReason(fen,from,to,promote);}
    render();if(['different','illegal'].includes(result.status))feedbackSound('incorrect');
  }
  enableBoardDrag($('lesson-board'),{
    read:()=>{const session=player.exploration||player.session;return {chess:session?new Chess(session.fen):null,disabled:motion.active||!session||session.mode==='watch'||Boolean(promotion)};},
    select:from=>{if(!player.exploring&&player.session.completed)player.startExploring({fresh:true});selected=from;render();},play:attemptMove
  });
  $('lesson-board').onclick=event=>{
    let session=player.exploration||player.session;if(motion.active||!session||session.mode==='watch'||promotion)return;
    const square=event.target.closest('[data-square]')?.dataset.square;if(!square)return;
    if(!player.exploring&&session.completed){player.startExploring({fresh:true});session=player.exploration;}
    if(player.exploration?.ending){message=`${session.ending}. Undo a move to explore another continuation.`;render();return;}
    const chess=new Chess(session.fen),piece=chess.get(square);
    const color=player.exploring?chess.turn():session.lesson.practiceColor;
    if(selected&&square!==selected&&piece?.color!==color){
      if(chess.moves({square:selected,verbose:true}).some(move=>move.to===square&&move.promotion)){promotion={from:selected,to:square};message='Choose the promotion piece.';render();$('lesson-promotion').querySelector('button').focus();return;}
      attemptMove(selected,square);
    }else{selected=piece?.color===color?(selected===square?null:square):null;message='';render();}
  };
  for(const button of document.querySelectorAll('[data-lesson-promotion]'))button.onclick=()=>{if(promotion){const target=promotion.to;attemptMove(promotion.from,target,button.dataset.lessonPromotion);const square=$('lesson-board').querySelector(`button[data-square="${target}"]`);(square||$('lesson-counter')).focus({preventScroll:true});}};
  $('lesson-promotion-cancel').onclick=()=>{const from=promotion?.from;promotion=null;selected=null;message='Promotion cancelled. Choose another move.';render();$('lesson-board').querySelector(`button[data-square="${from}"]`)?.focus({preventScroll:true});};
  for(const button of document.querySelectorAll('[data-course-level]'))button.onclick=()=>{const visible=courseLessons(course,button.dataset.courseLevel),done=progress.read();if(visible.length){selectLesson((visible.find(lesson=>!done.includes(lesson.id))||visible[0]).id);focusStage();}};
  $('lesson-board').addEventListener('keydown',event=>{
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[event.key];if(!delta)return;
    const tiles=[...$('lesson-board').querySelectorAll('button[data-square]')],index=tiles.indexOf(event.target);if(index<0)return;event.preventDefault();
    if(event.key==='ArrowLeft'&&index%8===0||event.key==='ArrowRight'&&index%8===7)return;
    const next=tiles[index+delta];if(next){tiles.forEach(tile=>tile.tabIndex=tile===next?0:-1);next.focus({preventScroll:true});}
  });
  function showCoursePractice(){
    const practice=coursePractice(course);
    if(!practice){onCourseComplete?.(course.id);return;}
    $('lesson-course-practice-title').textContent=practice.title;$('lesson-course-practice-goal').textContent=practice.goal;
    $('lesson-course-practice-dialog').showModal();
  }
  $('lesson-course-practice').onclick=showCoursePractice;
  $('lesson-course-practice-close').onclick=()=>$('lesson-course-practice-dialog').close();
  $('lesson-course-practice-start').onclick=()=>{const practice=coursePractice(course);$('lesson-course-practice-dialog').close();if(practice)onCoursePractice?.(practice);};
  $('lesson-course-practice-skip').onclick=()=>{$('lesson-course-practice-dialog').close();onCourseComplete?.(course.id);};
  render();return {open(courseId='french'){
    motion.cancel();
    const requested=COURSES[courseId]||COURSES.french,query=new URLSearchParams(location.search),id=query.get('lesson');
    player.save();
    if(course.id!==requested.id){course=requested;lessons=course.lessons;progress=memoryFor(course);focus=false;}
    player=getPlayer(lessonEntry(course,{requestedId:id,rememberedId:memory.lastFor(course.id),completed:progress.read()}));
    if(query.get('practice')==='squares'&&player.lesson.squarePractice){player.conceptIndex=0;player.setStage('learn');}
    clearTurn();query.set('lesson',player.lesson.id);history.replaceState({},'',`${course.path}?${query}`);render();
    const review=query.get('review'),rawIndex=query.get('exercise'),index=rawIndex!==null&&/^\d+$/.test(rawIndex)?Number(rawIndex):-1,source=`${review}:${index}`;
    if(player.reviewSource!==source&&((review==='practice'&&player.activities[index]?.data.kind==='practice')||(review==='question'&&player.plan.questions[index]))){
      const opened=review==='practice'?player.startChallenge(index):player.reviewQuestion(index);
      if(opened){player.reviewSource=source;player.save();clearTurn();render();}
    }
    memory.remember(course.id,player.lesson.id);
  },refresh:updateProgress};
}
