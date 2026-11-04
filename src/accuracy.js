import {evaluationReady} from './review-quality.js';

// Lichess WinPercent and AccuracyPercent (including the current +1 uncertainty
// bonus), verified 2026-11-04. See docs/accuracy.md for sources and policy.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function whiteWinPercent(score){
  if(!score||!Number.isFinite(score.cp))return null;
  // Mate is a bounded winning-chance outcome, never a pawn measurement.
  // Our engine normalizes cp and mate to White; cp disambiguates terminal M0.
  const cp=score.mate!=null?Math.sign(score.cp||score.mate)*1000:clamp(score.cp,-1000,1000);
  if(score.mate!=null&&!cp)return null;
  return 100/(1+Math.exp(-.00368208*cp));
}
export function moveAccuracy(before,after,color='w'){
  if(before==null||after==null)return null;
  const loss=(before-after)*(color==='w'?1:-1);
  return loss<=0?100:clamp(103.1668100711649*Math.exp(-.04354415386753951*loss)-3.166924740191411+1,0,100);
}
export function aggregateAccuracy(accuracies,weights){
  if(!accuracies.length||accuracies.length!==weights.length||accuracies.some(a=>a==null)||weights.some(w=>!Number.isFinite(w)||w<=0))return null;
  const weight=weights.reduce((a,b)=>a+b,0);
  const weighted=accuracies.reduce((sum,a,i)=>sum+a*weights[i],0)/weight;
  // Lichess Maths.harmonicMean floors the reciprocal's denominator at 1.
  const harmonic=accuracies.length/accuracies.reduce((sum,a)=>sum+1/Math.max(1,a),0);
  return (weighted+harmonic)/2;
}
export function gameAccuracy(parsed,evaluations,mode='deep'){
  const n=parsed.moves.length,points=parsed.fens.map((_,i)=>evaluationReady(evaluations[i],mode)?whiteWinPercent(evaluations[i]):null);
  const ready=points.filter(p=>p!=null).length,complete=ready===n+1;
  const windowSize=clamp(Math.floor(n/10),2,8),windows=[];
  for(let i=0;i<Math.min(windowSize,points.length)-2;i++)windows.push(points.slice(0,windowSize));
  for(let i=0;i<=points.length-windowSize;i++)windows.push(points.slice(i,i+windowSize));
  const weights=windows.map(values=>{
    if(values.some(v=>v==null))return null;
    const mean=values.reduce((a,b)=>a+b,0)/values.length;
    return clamp(Math.sqrt(values.reduce((sum,p)=>sum+(p-mean)**2,0)/values.length),.5,12);
  });
  const sides=['w','b'].map(color=>{
    const indices=parsed.moves.flatMap((move,i)=>move.color===color?[i]:[]);
    const accuracies=indices.map(i=>moveAccuracy(points[i],points[i+1],color));
    return {color,total:indices.length,reviewed:accuracies.filter(a=>a!=null).length,
      accuracy:complete?aggregateAccuracy(accuracies,indices.map(i=>weights[i])):null,
      status:!indices.length?'unavailable':complete?'complete':'pending'};
  });
  return {sides,complete,ready,total:n+1,windowSize};
}
export function evaluationLossText(move,before,after){
  if(!before||!after)return 'Awaiting evaluation';
  if(before.mate!=null||after.mate!=null){
    const sign=move.color==='w'?1:-1,beforeMate=before.mate!=null?Math.sign(before.cp)*sign:0,afterMate=after.mate!=null?Math.sign(after.cp)*sign:0;
    if(beforeMate>0&&afterMate<=0)return 'Forced mate no longer found for the mover';
    if(beforeMate<0&&afterMate>=0)return 'Escaped the reported forced mate';
    if(afterMate<0)return beforeMate<0?'Forced mate against the mover remains':'Allows forced mate against the mover';
    if(afterMate>0)return beforeMate>0?'Forced mate for the mover remains':'Finds forced mate for the mover';
    return 'Forced-mate evaluation changed';
  }
  return `${(Math.max(0,(before.cp-after.cp)*(move.color==='w'?1:-1))/100).toFixed(2)} pawns of evaluation lost`;
}
