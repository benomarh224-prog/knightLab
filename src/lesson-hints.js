const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
export function progressiveHint(move,level,hints=[]){
  if(!move)return null;
  const step=Math.max(1,Math.min(3,level));
  if(hints[step-1]&&step<3)return {level:step,text:hints[step-1],...(step===2?{from:move.from}:{})};
  if(step===1){
    const idea=move.san.includes('#')?'Look for a move that delivers checkmate.':move.san.includes('+')?'Look for a forcing check.':move.promotion?'Find a pawn move that reaches the last rank.':move.san.startsWith('O-O')?'Look for the special king-and-rook move that improves king safety.':move.captured?'Look for a capture. Compare the legal targets in this position.':move.piece==='p'?'Look for a pawn move. Consider how it changes the center or opens a line.':'Look for a piece move. Compare its available squares with the lesson’s idea.';
    return {level:step,text:idea};
  }
  if(step===2)return {level:step,text:`Focus on the ${move.color==='w'?'White':'Black'} ${names[move.piece]} on ${move.from}. Where can it go?`,from:move.from};
  return {level:step,text:`Study move: ${move.san}. Move from ${move.from} to ${move.to}${move.promotion?` and promote to a ${names[move.promotion]}`:''}.`,from:move.from,to:move.to};
}
