import{reviewSearch}from'./review-quality.js';
import{nextReviewPosition}from'./review-schedule.js';

// Preview the current decision first, then cover the game before entering the
// slower two-line pass. Previews do not satisfy the requested depth floor.
export function createReviewPlan(parsed,mode,{extend=false}={}){
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
      const preview=take('preview','quick',ply,scores,()=>({depth:12,milliseconds:120,multiPV:1}));
      if(preview)return preview;
      const task=take('deepen',mode,ply,scores,i=>reviewSearch(mode,extend?scores[i]:undefined));
      // Preview-only TT bounds can make a later MultiPV search much slower.
      // Start the full pass clean once, then retain its hash between positions.
      if(task&&!deepStarted){task.search={...task.search,clearHash:true};deepStarted=true;}
      return task;
    },
    retry(task){attempted[task.phase]?.delete(task.index);},
  };
}
