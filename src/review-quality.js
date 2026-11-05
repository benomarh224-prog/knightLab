export const PRECISION_DEPTH = 18;
export const STANDARD_DEPTH = 16;
export const INSPECTION_DEPTH = 20;
export const DEFAULT_REVIEW_MODE = 'precise';

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
  return positionSearch(mode==='deep'?STANDARD_DEPTH:PRECISION_DEPTH,previous);
}

export function positionSearch(depth=PRECISION_DEPTH, previous) {
  // Depth is a quality floor, time is a device-friendly safety ceiling. A timed
  // out position stays provisional. Reuse the hash between adjacent positions.
  const initial=depth>=PRECISION_DEPTH?20000:6000;
  return {depth,milliseconds:Math.min(80000,Math.max(initial,(previous?.searchTime||0)*2))};
}

export function strongerScore(previous,next) {
  return !previous || !Number.isFinite(previous.cp) || !Number.isFinite(previous.depth) || previous.legacy || next.terminal || (!previous.terminal&&next.depth>=previous.depth) ? next : previous;
}
