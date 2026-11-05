import { Chess } from 'chess.js';
import { moveIdea } from './coach.js';
import { pieceNames } from './training.js';

function moveCaption(move,context){
  const side=move.color==='w'?'White':'Black',idea=moveIdea(move);
  if(move.san.endsWith('#'))return `${side} plays ${move.san}: checkmate.`;
  if(move.promotion)return `${side} plays ${move.san}, promoting to a ${pieceNames[move.promotion]}.`;
  if(context.report?.rating==='Brilliant'&&context.move?.before===move.before&&context.move?.san===move.san)return `${move.san} offers your ${pieceNames[move.piece]} on ${move.to}.`;
  if(move.captured)return `${side} plays ${move.san}, capturing the ${pieceNames[move.captured]} on ${move.flags.includes('e')?move.to[0]+move.from[1]:move.to}.`;
  if(move.flags.includes('k')||move.flags.includes('q'))return `${move.san} castles the king and activates the rook.`;
  if(move.san.includes('+'))return `${side} plays ${move.san}, giving check.`;
  if(idea.includes('passed pawn'))return `${move.san} advances a passed pawn toward promotion.`;
  if(idea.includes('closer to the center'))return `${move.san} brings the king toward the center.`;
  if(idea.includes('open ')||idea.includes('half-open'))return `${move.san} places the ${pieceNames[move.piece]} on the ${idea.includes('half-open')?'half-open':'open'} ${move.to[0]}-file.`;
  if(idea.includes('develops'))return `${move.san} develops the ${pieceNames[move.piece]}.`;
  return `${side} plays ${move.san}, moving the ${pieceNames[move.piece]} to ${move.to}.`;
}

// A temporary, read-only view over the existing board. It never writes game
// history, scores or an explored branch. Every displayed move is revalidated.
export function createCoachDemo({onChange=()=>{},onMove=()=>{},schedule=setTimeout,unschedule=clearTimeout,delay=1800}={}){
  let session=null,timer=null,generation=0,serial=0,sound=0;
  function clear(){generation++;if(timer!==null)unschedule(timer);timer=null;}
  function notify(){onChange();}
  function queue(){
    if(!session?.playing)return;
    const revision=generation;
    timer=schedule(()=>{timer=null;if(!session||revision!==generation||!session.playing)return;advance(session.index+1);queue();},delay);
  }
  function advance(index){
    if(!session)return false;
    const next=Math.max(0,Math.min(session.moves.length,index)),previous=session.index;
    session.index=next;if(next===session.moves.length)session.playing=false;
    if(next!==previous){const move=session.moves[next>previous?next-1:next];if(move)onMove(move,{eventId:`coach-demo-${session.id}-${++sound}`});}
    notify();return true;
  }
  function start({fen,moves,context={},kind='best',limit=4,index=0,autoplay=true}){
    let chess,validated=[];
    try{
      chess=new Chess(fen);
      for(const move of moves){
        if(move.before!==chess.fen())return false;
        const accepted=chess.move({from:move.from,to:move.to,promotion:move.promotion});
        if(accepted.after!==move.after)return false;
        validated.push(accepted);
      }
    }catch{return false;}
    if(!validated.length)return false;
    validated=validated.slice(0,Math.min(6,Math.max(1,limit)));
    clear();session={id:++serial,fen,moves:validated,context,kind,index:Math.max(0,Math.min(index,validated.length)),playing:false};
    session.playing=autoplay&&session.index<validated.length;notify();queue();return true;
  }
  function jump(index){if(!session)return;clear();session.playing=false;advance(index);}
  function toggle(){
    if(!session)return;
    clear();if(session.index===session.moves.length)session.index=0;
    session.playing=!session.playing;notify();queue();
  }
  function stop({notify:paint=true}={}){clear();session=null;if(paint)notify();}
  function pause({notify:paint=true}={}){if(!session?.playing)return;clear();session.playing=false;if(paint)notify();}
  function view(){
    if(!session)return null;
    const {fen,moves,index,context,kind}=session,last=moves[index-1]||null,next=moves[index];
    const current=last?.after||fen;
    const rootScore=kind==='reply'?context.after:context.before,score=index===0?rootScore:null;
    const phase=index===0?(kind==='reply'?'After your move · opponent replies first':'Before your move'):index===1&&kind==='reply'?'Immediate reply':index===1?(kind==='played'?'Your move':'Engine’s candidate'):index===2&&kind!=='reply'?'Opponent’s immediate reply':'Later in this line';
    return {fen:current,last,score,before:index===1?rootScore:null,arrow:next?next.from+next.to+(next.promotion||''):null,
      text:index===0?(kind==='reply'?'Watch the opponent’s reply after your move.':kind==='played'?'Watch your move, then the opponent’s reply.':'Watch the engine’s idea from before your move.'):`${phase}: ${moveCaption(last,context)}`,
      label:`Show me · ${index}/${moves.length}`,index,total:moves.length,playing:session.playing};
  }
  return {start,stop,pause,toggle,jump,view,get active(){return Boolean(session);},get session(){return session;}};
}
