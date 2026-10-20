export function moveTransitions(previous,next) {
  if(!previous||previous.flipped!==next.flipped||previous.game!==next.game||previous.fen===next.fen)return [];
  let move,reverse=false;
  if(next.last?.before===previous.fen&&next.last.after===next.fen)move=next.last;
  else if(previous.last?.after===previous.fen&&previous.last.before===next.fen){move=previous.last;reverse=true;}
  if(!move)return [];
  const transitions=[{from:move.from,to:move.to}];
  if(move.flags.includes('k')||move.flags.includes('q')){
    const rank=move.from[1],kingSide=move.flags.includes('k');
    transitions.push({from:(kingSide?'h':'a')+rank,to:(kingSide?'f':'d')+rank});
  }
  return transitions.map(({from,to})=>reverse?{from:to,to:from}:{from,to});
}

export function animatePieces(board,transitions) {
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  for(const {from,to} of transitions){
    const origin=board.querySelector(`[data-square="${from}"]`),destination=board.querySelector(`[data-square="${to}"]`);
    const piece=destination?.querySelector('.piece');
    if(!origin||!piece?.animate)continue;
    const start=origin.getBoundingClientRect(),end=destination.getBoundingClientRect();
    if(!end.width)continue;
    const animation=piece.animate([{transform:`translate(${start.x-end.x}px,${start.y-end.y}px)`},{transform:'translate(0,0)'}],{duration:150,easing:'cubic-bezier(.22,.7,.3,1)'});
    destination.classList.add('piece-in-motion');
    animation.finished.then(()=>destination.classList.remove('piece-in-motion')).catch(()=>{});
  }
}

export function fadePreviousHighlights(board,highlights) {
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  for(const {square,color} of highlights){
    const tile=board.querySelector(`[data-square="${square}"]`);
    if(!tile?.animate||tile.classList.contains('last'))continue;
    tile.animate([{backgroundColor:color},{backgroundColor:getComputedStyle(tile).backgroundColor}],{duration:260,easing:'ease-out'});
  }
}
