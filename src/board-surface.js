// Indicators come from the same legal position used by the board's move validator.
export function boardIndicators(chess,selected=null){
  const captures=new Set(selected?chess.moves({square:selected,verbose:true}).filter(move=>move.captured).map(move=>move.to):[]);
  const kingInCheck=chess.isCheck()?chess.board().flat().find(piece=>piece?.type==='k'&&piece.color===chess.turn())?.square:null;
  return {captures,kingInCheck};
}
export function finishBoard(board,chess,selected=null){
  const {captures,kingInCheck}=boardIndicators(chess,selected);
  board.classList.add('board-surface');
  for(const tile of board.querySelectorAll('[data-square]')){
    const checked=tile.dataset.square===kingInCheck;
    tile.classList.toggle('capture-target',captures.has(tile.dataset.square));
    tile.classList.toggle('in-check',checked);
    if(checked)tile.setAttribute('aria-label',tile.getAttribute('aria-label')+'. In check');
  }
}

// Pointer dragging shares each board's existing selection, promotion and legal
// move handlers. A tap stays a native click; a drag suppresses only its own click.
export function enableBoardDrag(board,{read,select,play}){
  let drag=null,suppressUntil=0;
  const doc=board.ownerDocument;
  const clean=()=>{
    drag?.ghost?.remove();board.querySelector('.is-drag-origin')?.classList.remove('is-drag-origin');
    if(drag&&board.hasPointerCapture?.(drag.id))board.releasePointerCapture(drag.id);
    drag=null;
  };
  board.addEventListener('dragstart',event=>event.preventDefault());
  board.addEventListener('click',event=>{if(Date.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
  board.addEventListener('pointerdown',event=>{
    if(event.button!==0||event.isPrimary===false||event.target.closest('.piece-rating'))return;
    const tile=event.target.closest('[data-square]'),state=read();if(!tile||!state?.chess||state.disabled)return;
    const piece=state.chess.get(tile.dataset.square);
    if(!piece||piece.color!==state.chess.turn())return;
    drag={id:event.pointerId,from:tile.dataset.square,fen:state.chess.fen(),x:event.clientX,y:event.clientY,ghost:null};
  });
  board.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    if(read()?.chess?.fen()!==drag.fen){clean();return;}
    if(!drag.ghost&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<7)return;
    if(!drag.ghost){
      select(drag.from);
      const tile=board.querySelector(`[data-square="${drag.from}"]`),piece=tile?.querySelector('.piece');
      if(!piece){clean();return;}
      const rect=tile.getBoundingClientRect(),ghost=doc.createElement('div');
      ghost.className='board-drag-ghost';ghost.setAttribute('aria-hidden','true');ghost.append(piece.cloneNode(true));
      ghost.style.width=rect.width+'px';ghost.style.height=rect.height+'px';drag.size=rect.width;drag.ghost=ghost;doc.body.append(ghost);
      tile.classList.add('is-drag-origin');board.setPointerCapture(event.pointerId);
    }
    event.preventDefault();drag.ghost.style.left=(event.clientX-drag.size/2)+'px';drag.ghost.style.top=(event.clientY-drag.size/2)+'px';
  });
  board.addEventListener('pointerup',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    if(!drag.ghost){clean();return;}
    const {from,fen}=drag,to=doc.elementFromPoint(event.clientX,event.clientY)?.closest('[data-square]');
    suppressUntil=Date.now()+350;event.preventDefault();clean();
    if(to&&board.contains(to)&&to.dataset.square!==from&&read()?.chess?.fen()===fen)play(from,to.dataset.square);
  });
  board.addEventListener('pointercancel',clean);
  board.addEventListener('lostpointercapture',()=>{if(drag?.ghost)clean();});
}
