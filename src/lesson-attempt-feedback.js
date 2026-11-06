// Results come from the existing legal-move/lesson validator, never an
// estimated chess judgement. A different legal idea is not called a mistake.
export function lessonAttemptFeedback(result,from,to){
  if(!/^[a-h][1-8]$/.test(from||'')||!/^[a-h][1-8]$/.test(to||''))return null;
  if(result.status==='illegal')return {kind:'illegal',square:to};
  if(result.status==='different')return {kind:'objective',square:to};
  return null;
}

export function createLessonAttemptEffect({overlay,target,clock=globalThis,reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches}){
  let active=null,timer=null,animation=null,sequence=0;
  function clear(){
    if(timer!==null)clock.clearTimeout(timer);timer=null;animation?.cancel();animation=null;active=null;overlay.hidden=true;
  }
  function position(flipped=false){
    if(!active)return;
    const file=active.square.charCodeAt(0)-97,rank=Number(active.square[1]);
    target.style.gridColumn=String(flipped?8-file:file+1);target.style.gridRow=String(flipped?rank:9-rank);
  }
  function show(feedback,flipped=false){
    clear();if(!feedback)return;
    active=feedback;const current=++sequence;overlay.dataset.kind=feedback.kind;overlay.dataset.sequence=String(current);overlay.hidden=false;
    target.dataset.symbol=feedback.kind==='illegal'?'×':'?';position(flipped);
    if(!reduced())animation=target.animate?.([{opacity:1},{opacity:.45},{opacity:1}],{duration:480,easing:'ease-in-out'})||null;
    timer=clock.setTimeout(()=>{if(sequence===current)clear();},1100);
  }
  return {show,clear,position};
}
