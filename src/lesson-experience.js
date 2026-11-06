// Board lessons start on their actual position; reading remains available.
// Coordinate warmups already contain an interactive board in the Learn stage.
export function initialLessonStage(plan,lesson){
  return lesson.squarePractice&&plan.stages.includes('learn')?'learn':plan.activities.length?'try':plan.stages[0];
}
export function solutionRecap(player){
  const activity=player.activity,session=player.session;
  const solved=activity?.data.kind==='demonstration'?activity.done:session?.completed;
  if(!activity||!solved||player.exploring||player.reviewing||player.challengeMode)return null;
  const principle=activity.data.takeaway||activity.data.recap||player.lesson.takeaway||activity.data.explanation;
  const fact=session.note||'';
  const text=[fact,principle].filter((value,index,all)=>value&&all.indexOf(value)===index).join(' ');
  return text?{title:'What you learned',text}:null;
}
