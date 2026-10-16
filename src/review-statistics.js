import {summarize} from './game.js';
import {evaluationReady} from './review-quality.js';

export function reviewStatistics(parsed,evaluations,mode='deep'){
  const sides=['w','b'].map(color=>{
    const summary=summarize(parsed,evaluations,color),total=parsed.moves.filter(move=>move.color===color).length;
    const ready=parsed.moves.filter((move,i)=>move.color===color&&evaluationReady(evaluations[i],mode)&&evaluationReady(evaluations[i+1],mode)).length;
    return {color,...summary,total,ready,provisional:ready<total};
  });
  const combined=summarize(parsed,evaluations,null);
  return {sides,combined,provisional:sides.some(side=>side.provisional),ready:sides.reduce((sum,side)=>sum+side.ready,0),total:parsed.moves.length};
}
export function renderReviewStatistics(parsed,evaluations,mode,doc=document){
  const report=reviewStatistics(parsed,evaluations,mode);
  doc.getElementById('review-statistics-status').textContent=`${report.provisional?'Provisional':'Review complete'} · ${report.ready}/${report.total} moves reviewed at the selected quality. These are whole-game move statistics, separate from the current-position score. Average loss measures evaluation, not captured material; forced-mate scores use a large capped value and can inflate this average.`;
  doc.getElementById('review-side-stats').innerHTML=report.sides.map(side=>`<section class="review-player-stats"><h4>${side.color==='w'?'White':'Black'}</h4><p>${side.count}/${side.total} moves rated${side.provisional?' · Provisional':''}</p><dl>${[['Best / Great',side.counts.Best+side.counts.Great],['Inaccuracies',side.counts.Inaccuracy],['Mistakes',side.counts.Mistake],['Blunders',side.counts.Blunder],['Avg. loss (pawns)',(side.averageLoss/100).toFixed(2)]].map(([label,value])=>`<div><dt>${label}</dt><dd>${side.count?value:'—'}</dd></div>`).join('')}</dl></section>`).join('');
  return report;
}
