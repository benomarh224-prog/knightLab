import {evaluationReady} from './review-quality.js';
// A run attempts each missing position once, even when a precise search times
// out below its target depth. Manual resume can then deepen those positions.
export function nextReviewPosition(total,ply,evaluations,mode,attempted=new Set()){
  const selected=Math.max(0,Math.min(total-1,ply));
  const priorities=[selected-1,selected,selected+1,...Array.from({length:total},(_,i)=>i)];
  return priorities.find(i=>i>=0&&i<total&&!attempted.has(i)&&!evaluationReady(evaluations[i],mode))??null;
}
