import{Chess}from'chess.js';
import{parseGame,DEMO_PGN}from'./game.js';
import{LAB_PUZZLES}from'./board-lab.js';
import{pieceSvg}from'./pieces.js';
import{squareGrid}from'./square-practice.js';
import{finishBoard}from'./board-surface.js';
import{animatePieces,moveTransitions}from'./piece-motion.js';
import{COURSES}from'./courses.js';

const parsed=parseGame(DEMO_PGN);
const explanations=[
  'White’s knight captures the pawn on b5.',
  'Black’s c-pawn captures the knight on b5.',
  'White’s bishop recaptures on b5 with check.',
  'Black’s knight moves to d7, blocking the check.',
  'Queenside castling brings the rook to d1.',
];
export function homeReviewFrames(){
  return parsed.moves.slice(18,23).map((move,i)=>({fen:move.after,move,label:`${move.before.split(' ')[5]}${move.color==='w'?'.':'…'} ${move.san}`,explanation:explanations[i]}));
}
export function homeLabFacts(){
  const all=Object.values(LAB_PUZZLES.memory).flat().length+Object.values(LAB_PUZZLES.route).flat().length;
  const expert=LAB_PUZZLES.memory.expert.length+LAB_PUZZLES.route.expert.length;
  const distances=LAB_PUZZLES.route.expert.map(p=>p.distance);
  return{total:all,expert,minHops:Math.min(...distances),maxHops:Math.max(...distances)};
}
function paintSampleBoard(board,frame){
  const chess=new Chess(frame.fen);
  board.innerHTML=squareGrid().map((square,i)=>{
    const piece=chess.get(square),dark=(square.charCodeAt(0)-97+Number(square[1]))%2===1,last=[frame.move.from,frame.move.to].includes(square);
    return `<span class="square${dark?' dark':''}${last?' last':''}" data-square="${square}">${i%8===0?`<span class="rank" aria-hidden="true">${square[1]}</span>`:''}${i>=56?`<span class="file" aria-hidden="true">${square[0]}</span>`:''}${piece?pieceSvg(piece):''}</span>`;
  }).join('');
  finishBoard(board,chess);
  board.setAttribute('aria-label',`Sample Opera Game position after ${frame.label}`);
}

export function createHomeExperience({openSample,doc=document,win=window}){
  const root=doc.querySelector('[data-page-view="home"]');if(!root)return;
  const get=id=>doc.getElementById(id),frames=homeReviewFrames();let index=0,painted=null,initialized=false;
  function render(){
    const frame=frames[index],board=get('home-review-board');
    paintSampleBoard(board,frame);
    const next={game:parsed,fen:frame.fen,last:frame.move,flipped:false};animatePieces(board,moveTransitions(painted,next));painted=next;
    get('home-review-move').textContent=frame.label;
    get('home-review-explanation').textContent=frame.explanation;
    get('home-review-back').disabled=index===0;get('home-review-next').disabled=index===frames.length-1;
    get('home-review-step').textContent=`${index+1} of ${frames.length}`;
  }
  get('home-review-back').onclick=()=>{index=Math.max(0,index-1);render();};
  get('home-review-next').onclick=()=>{index=Math.min(frames.length-1,index+1);render();};
  get('home-review-sample').onclick=()=>openSample();
  for(const count of root.querySelectorAll('[data-calculation-count]'))count.textContent=String(COURSES.calculation.lessons.length);
  const facts=homeLabFacts();get('home-lab-total').textContent=String(facts.total);
  get('home-lab-expert').textContent=`${facts.expert} expert`;
  // No content depends on animation or IntersectionObserver support.
  if(win.IntersectionObserver){
    const observer=new win.IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('home-arrived');observer.unobserve(entry.target);}},{threshold:.12});
    for(const element of root.querySelectorAll('[data-home-reveal]'))observer.observe(element);
  }
  return{
    activate(){if(initialized)return;initialized=true;render();root.classList.add('home-enhanced');},
    showSample(board,caption){
      if(!board.hidden)return;
      const frame=frames[0];
      paintSampleBoard(board,frame);
      board.hidden=false;
      caption.textContent=`${frame.label} · ${frame.explanation}`;
      caption.hidden=false;
    },
  };
}
