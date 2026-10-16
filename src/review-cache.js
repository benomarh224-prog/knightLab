// Persist only compact engine evidence, keyed by the exact PGN and review mode.
// Lesson progress and the existing review-position storage keep their own keys.
const KEY='knightlab-review-evidence-v1';
function score(value){
  if(!value||!Number.isFinite(value.cp)||!Number.isInteger(value.depth)||value.depth<0)return null;
  const clean={cp:value.cp,mate:Number.isFinite(value.mate)?value.mate:null,depth:value.depth,best:/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value.best||'')?value.best:null,
    pv:Array.isArray(value.pv)?value.pv.filter(move=>typeof move==='string').slice(0,16):[],terminal:value.terminal===true,searchTime:Number.isFinite(value.searchTime)?value.searchTime:0};
  if(value.alternative&&Number.isFinite(value.alternative.cp))clean.alternative={cp:value.alternative.cp,depth:value.alternative.depth};
  return clean;
}
export function createReviewCache(storage){
  let entries=[];try{const saved=JSON.parse(storage?.getItem(KEY)||'[]');if(Array.isArray(saved))entries=saved.filter(entry=>typeof entry.pgn==='string'&&entry.pgn.length<=250000&&['deep','precise'].includes(entry.mode)&&Array.isArray(entry.scores)).slice(0,8);}catch{}
  return {load(pgn,mode,total){const found=entries.find(entry=>entry.pgn===pgn&&entry.mode===mode);return found?found.scores.slice(0,total).map(score):[];},
    save(pgn,mode,evaluations){if(!evaluations.some(Boolean)||!['deep','precise'].includes(mode))return;entries=[{pgn,mode,scores:evaluations.map(score)},...entries.filter(entry=>entry.pgn!==pgn||entry.mode!==mode)].slice(0,8);try{storage?.setItem(KEY,JSON.stringify(entries));}catch{}}};
}
