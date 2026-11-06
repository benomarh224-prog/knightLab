// Evaluation paints inside its reserved track; it never sizes the board.
export function evaluationShare(score){
  return Number.isFinite(score?.cp)?(50+45*Math.tanh(score.cp/450))/100:.5;
}
export function paintEvaluationBar({bar,fill,label},score,text){
  fill.style.transform=`scaleX(${evaluationShare(score)})`;
  if(label.textContent!==text)label.textContent=text;
  bar.setAttribute('aria-label',`Position evaluation from White’s perspective: ${text}`);
  bar.classList.toggle('awaiting-evaluation',!score);
}

// scrollIntoView also scrolls the page and sticky board. Only the move list
// owns this navigation adjustment, including during automatic playback.
export function keepMoveInList(cell,list){
  if(!cell||!list||!list.clientHeight)return false;
  const r=cell.getBoundingClientRect(),box=list.getBoundingClientRect();
  const top=box.top+list.clientTop,bottom=top+list.clientHeight;
  const delta=r.top<top?r.top-top:r.bottom>bottom?r.bottom-bottom:0;
  const next=Math.max(0,Math.min(list.scrollHeight-list.clientHeight,list.scrollTop+delta));
  if(next===list.scrollTop)return false;
  list.scrollTop=next;return true;
}
