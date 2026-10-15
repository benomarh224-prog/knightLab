// One continuation rule for the mobile dock and the nearby desktop action.
// This reads the player's actual requirements; it never changes earned completion.
export function lessonContinuation(player,{lastLesson=false,label='Lesson'}={}){
  const next=()=>({action:'next-lesson',label:lastLesson?'Back to course →':`Next ${label.toLowerCase()} →`,enabled:true,help:'Lesson complete'});
  const learn=()=>({action:'stage',stage:'learn',label:'Finish reading →',enabled:true,help:'Complete the lesson’s reading'});
  const check=()=>({action:'question',index:Math.max(0,player.plan.questions.findIndex((q,i)=>q.required&&player.answers[i]!==q.answer)),label:'Continue to Check →',enabled:player.checkUnlocked,help:'Check your understanding'});
  if(player.challengeMode)return {action:'end-challenge',label:'Back to lesson →',enabled:true,help:player.session.completed?'Practice complete':'Your original position is saved'};
  if(player.stage==='learn'){
    if(player.learned&&player.complete)return next();
    const more=player.conceptIndex<player.plan.concepts.length-1;
    return {action:'learn-next',label:more?'Next idea →':player.plan.stages.includes('try')?'Try on the board →':player.plan.stages.includes('check')?'Continue to Check →':'Finish reading ✓',enabled:true,help:`Idea ${player.conceptIndex+1} of ${player.plan.concepts.length}`};
  }
  if(player.stage==='try'){
    if(player.reviewing)return {action:'resume-practice',label:'Resume practice →',enabled:true,help:'Your practice position is saved'};
    if(player.complete)return next();
    const activity=player.activity;
    if(activity?.data.kind==='demonstration'&&!activity.done){
      if(!player.session.lesson.moves.length||activity.data.completion==='acknowledge')return {action:'demonstration-done',label:'Finish demonstration ✓',enabled:true,help:'Review this position, then continue'};
      return {action:'next-study-move',label:'Next study move →',enabled:true,help:'Follow the demonstration'};
    }
    const pending=player.activities.findIndex(item=>item.data.required&&!item.done);
    if(pending>=0){
      if(activity?.done||activity?.data.required===false)return {action:'activity',index:pending,label:'Next exercise →',enabled:true,help:`Exercise ${pending+1} of ${player.activities.length}`};
      return {action:'blocked',label:'Continue →',enabled:false,help:'Complete the board exercise'};
    }
    if(!player.checksComplete)return check();
    if(player.plan.learnRequired&&!player.learned)return learn();
    return next();
  }
  const q=player.question,passed=q&&player.answers[player.questionIndex]===q.answer;
  if(q?.required&&!passed)return {action:'blocked',label:'Continue →',enabled:false,help:'Answer the question to continue'};
  if(player.questionIndex<player.plan.questions.length-1)return {action:'question',index:player.questionIndex+1,label:'Next question →',enabled:true,help:'Check the next idea'};
  if(!player.checksComplete)return check();
  if(player.plan.learnRequired&&!player.learned)return learn();
  return player.complete?next():{action:'stage',stage:'try',label:'Back to practice →',enabled:true,help:'Complete the board exercise'};
}

// The measured height includes wrapped text and the device safe area. Using a
// live measurement avoids the old fixed footer covering the final content.
export function createLessonDock({footer,root,Observer=globalThis.ResizeObserver,viewport=globalThis.window}){
  function measure(){
    const height=Math.ceil(footer.getBoundingClientRect().height);
    if(height>0)root.style.setProperty('--lesson-dock-height',`${height}px`);
  }
  const observer=Observer?new Observer(measure):null;
  observer?.observe(footer);viewport?.addEventListener('resize',measure);measure();
  return {measure,destroy(){observer?.disconnect();viewport?.removeEventListener('resize',measure);root.style.removeProperty('--lesson-dock-height');}};
}
