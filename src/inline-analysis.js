import {navigationSoundMove} from './sound.js';
import { AnalysisLine } from './analysis-line.js';
import { Chess } from 'chess.js';
import { Engine } from './engine.js';
import { formatEvaluation } from './game.js';
import { depthReady, positionSearch, strongerScore, PRECISION_DEPTH } from './review-quality.js';
const $=id=>document.getElementById(id);
const coord=move=>move.from+move.to+(move.promotion||'');

export function createInlineAnalysis({context,pause,resume,onChange,playSound,navigate=()=>{},createEngine=()=>new Engine()}) {
  let navigationAudio=0;
  let line=null, selected=null, promotion=null, engine=null, run=0, busy=false, restore=false, savedGame=null, message='', failed=false;
  function cancel(dispose=false) { run++; if(busy||dispose){engine?.destroy();engine=null;} busy=false; }
  function reset() { cancel(true); line=null; selected=null; promotion=null; restore=false; $('line-controls').open=false; }
  function exit(shouldResume=true) {
    const restart=restore && savedGame===context().parsed;
    reset(); onChange(); if (restart && shouldResume) resume(); return restart;
  }
  async function evaluate() {
    cancel(); if (!line) return;
    const current=run, activeLine=line, snapshot=line.snapshot(), active=engine||createEngine();
    engine=active; busy=true; failed=false; onChange();
    try {
      for (const index of [...new Set([Math.max(0,line.cursor-1),line.cursor])]) {
        if (depthReady(line.scores[index],PRECISION_DEPTH)) continue;
        const score=await active.evaluate(line.fenAt(index),positionSearch(PRECISION_DEPTH,line.scores[index]),line.history(index));
        if (current!==run || line!==activeLine || !line.matches(snapshot)) return;
        line.scores[index]=strongerScore(line.scores[index],score); onChange();
      }
      message=line.chess.isCheckmate()?'Checkmate. Undo to explore a different continuation.':line.chess.isStalemate()?'Stalemate. Undo to try another idea.':line.chess.isDraw()?'Drawn position. You can still explore legal moves.':`${line.chess.turn()==='w'?'White':'Black'} to move. You control both sides.`;
    } catch(error) { if(current===run){active.destroy();engine=null;failed=true;message=error.message;$('line-controls').open=true;} }
    finally { if(current===run) {busy=false;onChange();} }
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
    evaluate();playSound(outcome.move);
  }
  function select(square, repaint=true) {
    if (promotion) return;
    if(!line) {
      const source=context(),chess=new Chess(source.parsed.fens[source.ply]);
      if(!square||!chess.moves({square}).length)return;
      start(source.ply,null,{silent:true});
      selected=square;
      // Selecting a piece is a UI action, not a new engine search. Wait for an
      // accepted move so rapid tap/drag gestures do not repeatedly boot WASM.
      if(repaint)onChange();
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
    // Previous follows the shared game history, even across a variation's root.
    // No separate "return to game" mode or button is needed.
    if(cursor<0||!line.entries.length&&cursor>0){
      const source=context(),base=line.origin.moves.length;
      if(source.parsed.fens[base]===line.rootFen){
        if(cursor<0&&base){
          // Extend the same continuation backwards rather than throwing it
          // away. Next can now replay the learner's branch after going back.
          const previous=line,replacement=new AnalysisLine(source.parsed.fens[0],source.evaluations[0]||null);
          for(const move of [...source.parsed.moves.slice(0,base),...previous.entries])replacement.play(move.from,move.to,move.promotion);
          replacement.scores=[...Array.from({length:base},(_,i)=>source.evaluations[i]||null),...previous.scores];
          cancel();line=replacement;line.jump(Math.max(0,base+cursor));selected=null;promotion=null;evaluate();
          playSound(navigationSoundMove(source.parsed.moves,base,Math.max(0,base+cursor)),{eventId:'variation-'+(++navigationAudio)});return;
        }
        const restart=exit(false);navigate(base+cursor);if(restart)resume();return;
      }
    }
    const previous=line.cursor;cancel();line.jump(cursor);selected=null;promotion=null;evaluate();playSound(navigationSoundMove(line.entries,previous,line.cursor),{eventId:'variation-'+(++navigationAudio)});
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
  function playback(fen,moves,cursor,{analyze=true,resumeReview=false}={}){
    const source=context(),ply=source.parsed.fens.indexOf(fen);
    // The coach may be inspecting a position in the current explored line.
    let history;
    if(ply>=0)history={startFen:source.parsed.fens[0],moves:source.parsed.moves.slice(0,ply).map(coord)};
    else if(line){const index=[line.rootFen,...line.entries.map(move=>move.after)].indexOf(fen);if(index>=0)history=line.history(index);}
    if(!history)return false;
    const replacement=new AnalysisLine(fen,ply>=0?source.evaluations[ply]||null:null,history);
    let shared=ply>=0;
    for(const move of moves){
      if(move.before!==replacement.fen||replacement.play(move.from,move.to,move.promotion).status!=='played')return false;
      const index=ply+replacement.cursor;
      shared=shared&&source.parsed.fens[index]===replacement.fen;
      if(shared)replacement.scores[replacement.cursor]=source.evaluations[index]||null;
    }
    replacement.jump(cursor);
    if(!line){const wasRunning=pause();restore=resumeReview||wasRunning;savedGame=source.parsed;}else cancel();
    line=replacement;selected=null;promotion=null;message='Coach continuation · use the move buttons to step through it. Your game is saved.';
    $('line-controls').open=analyze;if(analyze)evaluate();else onChange();return true;
  }
  $('line-undo').onclick=()=>{if(line)jump(line.cursor-1);};
  $('line-reset').onclick=()=>{if(line){cancel();line.reset();selected=null;promotion=null;evaluate();}};
  $('line-reply').onclick=()=>{const source=context(),best=line?line.score?.best:source.evaluations[source.ply]?.best;if(best&&!busy)tryBest(best);};
  $('line-retry').onclick=()=>evaluate();
  $('line-moves').onclick=event=>{const button=event.target.closest('[data-line-ply]');if(button)jump(Number(button.dataset.linePly));};
  for(const button of document.querySelectorAll('[data-line-promotion]')) button.onclick=()=>{if(promotion)attempt(promotion.from,promotion.to,button.dataset.linePromotion);};
  $('line-promotion-cancel').onclick=()=>{promotion=null;selected=null;onChange();};
  function paint() {
    document.querySelector('.board-card').classList.toggle('exploring',Boolean(line));
    $('line-toolbar').hidden=true; $('line-controls').hidden=!line;
    $('try-move').setAttribute('aria-pressed',String(Boolean(line)));
    $('try-move').classList.toggle('toggled',Boolean(line));
    const source=context(),chess=line?.chess||new Chess(source.parsed.fens[source.ply]),score=line?line.score:source.evaluations[source.ply];
    $('analysis-board-instruction').textContent=chess.isCheckmate()?'Checkmate':chess.isStalemate()?'Stalemate':`${chess.turn()==='w'?'White':'Black'} to move`;
    $('line-undo').hidden=!line;
    $('line-undo').disabled=!line?.cursor||Boolean(promotion);
    $('line-reply').disabled=busy||!score?.best||!chess.moves().length||Boolean(promotion);
    if (!line) return;
    if(promotion)$('line-controls').open=true;
    $('line-message').textContent=busy?'Stockfish is checking this continuation…':!failed&&line.score&&!depthReady(line.score,PRECISION_DEPTH)?'Preliminary evaluation · retry to deepen this position.':message;
    $('line-score').textContent=line.score?formatEvaluation(line.score):'…';
    $('line-reset').disabled=!line.entries.length;
    $('line-retry').hidden=busy||depthReady(line.score,PRECISION_DEPTH);
    $('line-promotion').hidden=!promotion;
    $('line-moves').innerHTML='<button data-line-ply="0" aria-current="'+(line.cursor===0?'step':'false')+'">Start</button>'+line.entries.map((move,i)=>`<button data-line-ply="${i+1}" aria-current="${line.cursor===i+1?'step':'false'}">${move.before.split(' ')[5]}${move.color==='w'?'.':'…'} ${move.san}</button>`).join('');
  }
  return {get active(){return Boolean(line);},get busy(){return busy;},get line(){return line;},get selected(){return selected;},get targets(){return new Set(selected?line.legal(selected).map(move=>move.to):[]);},start,exit,reset,click,select,attempt,jump,paint,
    suspend(){cancel();},refresh(){if(line&&!busy&&!depthReady(line.score,PRECISION_DEPTH))evaluate();else onChange();},tryBest,playback};
}
