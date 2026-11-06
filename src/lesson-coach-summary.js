// Short presentation of existing, validated lesson feedback. It never changes
// moves, progress or continuation requirements, and never invents a judgement.
export function lessonCoachSummary({guidance,hint,feedback,recap,alternative=false,attempt}={}){
  if(attempt?.kind==='illegal')return {title:'Not a legal move',text:feedback,kind:'illegal'};
  if(attempt?.kind==='objective')return {title:'Try the lesson goal',text:feedback,kind:'objective'};
  if(guidance?.mode==='explore'&&guidance.status==='Stalemate')return {title:'Stalemate',text:'No legal moves, and the king is not in check. Use Undo to try another line.',kind:'explore'};
  if(guidance?.mode==='explore')return {title:guidance.status,text:feedback||guidance.instruction,kind:'explore'};
  if(recap)return {title:'Idea applied',text:recap.shortText||recap.text,kind:'complete'};
  if(feedback&&feedback!==hint?.text)return {title:alternative?'Your move':'Your coach',text:feedback,kind:'feedback'};
  if(hint)return {title:`Hint ${hint.level} of 3`,text:hint.text,kind:'hint'};
  return {title:guidance?.status||'Your coach',text:guidance?.instruction||'Study the position, then choose a move.',kind:guidance?.mode||'practice'};
}
export function compactLessonAction(next){
  if(next.action==='question'||next.action==='stage'&&next.stage==='check')return 'Check →';
  if(next.action==='resume-practice')return 'Resume →';
  if(next.action==='end-exploration'||next.action==='end-challenge')return 'Lesson →';
  if(next.action==='demonstration-done')return 'Done ✓';
  if(next.action==='next-study-move')return 'Next move →';
  return next.label;
}
export function paintLessonSummary({doc=document,summary,next}={}){
  const card=doc.getElementById('lesson-coach-summary');card.dataset.kind=summary.kind;
  doc.getElementById('lesson-coach-inline').dataset.kind=summary.kind;
  for(const [id,value]of [['lesson-summary-title',summary.title],['lesson-summary-text',summary.text]]){
    const node=doc.getElementById(id);if(node.textContent!==value)node.textContent=value;
  }
  const action=doc.getElementById('lesson-course-next');action.dataset.compactLabel=compactLessonAction(next);action.dataset.fullLabel=next.label;
  action.setAttribute('aria-label',next.label);
}
