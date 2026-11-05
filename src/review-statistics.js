import {summarize} from './game.js';
import {evaluationReady} from './review-quality.js';
import {gameAccuracy} from './accuracy.js';

export function reviewStatistics(parsed,evaluations,mode='deep'){
  const accuracy=gameAccuracy(parsed,evaluations,mode);
  const sides=['w','b'].map(color=>{
    const summary=summarize(parsed,evaluations,color),total=parsed.moves.filter(move=>move.color===color).length;
    const ready=parsed.moves.filter((move,i)=>move.color===color&&evaluationReady(evaluations[i],mode)&&evaluationReady(evaluations[i+1],mode)).length;
    const pairs=parsed.moves.flatMap((move,i)=>move.color===color&&evaluationReady(evaluations[i],mode)&&evaluationReady(evaluations[i+1],mode)?[{move,before:evaluations[i],after:evaluations[i+1]}]:[]);
    const finite=pairs.filter(p=>p.before.mate==null&&p.after.mate==null);
    const finiteAverageLoss=finite.length?finite.reduce((sum,p)=>sum+Math.max(0,(p.before.cp-p.after.cp)*(color==='w'?1:-1)),0)/finite.length:null;
    return {color,...summary,total,ready,provisional:ready<total,finiteAverageLoss,finiteCount:finite.length,mateTransitions:pairs.length-finite.length,...accuracy.sides.find(side=>side.color===color)};
  });
  const combined=summarize(parsed,evaluations,null);
  return {sides,combined,accuracy,provisional:sides.some(side=>side.provisional),ready:sides.reduce((sum,side)=>sum+side.ready,0),total:parsed.moves.length};
}
export function renderReviewStatistics(parsed,evaluations,mode,doc=document){
  const report=reviewStatistics(parsed,evaluations,mode);
  const depths=evaluations.slice(0,parsed.fens.length).filter(s=>s&&!s.terminal&&Number.isFinite(s.depth)).map(s=>s.depth);
  const quality=mode==='precise'?'Precise · target depth 18':mode==='deep'?'Standard · 650ms per position':'Quick · 140ms per position';
  doc.getElementById('review-statistics-status').textContent=`${report.accuracy.complete?'Review complete':'Pending · Finish reviewing every position for accuracy'} · ${report.ready}/${report.total} moves reviewed. Stockfish 19 · ${quality}${depths.length?` · observed depth ${Math.min(...depths)}–${Math.max(...depths)}`:''}. Whole-game performance is separate from the current-position evaluation.`;
  doc.getElementById('review-side-stats').innerHTML=report.sides.map(side=>`<section class="review-player-stats"><h4>${side.color==='w'?'White':'Black'}</h4><div class="accuracy-result"><span>Accuracy</span><strong>${side.accuracy==null?(side.status==='pending'?'Pending':'Unavailable'):side.accuracy.toFixed(1)+'%'}</strong></div><p>${side.count}/${side.total} moves rated${side.provisional?' · Provisional':''}</p><dl>${[['Brilliant',side.counts.Brilliant],['Best / Great',side.counts.Best+side.counts.Great],['Inaccuracies',side.counts.Inaccuracy],['Mistakes',side.counts.Mistake],['Blunders',side.counts.Blunder],['Avg. loss · non-mate',side.finiteAverageLoss==null?'—':(side.finiteAverageLoss/100).toFixed(2)+' pawns'],['Mate transitions',side.mateTransitions]].map(([label,value])=>`<div><dt>${label}</dt><dd>${side.count?value:'—'}</dd></div>`).join('')}</dl><p>Pawn-loss average covers ${side.finiteCount} non-mate moves only.</p></section>`).join('')+`<details class="accuracy-method"><summary>How accuracy is calculated</summary><p><a href="https://lichess.org/page/accuracy" target="_blank" rel="noopener">Lichess winning-chance method</a>: average of a volatility-weighted mean and harmonic mean of move accuracies, using bounded evaluations and sliding windows. Includes the upstream 1-point uncertainty bonus. Mate outcomes are bounded winning chances, not pawn losses. Results can differ from Chess.com and Lichess because engines, search quality and positions differ. Deeper review may change the result.</p></details>`;
  return report;
}
