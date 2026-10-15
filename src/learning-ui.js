import { Chess } from 'chess.js';
import { pieceSvg } from './pieces.js';
import { FRENCH_LESSONS,FRENCH_REFERENCE } from './french-lessons.js';
import { OpeningLesson,createCourseProgress } from './opening-course.js';
const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};

export function createLearningUI({storage,onAnalyze}){
  const progress=createCourseProgress(storage,FRENCH_LESSONS.map(lesson=>lesson.id));
  let session=new OpeningLesson(FRENCH_LESSONS[0]),selected=null,hint=null,flipped=true,message='';
  function updateProgress(){
    const completed=progress.read();
    const focusedLesson=document.activeElement?.closest('#course-lessons [data-lesson]')?.dataset.lesson;
    $('course-progress-label').textContent=`${completed.length} / ${FRENCH_LESSONS.length} lessons practiced`;
    $('learn-progress-label').textContent=completed.length?`${completed.length} of ${FRENCH_LESSONS.length} lessons practiced`:'8 focused lessons · Interactive practice';
    $('course-progress-fill').style.width=`${completed.length/FRENCH_LESSONS.length*100}%`;
    $('course-lessons').innerHTML=FRENCH_LESSONS.map((lesson,index)=>`<button data-lesson="${lesson.id}" aria-current="${lesson.id===session.lesson.id?'step':'false'}"><span class="lesson-number">${completed.includes(lesson.id)?'✓':String(index+1).padStart(2,'0')}</span><span><strong>${escape(lesson.title)}</strong><small>${escape(lesson.tag)}</small></span><span aria-hidden="true">↗</span></button>`).join('');
    const active=$('course-lessons').querySelector('[aria-current="step"]');
    if(active&&$('course-lessons').clientWidth&&$('course-lessons').scrollWidth>$('course-lessons').clientWidth)$('course-lessons').scrollLeft=active.offsetLeft-$('course-lessons').clientWidth/2+active.offsetWidth/2;
    if(focusedLesson)$('course-lessons').querySelector(`[data-lesson="${focusedLesson}"]`)?.focus({preventScroll:true});
  }
  function render(){
    const {lesson,mode,cursor,completed}=session,chess=new Chess(session.fen),practice=mode==='practice';
    $('lesson-title').textContent=lesson.title;
    $('lesson-category').textContent=lesson.tag;
    $('lesson-objective').textContent=lesson.subtitle;
    $('lesson-note').textContent=practice?(completed?lesson.takeaway:'Find the next move for Black in this study line. Legal alternatives can exist; this exercise practices one chosen continuation.'):(cursor?session.note:lesson.subtitle);
    $('lesson-note-title').textContent=practice?(completed?'Lesson practiced':'Your move · Black'):(cursor?`${session.last.color==='w'?'White':'Black'} played ${session.last.san}`:'Understand the idea');
    const total=lesson.verboseMoves.filter(move=>move.color===lesson.practiceColor).length;
    $('lesson-counter').textContent=practice?`${session.correct}/${total} study moves`:`Move ${cursor}/${lesson.moves.length}`;
    $('lesson-view').textContent=flipped?'Black’s view':'White’s view';
    $('lesson-watch').setAttribute('aria-pressed',String(!practice));
    $('lesson-analyze').disabled=cursor===0;
    $('lesson-practice').setAttribute('aria-pressed',String(practice));
    $('lesson-previous').disabled=practice||cursor===0;
    $('lesson-next').disabled=practice&&!completed||!practice&&cursor===lesson.moves.length;
    $('lesson-next').textContent=practice?'Next lesson →':'Next →';
    $('lesson-hint').disabled=!practice||completed;
    $('lesson-feedback').textContent=message||(!practice?'Step through the line, then test it in Practice.':completed?`Completed${session.hints?` with ${session.hints} hint${session.hints===1?'':'s'}`:''}. You can replay or practice again.`:'Tap a Black piece and its destination.');
    $('lesson-feedback').dataset.state=completed?'complete':'';
    $('lesson-takeaway').textContent=lesson.takeaway;
    $('lesson-source').textContent=`Reference: ${lesson.source}. ${FRENCH_REFERENCE}`;
    const files=flipped?'hgfedcba':'abcdefgh',ranks=flipped?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];
    const targets=new Set(selected?chess.moves({square:selected,verbose:true}).map(move=>move.to):[]);
    const focusSquare=document.activeElement?.closest('#lesson-board [data-square]')?.dataset.square;
    let html='';
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){
      const square=files[f]+ranks[r],piece=chess.get(square),dark=(files.charCodeAt(f)-97+ranks[r])%2===1;
      const last=session.last&&[session.last.from,session.last.to].includes(square);
      const label=`${square}: ${piece?`${piece.color==='w'?'White':'Black'} ${names[piece.type]}`:'empty'}${targets.has(square)?'. Legal destination':''}`;
      const tag=practice&&!completed?'button':'div';
      html+=`<${tag} class="square${dark?' dark':''}${last?' last':''}${selected===square?' lesson-selected':''}${targets.has(square)?' lesson-target':''}${hint&&[hint.from,hint.to].includes(square)?' lesson-hint-square':''}" data-square="${square}" ${tag==='button'?`type="button" tabindex="${square===(focusSquare||selected||files[0]+ranks[7])?0:-1}"`:''} aria-label="${escape(label)}">${f===0?`<span class="rank" aria-hidden="true">${ranks[r]}</span>`:''}${r===7?`<span class="file" aria-hidden="true">${files[f]}</span>`:''}${piece?pieceSvg(piece):''}</${tag}>`;
    }
    $('lesson-board').innerHTML=html;
    $('lesson-board').setAttribute('aria-label',`${lesson.title}. ${practice&&!completed?'Black to move.':'Study position.'} ${session.fen}`);
    if(focusSquare)$('lesson-board').querySelector(`[data-square="${focusSquare}"]`)?.focus({preventScroll:true});
    $('lesson-moves').innerHTML=lesson.verboseMoves.map((move,index)=>`<button data-lesson-ply="${index+1}" ${practice?'disabled':''} aria-current="${index+1===cursor?'step':'false'}" aria-label="Go to ${move.before.split(' ')[5]}${move.color==='w'?'.':'…'} ${move.san}">${practice&&index>=cursor?'· · ·':escape(move.san)}</button>`).join('');
    const active=$('lesson-moves').querySelector('[aria-current="step"]');
    if(active)$('lesson-moves').scrollLeft=active.offsetLeft-$('lesson-moves').clientWidth/2;
    updateProgress();
  }
  function selectLesson(id,updateUrl=true){
    const lesson=FRENCH_LESSONS.find(item=>item.id===id);if(!lesson)return;
    session=new OpeningLesson(lesson);selected=null;hint=null;message='';
    if(updateUrl)history.replaceState({},'',`/learn/french-defense/?lesson=${lesson.id}`);
    render();
  }
  $('course-lessons').onclick=event=>{const button=event.target.closest('[data-lesson]');if(button)selectLesson(button.dataset.lesson);};
  $('lesson-watch').onclick=()=>{session.watch();selected=null;hint=null;message='';render();};
  $('lesson-practice').onclick=()=>{session.practice();selected=null;hint=null;message='';render();};
  $('lesson-previous').onclick=()=>{session.jump(session.cursor-1);message='';render();};
  $('lesson-next').onclick=()=>{
    if(session.mode==='practice'){
      const index=FRENCH_LESSONS.findIndex(lesson=>lesson.id===session.lesson.id);
      selectLesson(FRENCH_LESSONS[(index+1)%FRENCH_LESSONS.length].id);
    }else{session.jump(session.cursor+1);message='';render();}
  };
  $('lesson-flip').onclick=()=>{flipped=!flipped;render();};
  $('lesson-hint').onclick=()=>{hint=session.hint();message=hint?`Study move: ${hint.san}. Move from ${hint.from} to ${hint.to}.`:'';render();};
  $('lesson-moves').onclick=event=>{const button=event.target.closest('[data-lesson-ply]');if(button){session.jump(Number(button.dataset.lessonPly));message='';render();}};
  $('lesson-analyze').onclick=()=>onAnalyze(session.pgn());
  $('lesson-board').onclick=event=>{
    if(session.mode!=='practice'||session.completed)return;
    const square=event.target.closest('[data-square]')?.dataset.square;if(!square)return;
    const chess=new Chess(session.fen),piece=chess.get(square);
    if(selected&&square!==selected&&piece?.color!==lessonColor()){
      const result=session.attempt(selected,square);
      if(result.status==='correct'){message=`${result.move.san} fits this study line.${result.completed?' Lesson practiced.':''}`;selected=null;hint=null;if(result.completed)progress.complete(session.lesson.id);}
      else message=result.status==='different'?`${result.san} is legal, but this lesson practices a different continuation. Try again or use Hint.`:'That move is not legal here. Choose a highlighted destination.';
    }else{selected=piece?.color===lessonColor()?(selected===square?null:square):null;message='';}
    render();
  };
  function lessonColor(){return session.lesson.practiceColor;}
  $('lesson-board').addEventListener('keydown',event=>{
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[event.key];if(!delta)return;
    const tiles=[...$('lesson-board').querySelectorAll('button[data-square]')],index=tiles.indexOf(event.target);
    if(index<0)return;event.preventDefault();
    if(event.key==='ArrowLeft'&&index%8===0||event.key==='ArrowRight'&&index%8===7)return;
    const next=tiles[index+delta];
    if(next){tiles.forEach(tile=>tile.tabIndex=tile===next?0:-1);next.focus({preventScroll:true});}
  });
  render();
  return {open(){const id=new URLSearchParams(location.search).get('lesson');if(id&&id!==session.lesson.id)selectLesson(id,false);else render();},refresh:updateProgress};
}
