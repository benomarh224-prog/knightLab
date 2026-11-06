import {Chess} from 'chess.js';
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
export function offTargetFeedback(activity,move,expected){
  const goal=activity.objective;
  if(goal?.piece&&move.piece!==goal.piece)return `${move.san} is legal, but this exercise asks you to use your ${goal.piece==='p'?'pawn':'specified piece'}. ${goal.rule||''}`.trim();
  if(goal?.kind==='capture'&&!move.captured)return `${move.san} is legal, but it does not capture the ${names[expected?.captured]||'pawn'}. ${goal.rule||'Look for a capturing move.'}`;
  const after=new Chess(move.after),before=new Chess(move.before);
  if(after.isCheckmate())return `${move.san} is legal and gives checkmate. The course follows another move; this is a valid alternative mate.`;
  if(before.isCheck())return `${move.san} is legal and gets your king out of check. The course demonstrates another reply; this is not automatically a mistake.`;
  if(expected?.san.endsWith('#'))return `${move.san} is legal, but ${after.isCheck()?'the opponent still has a legal reply to the check':'it does not give checkmate'}. This exercise asks you to finish the game.`;
  const fact=move.captured?`It captures the ${names[move.captured]}.`:after.isCheck()?'It gives check.':`It moves your ${names[move.piece]} from ${move.from} to ${move.to}.`;
  return `${move.san} is legal. ${fact} It is outside this study line; that alone does not make it a mistake.`;
}
