import { AnalysisLine } from './analysis-line.js';
import { Chess } from 'chess.js';
import { Engine } from './engine.js';
import { formatEvaluation } from './game.js';
const $=id=>document.getElementById(id);
const coord=move=>move.from+move.to+(move.promotion||'');

export function createInlineAnalysis({context,pause,resume,onChange,playSound,createEngine=()=>new Engine()}) {
  let line=null, selected=null, promotion=null, engine=null, run=0, busy=false, restore=false, savedGame=null, message='';
  function cancel() { run++; engine?.destroy(); engine=null; busy=false; }
  function reset() { cancel(); line=null; selected=null; promotion=null; restore=false; $('line-controls').open=false; }
  function exit(shouldResume=true) {
    const restart=restore && savedGame===context().parsed;
    reset(); onChange(); if (restart && shouldResume) resume(); return restart;
  }
  async function evaluate() {
    cancel(); if (!line) return;
    const current=run, activeLine=line, snapshot=line.snapshot(), active=createEngine();
    engine=active; busy=true; onChange();
    try {
      for (const index of [...new Set([Math.max(0,line.cursor-1),line.cursor])]) {
        if (line.scores[index]) continue;
        const score=await active.evaluate(line.fenAt(index),650,line.history(index));
        if (current!==run || line!==activeLine || !line.matches(snapshot)) return;
        line.scores[index]=score; onChange();
      }
      message=line.chess.isCheckmate()?'Checkmate. Undo to explore a different continuation.':line.chess.isStalemate()?'Stalemate. Undo to try another idea.':line.chess.isDraw()?'Drawn position. You can still explore legal moves.':`${line.chess.turn()==='w'?'White':'Black'} to move. You control both sides.`;
    } catch(error) { if(current===run) message=error.message; }
    finally { active.destroy(); if(current===run) {engine=null;busy=false;onChange();} }
  }
  function start(ply=context().ply, best=null, {silent=false}={}) {
    if (line) exit(false);
    const source=context(); restore=pause(); savedGame=source.parsed;
    const history={startFen:source.parsed.fens[0],moves:source.parsed.moves.slice(0,ply).map(coord)};
    line=new AnalysisLine(source.parsed.fens[ply],source.evaluations[ply]||null,history);
    selected=null; promotion=null; message='Tap a piece, then a highlighted square. You control both sides.';
    if (best && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(best)) attempt(best.slice(0,2),best.slice(2,4),best[4]);
    else if(!silent) evaluate();
  }
  function attempt(from,to,piece) {
    if (!line) return;
    const outcome=line.play(from,to,piece);
    if (outcome.status==='promotion') { promotion={from,to}; onChange(); return; }
    if (outcome.status!=='played') { message='That move is not legal. Choose a highlighted square.'; $('line-controls').open=true; onChange(); return; }
    selected=null; promotion=null; message=`Exploring ${outcome.move.san}. The original game is unchanged.`;
    playSound(outcome.move); evaluate();
  }
  function select(square, repaint=true) {
    if (promotion) return;
    if(!line) {
      const source=context(),chess=new Chess(source.parsed.fens[source.ply]);
      if(!square||!chess.moves({square}).length)return;
      start(source.ply,null,{silent:true});
      selected=square;
      if(repaint)evaluate();
      return;
    }
    if(!square){selected=null;if(repaint)onChange();return;}
    const piece=line.chess.get(square);
    selected=piece?.color===line.chess.turn() ? square : null;
    if(repaint) onChange();
  }
  function click(square) {
    if (promotion) return;
    if(!line){select(square);return;}
    if (selected && square!==selected && line.legal(selected).some(move=>move.to===square)) attempt(selected,square);
    else select(selected===square?null:square);
  }
  function jump(cursor) {
    if (!line) return;
    cancel(); line.jump(cursor); selected=null; promotion=null; evaluate();
  }
  function tryBest(best,{replaceLast=false}={}) {
    if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(best||''))return false;
    const source=context(),cursor=line?Math.max(0,line.cursor-(replaceLast?1:0)):Math.max(0,source.ply-(replaceLast?1:0));
    const fen=line?line.fenAt(cursor):source.parsed.fens[cursor];
    // Validate against the exact position that produced this recommendation before rewinding.
    try {new Chess(fen).move({from:best.slice(0,2),to:best.slice(2,4),promotion:best[4]});}catch{return false;}
    if(line){cancel();line.jump(cursor);selected=null;promotion=null;attempt(best.slice(0,2),best.slice(2,4),best[4]);}
    else start(cursor,best);
    return true;
  }
  $('line-exit').onclick=()=>exit();
  $('line-undo').onclick=()=>{if(line)jump(line.cursor-1);};
  $('line-reset').onclick=()=>{if(line){cancel();line.reset();selected=null;promotion=null;evaluate();}};
  $('line-reply').onclick=()=>{const source=context(),best=line?line.score?.best:source.evaluations[source.ply]?.best;if(best&&!busy)tryBest(best);};
  $('line-retry').onclick=()=>evaluate();
  $('line-moves').onclick=event=>{const button=event.target.closest('[data-line-ply]');if(button)jump(Number(button.dataset.linePly));};
  for(const button of document.querySelectorAll('[data-line-promotion]')) button.onclick=()=>{if(promotion)attempt(promotion.from,promotion.to,button.dataset.linePromotion);};
  $('line-promotion-cancel').onclick=()=>{promotion=null;selected=null;onChange();};
  function paint() {
    document.querySelector('.board-card').classList.toggle('exploring',Boolean(line));
    $('line-toolbar').hidden=!line; $('line-controls').hidden=!line;
    $('try-move').setAttribute('aria-pressed',String(Boolean(line)));
    $('try-move').classList.toggle('toggled',Boolean(line));
    const source=context(),chess=line?.chess||new Chess(source.parsed.fens[source.ply]),score=line?line.score:source.evaluations[source.ply];
    $('analysis-board-instruction').textContent=chess.isCheckmate()?'Checkmate':chess.isStalemate()?'Stalemate':`${chess.turn()==='w'?'White':'Black'} to move · ${line?'Free play':'Drag or tap a piece'}`;
    $('line-undo').hidden=!line;
    $('line-undo').disabled=!line?.cursor||Boolean(promotion);
    $('line-reply').disabled=busy||!score?.best||!chess.moves().length||Boolean(promotion);
    if (!line) return;
    if(promotion||!busy&&!line.score)$('line-controls').open=true;
    $('line-message').textContent=busy?'Stockfish is checking this continuation…':message;
    $('line-score').textContent=line.score?formatEvaluation(line.score):'…';
    $('line-reset').disabled=!line.entries.length;
    $('line-retry').hidden=busy||Boolean(line.score);
    $('line-promotion').hidden=!promotion;
    $('line-moves').innerHTML='<button data-line-ply="0" aria-current="'+(line.cursor===0?'step':'false')+'">Start</button>'+line.entries.map((move,i)=>`<button data-line-ply="${i+1}" aria-current="${line.cursor===i+1?'step':'false'}">${move.before.split(' ')[5]}${move.color==='w'?'.':'…'} ${move.san}</button>`).join('');
  }
  return {get active(){return Boolean(line);},get line(){return line;},get selected(){return selected;},get targets(){return new Set(selected?line.legal(selected).map(move=>move.to):[]);},start,exit,reset,click,select,attempt,jump,paint,
    refresh(){if(line&&!busy&&!line.score)evaluate();else onChange();},tryBest};
}
