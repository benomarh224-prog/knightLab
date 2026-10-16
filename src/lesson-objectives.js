export function offTargetFeedback(activity,move){
  const goal=activity.objective;
  if(goal?.piece&&move.piece!==goal.piece)return `${move.san} is legal, but this exercise asks you to use your ${goal.piece==='p'?'pawn':'specified piece'}. ${goal.rule||''}`.trim();
  if(goal?.kind==='capture'&&!move.captured)return `${move.san} is legal, but it does not capture the pawn. ${goal.rule||'Look for a capturing move.'}`;
  return `${move.san} is legal. This exercise practices another continuation. Try again or get a hint.`;
}
