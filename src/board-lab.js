import puzzles from './board-lab-puzzles.json' with {type:'json'};
import{Chess}from'chess.js';
import{knightStep,shortestKnightPath,squareName}from'./board-lab-rules.js';

export const LAB_PUZZLES=puzzles;
export const LAB_LEVELS={beginner:{label:'Beginner',seconds:8,answerSeconds:45,routeSeconds:90},intermediate:{label:'Intermediate',seconds:6,answerSeconds:35,routeSeconds:75},advanced:{label:'Advanced',seconds:4,answerSeconds:25,routeSeconds:60},expert:{label:'Expert',seconds:8,answerSeconds:35,routeSeconds:90}};
export const LAB_MODES={memory:'Board memory',route:'Knight trail'};
export const LAB_PREFERENCES='roqvyn-board-lab-preferences-v1';
const names={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
const bounded=(value,max)=>Number.isFinite(value)?Math.max(0,Math.min(max,Math.floor(value))):0;
export function pieceName(piece){return piece?`${piece.color==='w'?'White':'Black'} ${names[piece.type]}`:'piece';}
export function readLabPreferences(storage){
  try{const value=JSON.parse(storage?.getItem(LAB_PREFERENCES)||'null');return {mode:Object.hasOwn(LAB_MODES,value?.mode)?value.mode:'memory',level:Object.hasOwn(LAB_LEVELS,value?.level)?value.level:'beginner',coordinates:value?.coordinates!==false,flipped:value?.flipped===true,timed:value?.timed!==false};}catch{return {mode:'memory',level:'beginner',coordinates:true,flipped:false,timed:true};}
}
function shuffled(pool,seed){
  const list=[...pool];let state=(seed>>>0)||1;
  for(let i=list.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[list[i],list[j]]=[list[j],list[i]];}
  return list;
}
export class BoardLabSession{
  constructor({storage,mode='memory',level='beginner',seed=Date.now(),fresh=false,timed=true}){
    this.storage=storage;this.mode=Object.hasOwn(LAB_MODES,mode)?mode:'memory';this.level=Object.hasOwn(LAB_LEVELS,level)?level:'beginner';
    this.pool=LAB_PUZZLES[this.mode][this.level];this.key=`roqvyn-board-lab-v1:${this.mode}:${this.level}`;this.seed=seed;this.best=0;this.timed=timed!==false;
    let saved;try{saved=JSON.parse(storage?.getItem(this.key)||'null');this.best=bounded(saved?.best,5);}catch{}
    this.newSession(seed,saved?.ids||[],false);
    if(!fresh&&saved?.version===1)this.restore(saved);
    this.save();
  }
  get puzzle(){return this.pool.find(item=>item.id===this.ids[this.index]);}
  get targets(){return this.puzzle.targets||[this.puzzle.target];}
  get pieceCount(){return new Chess(this.puzzle.fen).board().flat().filter(Boolean).length;}
  get targetSquare(){return this.targets[Math.min(this.round.answers.length,this.targets.length-1)];}
  get targetPiece(){return new Chess(this.puzzle.fen).get(this.targetSquare);}
  get current(){return this.round.path.at(-1)||this.puzzle.from;}
  get finished(){return this.phase==='complete';}
  get visiblePieces(){if(this.timed&&['ready','paused'].includes(this.phase))return false;return this.mode==='route'||['ready','observe','result','complete'].includes(this.phase)||this.phase==='paused'&&this.round.resumePhase==='observe';}
  get cleanCount(){return this.results.filter(result=>result.clean).length;}
  get solveLimit(){return LAB_LEVELS[this.level][this.mode==='route'?'routeSeconds':'answerSeconds']*1000;}
  get clockRunning(){return this.timed&&(this.phase==='observe'||['answer','play'].includes(this.phase)&&!this.round.timedOut);}
  resetRound(){this.round={misses:0,hints:0,questionHints:0,undos:0,retries:0,answers:[],path:this.mode==='route'?[this.puzzle.from]:[],last:null,feedback:'',hintSquare:null,remaining:LAB_LEVELS[this.level].seconds*1000,solveRemaining:this.solveLimit,timedOut:false,resumePhase:null};this.phase='ready';}
  newSession(seed=Date.now(),recent=this.ids||[],persist=true){
    const ordered=shuffled(this.pool,seed),unseen=ordered.filter(item=>!recent.includes(item.id));
    this.ids=[...unseen,...ordered.filter(item=>recent.includes(item.id))].slice(0,5).map(item=>item.id);this.index=0;this.results=[];this.resetRound();if(persist)this.save();
  }
  start(){
    if(!['ready','paused'].includes(this.phase))return false;
    this.phase=this.phase==='paused'?this.round.resumePhase:this.mode==='memory'?'observe':'play';this.round.resumePhase=null;this.round.feedback='';this.save();return true;
  }
  hide(){if(this.mode!=='memory'||this.phase!=='observe'&&!(this.phase==='paused'&&this.round.resumePhase==='observe'))return false;this.phase='answer';this.round.resumePhase=null;this.round.feedback='';this.save();return true;}
  tick(milliseconds){
    if(!this.clockRunning||!Number.isFinite(milliseconds)||milliseconds<0)return false;
    const key=this.phase==='observe'?'remaining':'solveRemaining';this.round[key]=Math.max(0,this.round[key]-milliseconds);
    if(this.round[key]===0){
      if(this.phase==='observe')this.hide();
      else{this.round.timedOut=true;this.round.feedback='Time’s up. Keep practicing; this round won’t count as a clean solve.';this.save();}
      return true;
    }
    return false;
  }
  pause(){if(!['observe','answer','play'].includes(this.phase))return false;this.round.resumePhase=this.phase;this.phase='paused';this.save();return true;}
  retry(){
    if(!['ready','observe','answer','play','paused'].includes(this.phase))return false;
    const {misses,hints,undos,retries}=this.round;this.resetRound();Object.assign(this.round,{misses,hints,undos,retries:retries+1});this.save();return true;
  }
  record(solved){
    if(this.results.length>this.index)return false;
    const moves=this.mode==='route'?this.round.path.length-1:0;
    this.results.push({id:this.puzzle.id,solved,clean:solved&&this.round.misses===0&&this.round.hints===0&&this.round.undos===0&&!this.round.timedOut&&!this.round.retries&&(this.mode!=='route'||moves===this.puzzle.distance),moves,hints:this.round.hints,misses:this.round.misses,timed:this.timed,timedOut:this.round.timedOut,retries:this.round.retries});
    this.phase='result';if(this.results.length===5)this.best=Math.max(this.best,this.cleanCount);this.save();return true;
  }
  attempt(square){
    if(!squareName(square))return {status:'invalid'};
    if(this.mode==='memory'){
      if(this.phase!=='answer')return {status:'inactive'};
      if(square!==this.targetSquare){this.round.misses++;this.round.last={square,kind:'wrong'};this.round.feedback='Not that square. Try again, or use a hint.';this.save();return {status:'retry'};}
      const label=pieceName(this.targetPiece);this.round.last={square,kind:'correct'};
      this.round.answers.push(square);this.round.questionHints=0;
      if(this.round.answers.length<this.targets.length){this.round.feedback=`Correct · ${this.round.answers.length} of ${this.targets.length} pieces recalled. Find the next piece.`;this.save();return {status:'recalled'};}
      this.round.feedback=this.targets.length>1?`All ${this.targets.length} pieces recalled.`:`${label} was on ${square}: the ${square[0]}-file, rank ${square[1]}.`;
      if(this.round.timedOut)this.round.feedback+=' Completed after the time limit.';
      this.record(true);return {status:'correct'};
    }
    if(this.phase==='ready')this.start();
    if(this.phase!=='play')return {status:'inactive'};
    const from=this.current,step=knightStep(this.puzzle,from,square);
    if(!step.allowed){
      this.round.misses++;this.round.last={square,kind:'wrong'};
      const board=new Chess(this.puzzle.fen),attacker=step.attackers[0];
      this.round.feedback=step.reason==='shape'?'A knight moves two squares one way and one across.':step.reason==='occupied'?'That square is occupied. Choose an empty landing square.':`${pieceName(board.get(attacker))} on ${attacker} attacks ${square}. Find a safe landing square.`;
      this.save();return {status:'retry',reason:step.reason};
    }
    this.round.path.push(square);this.round.last={square,kind:'correct'};this.round.hintSquare=null;
    this.round.feedback=square===this.puzzle.to?`${this.round.path.length-1} hops. The shortest safe route takes ${this.puzzle.distance}.${this.round.timedOut?' Completed after the time limit.':''}`:'Safe landing. Plan your next knight move.';
    if(square===this.puzzle.to){this.record(true);return {status:'correct',from,to:square};}
    this.save();return {status:'moved',from,to:square};
  }
  hint(){
    if(!['answer','play'].includes(this.phase))return false;
    if(this.mode==='memory'&&this.round.questionHints>=2)return false;
    this.round.hints++;
    if(this.mode==='memory'){
      const target=this.targetSquare;this.round.questionHints++;this.round.feedback=this.round.questionHints===1?`Think about the file: it was on the ${target[0]}-file.`:`Think about the rank: it was on rank ${target[1]}.`;
    }else{
      const next=shortestKnightPath(this.puzzle,this.current)?.[1];if(!next)return false;
      this.round.hintSquare=next;this.round.feedback=`Try ${next} as your next landing square.`;
    }
    this.save();return true;
  }
  reveal(){
    if(!['answer','play','ready','observe','paused'].includes(this.phase))return false;
    this.round.last=null;this.round.hintSquare=null;
    this.round.feedback=this.mode==='memory'?this.targets.map(square=>`${pieceName(new Chess(this.puzzle.fen).get(square))}: ${square}`).join(' · '):`One shortest safe route: ${shortestKnightPath(this.puzzle).join(' → ')}.`;
    this.record(false);return true;
  }
  undo(){
    if(this.mode!=='route'||this.phase!=='play'||this.round.path.length<=1)return false;
    this.round.path.pop();this.round.undos++;this.round.last=null;this.round.hintSquare=null;this.round.feedback='Move taken back. Try another route.';this.save();return true;
  }
  next(){if(this.phase!=='result')return false;if(this.index===4)this.phase='complete';else{this.index++;this.resetRound();}this.save();return true;}
  save(){try{this.storage?.setItem(this.key,JSON.stringify({version:1,ids:this.ids,index:this.index,phase:this.phase,round:this.round,results:this.results,best:this.best}));}catch{}}
  restore(saved){
    if(!Array.isArray(saved.ids)||saved.ids.length!==5||new Set(saved.ids).size!==5||saved.ids.some(id=>!this.pool.some(puzzle=>puzzle.id===id)))return;
    const index=bounded(saved.index,4),results=Array.isArray(saved.results)?saved.results:[];
    if(results.length<index||results.length>index+1||results.some((result,i)=>result?.id!==saved.ids[i]||typeof result.solved!=='boolean'||typeof result.clean!=='boolean'))return;
    const phase=['ready','observe','paused','answer','play','result','complete'].includes(saved.phase)?saved.phase:'ready';
    if((phase==='result'||phase==='complete')&&results.length!==index+1||phase==='complete'&&index!==4||!['result','complete'].includes(phase)&&results.length!==index)return;
    if(this.mode==='memory'&&phase==='play'||this.mode==='route'&&['observe','answer'].includes(phase))return;
    const puzzle=this.pool.find(item=>item.id===saved.ids[index]),data=saved.round;
    if(!data)return;
    const targets=puzzle.targets||[puzzle.target],answers=Array.isArray(data.answers)?data.answers:[];
    if(this.mode==='memory'&&(answers.length>targets.length||answers.some((square,i)=>square!==targets[i])||answers.length===targets.length&&!['result','complete'].includes(phase)))return;
    const resume=phase==='paused'?(data.resumePhase||(this.mode==='memory'?'observe':'play')):phase;
    if(phase==='paused'&&(this.mode==='memory'?!['observe','answer'].includes(resume):resume!=='play'))return;
    if(this.mode==='route'){
      if(!Array.isArray(data.path)||data.path[0]!==puzzle.from||data.path.length>10000)return;
      for(let i=1;i<data.path.length;i++)if(!knightStep(puzzle,data.path[i-1],data.path[i]).allowed)return;
    }
    this.ids=saved.ids;this.index=index;this.results=results;this.resetRound();
    if(this.mode==='route')this.round.path=data.path;
    this.round.misses=bounded(data.misses,10000);this.round.hints=bounded(data.hints,10000);this.round.undos=bounded(data.undos,10000);this.round.retries=bounded(data.retries,10000);
    if(this.mode==='memory'){
      this.round.answers=answers;this.round.questionHints=bounded(data.questionHints??data.hints,2);
    }
    this.round.remaining=bounded(data.remaining,LAB_LEVELS[this.level].seconds*1000);
    this.round.solveRemaining=Number.isFinite(data.solveRemaining)?bounded(data.solveRemaining,this.solveLimit):this.solveLimit;
    this.round.timedOut=data.timedOut===true||this.round.solveRemaining===0;
    this.round.feedback=typeof data.feedback==='string'?data.feedback.slice(0,350):'';
    this.round.last=data.last&&squareName(data.last.square)&&['wrong','correct'].includes(data.last.kind)?data.last:null;
    this.round.hintSquare=squareName(data.hintSquare)?data.hintSquare:null;
    this.phase=phase;
    if(phase==='paused'||phase==='observe'||this.timed&&['answer','play'].includes(phase)&&!this.round.timedOut){this.round.resumePhase=resume==='observe'&&this.round.remaining===0?'answer':resume;this.phase='paused';}
  }
}
