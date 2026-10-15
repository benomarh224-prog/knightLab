import { Chess } from 'chess.js';
import { pieceSvg } from './pieces.js';
import { COURSES,courseLessons } from './courses.js';
import { OpeningLesson,createCourseProgress } from './opening-course.js';

const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};

export function createLearningUI({storage,onAnalyze,onCourseComplete}){
  const memoryFor=course=>createCourseProgress(storage,course.lessons.map(lesson=>lesson.id),course.key);
  let course=COURSES.french,lessons=course.lessons,progress=memoryFor(course);
  const activeLessons=()=>courseLessons(course,session.lesson.level);
  const studyFor=id=>course.study(id);
  let session=new OpeningLesson(lessons[0]),selected=null,hint=null,flipped=false,message='',explanationOpen=false,idea=null,promotion=null;
  session.practice({startPly:studyFor(session.lesson.id).start});
  const compact=matchMedia('(max-width:1020px)');
  function arrange(){ $('course-outline').open=!compact.matches;$('lesson-thinking').open=!compact.matches; }
  arrange();compact.addEventListener('change',arrange);
  function updateProgress(){
    const completed=progress.read(),visible=activeLessons(),inLevel=visible.filter(lesson=>completed.includes(lesson.id)).length;
    const focusedLesson=document.activeElement?.closest('#course-lessons [data-lesson]')?.dataset.lesson;
    $('course-progress-label').textContent=`${inLevel} of ${visible.length} ${course.id==='tactics'?'exercises':'lessons'} practiced`;
    $('course-progress-fill').style.width=`${inLevel/visible.length*100}%`;
    const frenchDone=memoryFor(COURSES.french).read(),tacticsDone=memoryFor(COURSES.tactics).read();
    $('learn-progress-label').textContent=frenchDone.length?`${frenchDone.length} of 8 lessons practiced`:'8 focused lessons · Interactive practice';
    $('tactics-progress-label').textContent=`${tacticsDone.length} of ${COURSES.tactics.lessons.length} exercises practiced`;
    $('home-tactics-progress').textContent=`144 exercises · 3 levels${tacticsDone.length?' · '+tacticsDone.length+' practiced':''}`;
    $('home-course-progress').textContent=`French Defense · ${frenchDone.length} of 8 lessons practiced`;
    $('home-course-progress-fill').style.width=`${frenchDone.length/8*100}%`;
    $('home-course-progressbar').setAttribute('aria-valuenow',String(frenchDone.length));
    const pathNodes=document.querySelectorAll('.academy-milestones .milestone-node');
    pathNodes[0]?.classList.toggle('active',frenchDone.length===0);pathNodes[1]?.classList.toggle('active',frenchDone.length>0);
    if(pathNodes[0])pathNodes[0].textContent=frenchDone.includes('foundations')?'✓':'01';
    $('course-levels').hidden=course.id!=='tactics';
    for(const button of document.querySelectorAll('[data-course-level]'))button.setAttribute('aria-pressed',String(button.dataset.courseLevel===session.lesson.level));
    $('course-lessons').innerHTML=visible.map((lesson,index)=>{
      const active=lesson.id===session.lesson.id,done=completed.includes(lesson.id);
      return `<button data-lesson="${lesson.id}" aria-current="${active?'step':'false'}" class="${done?'is-practiced':''}" aria-label="${course.label} ${index+1}: ${escape(studyFor(lesson.id).title)}${done?'. Practiced':''}"><span class="lesson-status" aria-hidden="true">${done?'✓':active?'▶':'○'}</span><span class="lesson-number">${String(index+1).padStart(2,'0')}</span><span class="lesson-list-name"><strong>${escape(studyFor(lesson.id).title.replace(/\.$/,''))}</strong><small>${escape(lesson.title)}</small></span></button>`;
    }).join('');
    if(focusedLesson)$('course-lessons').querySelector(`[data-lesson="${focusedLesson}"]`)?.focus({preventScroll:true});
  }
  function render(){
    const {lesson,mode,cursor,completed}=session,chess=new Chess(session.fen),practice=mode==='practice',study=studyFor(lesson.id);
    const visible=activeLessons(),index=visible.findIndex(item=>item.id===lesson.id),globalIndex=lessons.findIndex(item=>item.id===lesson.id),expected=session.expected,side=lesson.practiceColor==='w'?'White':'Black';
    $('french-title').textContent=course.title;
    $('tactics-method').hidden=course.id!=='tactics';
    $('course-breadcrumb').textContent=course.title;$('course-breadcrumb').href=course.path;$('course-breadcrumb').dataset.route=course.id;
    $('lesson-page-progressbar').setAttribute('aria-valuemax',String(visible.length));
    $('lesson-promotion').hidden=!promotion;
    $('lesson-course-previous-label').textContent=`Previous ${course.label.toLowerCase()}`;
    $('lesson-title').textContent=study.title;$('lesson-category').textContent=lesson.tag;$('lesson-objective').textContent=lesson.subtitle;
    $('lesson-breadcrumb').textContent=`${course.label} ${String(index+1).padStart(2,'0')}`;
    $('lesson-page-position').textContent=`${course.label} ${index+1} of ${visible.length}`;
    $('lesson-page-progress-fill').style.width=`${(index+1)/visible.length*100}%`;
    $('lesson-page-progressbar').setAttribute('aria-valuenow',String(index+1));
    $('lesson-note').textContent=practice?(completed?lesson.takeaway:cursor===study.start?study.prompt:`${session.note} Find ${side}’s next move in this study line.`):(cursor?session.note:lesson.subtitle);
    $('lesson-note-title').textContent=practice?(completed?'Well played.':cursor===study.start?study.coach:course.idea(expected)==='check'?'Find the forcing check.':course.idea(expected)==='capture'?'Find the capture.':course.idea(expected)==='pawn'?'Find the pawn idea.':'Find the piece move.'):(cursor?`${session.last.color==='w'?'White':'Black'} played ${session.last.san}.`:'Learn the idea.');
    const total=lesson.verboseMoves.slice(session.practiceStart||0).filter(move=>move.color===lesson.practiceColor).length;
    $('lesson-counter').textContent=practice?(completed?'Complete':session.correct?`${session.correct}/${total} solved`:`${side} to play`):`${cursor}/${lesson.moves.length}`;
    $('lesson-turn').textContent=completed?'Exercise complete':`${chess.turn()==='w'?'White':'Black'} to move`;
    $('lesson-view').textContent=`${practice?'Practice':'Study'} board${flipped?' · Black view':''}`;
    $('lesson-turn-instruction').textContent=practice?(completed?'Well played. Take this idea into your next game.':`Your turn: ${study.title.charAt(0).toLowerCase()+study.title.slice(1)}`):'Learn the line, then try the idea yourself.';
    $('lesson-watch').setAttribute('aria-pressed',String(!practice&&!explanationOpen));$('lesson-practice').setAttribute('aria-pressed',String(practice&&!explanationOpen));$('lesson-understand').setAttribute('aria-pressed',String(explanationOpen));
    $('lesson-analyze').disabled=cursor===0;$('lesson-previous').disabled=practice||cursor===0;$('lesson-next').disabled=practice||cursor===lesson.moves.length;$('lesson-hint').disabled=!practice||completed;
    $('lesson-feedback').textContent=message||(!practice?'Follow the moves, then choose Try.':completed?`Exercise complete${session.hints?` · ${session.hints} hint${session.hints===1?'':'s'} used`:''}.`:'Try the move on the board first.');
    $('lesson-feedback').dataset.state=completed?'complete':'';
    $('lesson-goal-one').textContent=study.goals[0];$('lesson-goal-two').textContent=study.goals[1];$('lesson-takeaway').textContent=lesson.takeaway;
    $('lesson-source').textContent=`Reference: ${lesson.source}. ${course.reference}`;
    $('lesson-explanation').hidden=!explanationOpen;
    $('lesson-explanation-text').textContent=practice&&!completed?lesson.notes[cursor]:cursor?session.note:lesson.takeaway;
    $('lesson-explain').textContent=explanationOpen?'Hide explanation':'Show explanation';$('lesson-explain').setAttribute('aria-expanded',String(explanationOpen));
    for(const option of document.querySelectorAll('[data-lesson-idea]')){option.hidden=option.dataset.lessonIdea==='check'&&course.id!=='tactics';option.disabled=!practice||completed;option.setAttribute('aria-pressed',String(option.dataset.lessonIdea===idea));}
    $('lesson-idea-feedback').hidden=!idea;
    $('lesson-idea-feedback').textContent=idea===course.idea(expected)?'That matches this study line. Now try it on the board.':'Think about the coach’s prompt. This exercise follows a different idea.';
    const canContinue=completed||progress.read().includes(lesson.id);
    $('lesson-course-next').disabled=!canContinue;$('lesson-next-lock').hidden=canContinue;
    $('lesson-course-next-label').textContent=globalIndex===lessons.length-1?'Back to course':`Next ${course.label.toLowerCase()}`;$('lesson-next-help').textContent=canContinue?'Ready when you are':'Complete the exercise to continue';$('lesson-course-previous').disabled=globalIndex===0;
    const files=flipped?'hgfedcba':'abcdefgh',ranks=flipped?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];
    const targets=new Set(selected?chess.moves({square:selected,verbose:true}).map(move=>move.to):[]),focusSquare=document.activeElement?.closest('#lesson-board [data-square]')?.dataset.square;
    let html='';
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){
      const square=files[f]+ranks[r],piece=chess.get(square),dark=(files.charCodeAt(f)-97+ranks[r])%2===1,last=session.last&&[session.last.from,session.last.to].includes(square);
      const label=`${square}: ${piece?`${piece.color==='w'?'White':'Black'} ${names[piece.type]}`:'empty'}${targets.has(square)?'. Legal destination':''}`,tag=practice&&!completed?'button':'div';
      html+=`<${tag} class="square${dark?' dark':''}${last?' last':''}${selected===square?' lesson-selected':''}${targets.has(square)?' lesson-target':''}${hint&&[hint.from,hint.to].includes(square)?' lesson-hint-square':''}" data-square="${square}" ${tag==='button'?`type="button" tabindex="${square===(focusSquare||selected||files[0]+ranks[7])?0:-1}"`:''} aria-label="${escape(label)}">${f===0?`<span class="rank" aria-hidden="true">${ranks[r]}</span>`:''}${r===7?`<span class="file" aria-hidden="true">${files[f]}</span>`:''}${piece?pieceSvg(piece):''}</${tag}>`;
    }
    $('lesson-board').innerHTML=html;$('lesson-board').setAttribute('aria-label',`${lesson.title}. ${practice&&!completed?side+' to move.':'Study position.'} ${flipped?'Black':'White'} view. ${session.fen}`);
    if(focusSquare)$('lesson-board').querySelector(`[data-square="${focusSquare}"]`)?.focus({preventScroll:true});
    $('lesson-moves').innerHTML=lesson.verboseMoves.map((move,i)=>`<button data-lesson-ply="${i+1}" ${practice?'disabled':''} aria-current="${i+1===cursor?'step':'false'}" aria-label="${practice&&i>=cursor?'Unplayed study move':`Go to ${move.before.split(' ')[5]}${move.color==='w'?'.':'…'} ${move.san}`}">${practice&&i>=cursor?'···':`${move.color==='w'?move.before.split(' ')[5]+'. ':''}${escape(move.san)}`}</button>`).join('');
    const active=$('lesson-moves').querySelector('[aria-current="step"]');if(active)$('lesson-moves').scrollLeft=active.offsetLeft-$('lesson-moves').clientWidth/2;
    updateProgress();
  }
  function clearTurn(){selected=null;hint=null;message='';explanationOpen=false;idea=null;promotion=null;}
  function resetPractice(){session.practice({startPly:studyFor(session.lesson.id).start});clearTurn();}
  function selectLesson(id,updateUrl=true){
    const lesson=lessons.find(item=>item.id===id);if(!lesson)return;
    session=new OpeningLesson(lesson);flipped=course.orientToSolver&&lesson.practiceColor==='b';resetPractice();$('lesson-notes').open=false;
    if(updateUrl)history.replaceState({},'',`${course.path}?lesson=${lesson.id}`);render();
  }
  $('course-lessons').onclick=event=>{const button=event.target.closest('[data-lesson]');if(button){selectLesson(button.dataset.lesson);if(compact.matches)$('course-outline').open=false;}};
  $('lesson-watch').onclick=()=>{session.watch();clearTurn();render();};$('lesson-practice').onclick=()=>{resetPractice();render();};
  $('lesson-reset').onclick=()=>{if(session.mode==='practice')resetPractice();else{session.watch();clearTurn();}render();};
  $('lesson-previous').onclick=()=>{session.jump(session.cursor-1);clearTurn();render();};$('lesson-next').onclick=()=>{session.jump(session.cursor+1);clearTurn();render();};
  $('lesson-flip').onclick=()=>{flipped=!flipped;render();};$('lesson-hint').onclick=()=>{hint=session.hint();message=hint?`Study move: ${hint.san}. Move from ${hint.from} to ${hint.to}.`:'';render();};
  $('lesson-explain').onclick=()=>{explanationOpen=!explanationOpen;render();};$('lesson-understand').onclick=()=>{explanationOpen=true;render();};
  $('lesson-course-previous').onclick=()=>{const i=lessons.findIndex(lesson=>lesson.id===session.lesson.id);if(i>0)selectLesson(lessons[i-1].id);};
  $('lesson-course-next').onclick=()=>{if(!session.completed&&!progress.read().includes(session.lesson.id))return;const i=lessons.findIndex(lesson=>lesson.id===session.lesson.id);if(i===lessons.length-1)onCourseComplete?.();else selectLesson(lessons[i+1].id);};
  document.querySelectorAll('[data-lesson-idea]').forEach(button=>button.onclick=()=>{idea=button.dataset.lessonIdea;render();});
  $('lesson-moves').onclick=event=>{const button=event.target.closest('[data-lesson-ply]');if(button){session.jump(Number(button.dataset.lessonPly));clearTurn();render();}};
  $('lesson-analyze').onclick=()=>onAnalyze(session.pgn());
  function attemptMove(from,to,promote){
    const result=session.attempt(from,to,promote);
    if(result.status==='correct'){clearTurn();message=`${result.move.san} fits this study line.${result.completed?' Exercise complete.':''}`;if(result.completed)progress.complete(session.lesson.id);}
    else message=result.status==='different'?`${result.san} is legal, but this exercise practices another continuation. Try again or get a hint.`:'That move is not legal here. Choose a highlighted destination.';
    render();
  }
  $('lesson-board').onclick=event=>{
    if(session.mode!=='practice'||session.completed||promotion)return;const square=event.target.closest('[data-square]')?.dataset.square;if(!square)return;
    const chess=new Chess(session.fen),piece=chess.get(square);
    if(selected&&square!==selected&&piece?.color!==session.lesson.practiceColor){
      if(chess.moves({square:selected,verbose:true}).some(move=>move.to===square&&move.promotion)){promotion={from:selected,to:square};message='Choose the promotion piece.';render();return;}
      attemptMove(selected,square);
    }else{selected=piece?.color===session.lesson.practiceColor?(selected===square?null:square):null;message='';render();}
  };
  for(const button of document.querySelectorAll('[data-lesson-promotion]'))button.onclick=()=>{if(promotion)attemptMove(promotion.from,promotion.to,button.dataset.lessonPromotion);};
  $('lesson-promotion-cancel').onclick=()=>{promotion=null;selected=null;message='Promotion cancelled. Choose another move.';render();};
  for(const button of document.querySelectorAll('[data-course-level]'))button.onclick=()=>{
    if(course.id!=='tactics')return;
    const inLevel=courseLessons(course,button.dataset.courseLevel),done=progress.read();
    selectLesson((inLevel.find(lesson=>!done.includes(lesson.id))||inLevel[0]).id);
  };
  $('lesson-board').addEventListener('keydown',event=>{
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[event.key];if(!delta)return;
    const tiles=[...$('lesson-board').querySelectorAll('button[data-square]')],index=tiles.indexOf(event.target);if(index<0)return;event.preventDefault();
    if(event.key==='ArrowLeft'&&index%8===0||event.key==='ArrowRight'&&index%8===7)return;
    const next=tiles[index+delta];if(next){tiles.forEach(tile=>tile.tabIndex=tile===next?0:-1);next.focus({preventScroll:true});}
  });
  render();return {open(courseId='french'){
    const requested=COURSES[courseId]||COURSES.french,id=new URLSearchParams(location.search).get('lesson');
    if(course.id!==requested.id){course=requested;lessons=course.lessons;progress=memoryFor(course);const done=progress.read();selectLesson((lessons.find(lesson=>lesson.id===id)||lessons.find(lesson=>!done.includes(lesson.id))||lessons[0]).id,false);}
    else if(id&&id!==session.lesson.id)selectLesson(id,false);else render();
  },refresh:updateProgress};
}
