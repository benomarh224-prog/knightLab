export const PRECISION_DEPTH = 19;
export const STANDARD_DEPTH = 16;
export const INSPECTION_DEPTH = PRECISION_DEPTH;
export const DEFAULT_REVIEW_MODE = 'precise';

export function loadReviewMode(storage){
  try{
    // Apply the requested target once, including browsers with an older saved
    // preview setting. Later explicit choices remain the learner's preference.
    if(storage?.getItem('roqvyn-review-settings-version')!=='depth-19'){
      storage?.setItem('roqvyn-review-mode',DEFAULT_REVIEW_MODE);
      storage?.setItem('roqvyn-review-settings-version','depth-19');
      return DEFAULT_REVIEW_MODE;
    }
    const saved=storage.getItem('roqvyn-review-mode');
    return ['quick','deep','precise'].includes(saved)?saved:DEFAULT_REVIEW_MODE;
  }catch{return DEFAULT_REVIEW_MODE;}
}

export function depthReady(score, depth) {
  return Boolean(score && Number.isFinite(score.cp) &&
    (score.terminal || !score.legacy && score.depth >= depth));
}

export function evaluationReady(score, mode) {
  if(mode==='quick')return Boolean(score&&Number.isFinite(score.cp)&&(!score.legacy||score.terminal));
  return depthReady(score, mode==='precise'?PRECISION_DEPTH:mode==='deep'?STANDARD_DEPTH:0);
}

export function reviewSearch(mode, previous) {
  if(mode==='quick')return 140;
  const depth=mode==='deep'?STANDARD_DEPTH:PRECISION_DEPTH;
  const initial=mode==='deep'?2200:4500;
  return {depth,milliseconds:Math.min(80000,Math.max(initial,(previous?.searchTime||0)*2))};
}

export function positionSearch(depth=PRECISION_DEPTH, previous) {
  // Depth is a quality floor, time is a device-friendly safety ceiling. A timed
  // out position stays provisional. Reuse the hash between adjacent positions.
  const initial=depth>=PRECISION_DEPTH?20000:6000;
  return {depth,milliseconds:Math.min(80000,Math.max(initial,(previous?.searchTime||0)*2))};
}

export function strongerScore(previous,next) {
  const keepAlternative=previous&&!previous.legacy&&!previous.terminal&&!next.terminal&&previous.depth===next.depth&&previous.alternative?.depth===previous.depth&&next.alternative?.depth!==next.depth;
  const improved=!previous||!Number.isFinite(previous.cp)||!Number.isFinite(previous.depth)||previous.legacy||next.terminal||!previous.terminal&&next.depth>=previous.depth;
  const strongest=improved&&!keepAlternative?next:previous;
  const searchTime=Math.max(previous?.searchTime||0,next.interrupted?0:next.searchTime||0);
  return (strongest.searchTime||0)===searchTime?strongest:{...strongest,searchTime};
}
