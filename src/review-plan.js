import{reviewSearch}from'./review-quality.js';
import{nextReviewPosition}from'./review-schedule.js';

// Preview the selected decision before its complete two-line search. Avoid a
// speculative pass over the whole game: the user needs the selected position
// first, and unrelated searches evict useful transposition-table entries.
// Recheck navigation between searches; previews never satisfy the depth floor.
export function createReviewPlan(parsed,mode){
  const attempted={preview:new Set(),deepen:new Set(),quick:new Set()};
  let deepStarted=false;
  function take(phase,quality,ply,scores,search){
    const index=nextReviewPosition(parsed.fens.length,ply,scores,quality,attempted[phase]);
    if(index===null)return null;
    attempted[phase].add(index);return{index,phase,search:search(index)};
  }
  return{
    next(ply,scores){
      if(mode==='quick')return take('quick',mode,ply,scores,()=>reviewSearch(mode));
      const selected=Math.max(0,Math.min(parsed.fens.length-1,ply));
      const skip=new Set(attempted.preview);
      for(let i=0;i<parsed.fens.length;i++)if(i<selected-1||i>selected+1)skip.add(i);
      const index=nextReviewPosition(parsed.fens.length,selected,scores,'quick',skip);
      if(index!==null){attempted.preview.add(index);return{index,phase:'preview',search:{depth:12,milliseconds:120,multiPV:1}};}
      const task=take('deepen',mode,ply,scores,i=>reviewSearch(mode,scores[i]));
      // Preview-only TT bounds can make a later MultiPV search much slower.
      // Start the full pass clean once, then retain its hash between positions.
      if(task&&!deepStarted){task.search={...task.search,clearHash:true};deepStarted=true;}
      return task;
    },
    retry(task){attempted[task.phase]?.delete(task.index);},
  };
}
