import {Chess} from 'chess.js';
import {pieceSvg} from './pieces.js';
import {squareGrid} from './square-practice.js';
import {finishBoard} from './board-surface.js';
import {animatePieces,moveTransitions} from './piece-motion.js';

export function createGuidedExample({doc=document,storage,playSound=()=>{}}){
  const root=doc.getElementById('lesson-guided-example'),states=new Map();let current=null,key,painted=null;
  function paint(){
    if(!current)return;
    const {data,cursor}=current,chess=new Chess(data.fen);for(const san of data.moves.slice(0,cursor))chess.move(san,{strict:true});
    root.querySelector('[data-example-instruction]').textContent=data.instruction;
    root.querySelector('[data-example-note]').textContent=cursor?data.explanation:'Watch this example, then apply the same rule in a different position.';
    root.querySelector('[data-example-board]').innerHTML=squareGrid(data.orientation).map((square,index)=>{
      const piece=chess.get(square),dark=(square.charCodeAt(0)-97+Number(square[1]))%2===1;
      return `<div class="square${dark?' dark':''}" data-square="${square}" aria-label="${square}">${index%8===0?`<span class="rank">${square[1]}</span>`:''}${index>=56?`<span class="file">${square[0]}</span>`:''}${piece?pieceSvg(piece):''}</div>`;
    }).join('');
    const board=root.querySelector('[data-example-board]'),position={game:current,fen:chess.fen(),last:chess.history({verbose:true}).at(-1),flipped:data.orientation==='b'};
    finishBoard(board,chess);animatePieces(board,moveTransitions(painted,position));painted=position;
    root.querySelector('button').textContent=cursor===data.moves.length?'Replay example':'Show next move';
  }
  root.innerHTML='<h3>Guided example</h3><p data-example-instruction></p><div class="lesson-board" data-example-board role="img" aria-label="Guided move example"></div><button type="button">Show next move</button><p data-example-note role="status" aria-live="polite"></p>';
  root.querySelector('button').onclick=()=>{if(!current)return;const chess=new Chess(current.data.fen);for(const san of current.data.moves.slice(0,current.cursor))chess.move(san);const accepted=current.cursor<current.data.moves.length?chess.move(current.data.moves[current.cursor]):null;current.cursor=current.cursor===current.data.moves.length?0:current.cursor+1;try{storage?.setItem(key,String(current.cursor));}catch{}paint();if(accepted)playSound(accepted);};
  return {update({lesson,progressKey,stage,conceptIndex}){
    root.hidden=!lesson.demonstration||stage!=='learn'||conceptIndex!==0;
    if(root.hidden)return;
    key=`${progressKey}:guided-example-v1:${lesson.id}`;
    if(!states.has(key)){
      const data=lesson.demonstration,game=new Chess(data.fen);for(const san of data.moves)game.move(san,{strict:true});
      let saved=0;try{saved=Number(storage?.getItem(key));}catch{}
      states.set(key,{data,cursor:Number.isInteger(saved)?Math.max(0,Math.min(saved,data.moves.length)):0});
    }
    current=states.get(key);paint();
  }};
}
