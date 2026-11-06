import{Chess}from'chess.js';
import{BoardLabSession,LAB_LEVELS,LAB_MODES,LAB_PREFERENCES,readLabPreferences,pieceName}from'./board-lab.js';
import{pieceSvg}from'./pieces.js';
import{squareGrid,squareNeighbor}from'./square-practice.js';
import{knightStep,routePosition,shortestKnightPath}from'./board-lab-rules.js';
import{enableBoardDrag}from'./board-surface.js';
import{createCompactMenu}from'./simple-ui.js';
import{animatePieces}from'./piece-motion.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createBoardLabUI({storage,playSound=()=>{},feedbackSound=()=>{}}){
  const $=id=>document.getElementById(id),preferences=readLabPreferences(storage),sessions=new Map(),board=$('lab-board');
  let session=null,active=false,timer=null,lastTick=0,selected=false,painted=null,soundId=0;
  const menu=createCompactMenu({host:$('lab-tools'),controls:['lab-flip','lab-coordinates','lab-countdown','lab-restart'].map($),label:'More'});
  menu.classList.add('lab-options');
  const orientation=()=>((session.puzzle.orientation==='b')!==preferences.flipped)?'b':'w';
  const savePreferences=()=>{try{storage?.setItem(LAB_PREFERENCES,JSON.stringify(preferences));}catch{}};
  function stopClock(pause=false){if(timer!==null)clearInterval(timer);timer=null;if(pause)session?.pause();}
  function startClock(){
    stopClock();if(!active||session?.phase!=='observe'||!preferences.timed||document.hidden)return;
    const owner=session;lastTick=performance.now();
    timer=setInterval(()=>{
      if(!active||session!==owner||document.hidden){stopClock(true);return;}
      const now=performance.now(),changed=session.tick(now-lastTick);lastTick=now;
      if(changed){stopClock();const moveFocus=$('lab-primary').contains(document.activeElement);render();if(moveFocus)focusBoard();}
      else paintTimer();
    },150);
  }
  function paintTimer(){
    $('lab-timer').textContent=session.phase==='observe'&&preferences.timed?`${Math.ceil(session.round.remaining/1000)}s`:session.phase==='paused'?'Paused':session.mode==='route'&&session.phase==='play'?`${session.round.path.length-1} hops`:'';
  }
  function openSession(){
    stopClock(true);const key=preferences.mode+':'+preferences.level;
    if(!sessions.has(key))sessions.set(key,new BoardLabSession({storage,mode:preferences.mode,level:preferences.level}));
    session=sessions.get(key);selected=false;painted=null;render();
  }
  function text(){
    const {mode,phase,puzzle,round}=session;
    if(phase==='complete')return {question:'Session complete.',copy:'Your five rounds are saved.',action:'New session →'};
    if(phase==='result')return {question:session.results.at(-1).solved?'Found it.':'Position reviewed.',copy:round.feedback,action:session.index===4?'See results →':'Next puzzle →'};
    if(mode==='memory'){
      if(phase==='ready')return {question:'Remember the position.',copy:'Study the pieces. Hide them when you’re ready.',action:'Start round'};
      if(phase==='observe')return {question:'Take a good look.',copy:preferences.timed?'Keep the pieces in mind before they disappear.':'Take your time, then hide the pieces.',action:'Ready — hide pieces'};
      if(phase==='paused')return {question:'Your round is paused.',copy:'Resume the countdown, or switch it off in More.',action:'Resume round'};
      return {question:`Where was the ${pieceName(session.targetPiece).toLowerCase()}?`,copy:'Tap the square you remember.',action:null};
    }
    return {question:`Reach ${puzzle.to} in ${puzzle.distance} knight moves.`,copy:'Only your knight moves. Avoid occupied and attacked squares.',action:phase==='ready'?'Start route':null};
  }
  function render(){
    if(!session)return;const content=text(),{mode,phase,puzzle,round}=session,interactive=mode==='memory'?phase==='answer':['ready','play'].includes(phase);
    document.querySelectorAll('[data-lab-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.labMode===mode)));
    $('lab-level').value=session.level;$('lab-round').textContent=phase==='complete'?'Five rounds complete':`Round ${session.index+1} of 5`;
    $('lab-question').textContent=content.question;$('lab-copy').textContent=content.copy;
    $('lab-primary').hidden=!content.action;$('lab-primary').textContent=content.action||'';
    $('lab-answer-actions').hidden=Boolean(content.action);
    $('lab-feedback').textContent=['result','complete'].includes(phase)?'':round.feedback;
    const hasFeedback=Boolean($('lab-feedback').textContent);$('lab-feedback').hidden=!hasFeedback;$('lab-copy').hidden=hasFeedback;
    $('lab-feedback').dataset.kind=round.last?.kind||'';
    $('lab-hint').hidden=!['answer','play'].includes(phase);$('lab-reveal').hidden=!['answer','play'].includes(phase);
    $('lab-hint').disabled=mode==='memory'?round.hints>=2:Boolean(round.hintSquare);
    $('lab-reveal').textContent=mode==='memory'?'Show position':'Show route';
    $('lab-undo').hidden=mode!=='route'||phase!=='play';$('lab-undo').disabled=round.path.length<2;
    $('lab-countdown').hidden=mode!=='memory';$('lab-countdown').textContent=`Countdown ${preferences.timed?'on':'off'}`;$('lab-countdown').setAttribute('aria-pressed',String(preferences.timed));
    $('lab-coordinates').textContent=`Coordinates ${preferences.coordinates?'on':'off'}`;$('lab-coordinates').setAttribute('aria-pressed',String(preferences.coordinates));
    $('lab-best').textContent=`Best clean solves at this level: ${session.best}/5`;
    $('lab-view').textContent=`${orientation()==='b'?'Black':'White'} view${preferences.coordinates?'':' · Coordinates hidden'}`;
    $('lab-summary').hidden=phase!=='complete';
    $('lab-clean').textContent=String(session.cleanCount);$('lab-practiced').textContent=String(session.results.filter(item=>item.solved&&!item.clean).length);$('lab-studied').textContent=String(session.results.filter(item=>!item.solved).length);
    const retained=board.contains(document.activeElement)?document.activeElement.dataset.square:null;
    renderBoard(retained);paintTimer();
    board.setAttribute('aria-label',interactive?content.question:mode==='memory'?'Memory study position':'Knight trail position');
    $('lab-help-memory').hidden=mode!=='memory';$('lab-help-route').hidden=mode!=='route';
  }
  function renderBoard(focusSquare){
    const {mode,phase,puzzle,round}=session,view=orientation(),grid=squareGrid(view),chess=mode==='route'?routePosition(puzzle,session.current):new Chess(puzzle.fen);
    const routeRevealed=mode==='route'&&phase==='result'&&!session.results.at(-1).solved;
    const path=routeRevealed?shortestKnightPath(puzzle):[],show=session.visiblePieces,tab=focusSquare||mode==='route'&&session.current||grid[56];
    board.innerHTML=grid.map((square,index)=>{
      const piece=show?chess.get(square):null,dark=(square.charCodeAt(0)-97+Number(square[1]))%2===1;
      const target=mode==='route'&&square===puzzle.to,found=mode==='memory'&&['result','complete'].includes(phase)&&square===puzzle.target;
      const last=round.last?.square===square,legal=mode==='route'&&selected&&phase==='play'&&knightStep(puzzle,session.current,square).allowed;
      const label=`${square}${piece?', '+pieceName(piece):', empty'}${target?', goal':''}${found?', answer':''}`;
      return `<button type="button" class="square${dark?' dark':''}${target?' lab-goal':''}${found?' lab-found':''}${last&&round.last.kind==='wrong'?' lab-wrong':''}${round.hintSquare===square?' lab-hint-square':''}${legal?' legal-target':''}${selected&&square===session.current?' piece-selected':''}" data-square="${square}" tabindex="${square===tab?0:-1}" aria-label="${escape(label)}">${preferences.coordinates&&index%8===0?`<span class="rank" aria-hidden="true">${square[1]}</span>`:''}${preferences.coordinates&&index>=56?`<span class="file" aria-hidden="true">${square[0]}</span>`:''}${piece?pieceSvg(piece):''}${target?'<span class="lab-goal-mark" aria-hidden="true">◎</span>':''}${path.includes(square)?`<span class="lab-route-step" aria-hidden="true">${path.indexOf(square)+1}</span>`:''}${last&&round.last.kind==='wrong'?'<span class="lab-miss-mark" aria-hidden="true">×</span>':''}</button>`;
    }).join('');
    const position={game:puzzle,current:mode==='route'?session.current:null,orientation:view};
    if(mode==='route'&&painted?.game===puzzle&&painted.orientation===view&&painted.current!==position.current)animatePieces(board,[{from:painted.current,to:position.current}]);
    painted=position;
    if(focusSquare)board.querySelector(`[data-square="${focusSquare}"]`)?.focus({preventScroll:true});
  }
  function focusBoard(){(board.querySelector('[tabindex="0"]')||board).focus({preventScroll:true});}
  function attempt(square){
    const from=session.current,outcome=session.attempt(square);if(['inactive','invalid'].includes(outcome.status))return;
    selected=false;render();board.querySelector(`[data-square="${square}"]`)?.focus({preventScroll:true});
    if(outcome.status==='retry')feedbackSound('incorrect');
    else if(session.mode==='route'&&['moved','correct'].includes(outcome.status)){
      try{const move=routePosition(session.puzzle,from).move({from,to:square});playSound(move,{eventId:'board-lab-'+(++soundId)});}catch{}
    }else if(outcome.status==='correct')feedbackSound('complete');
  }
  board.onclick=event=>{
    const square=event.target.closest('[data-square]')?.dataset.square;if(!square||!session)return;
    if(session.mode==='route'&&square===session.current&&['ready','play'].includes(session.phase)){if(session.phase==='ready')session.start();selected=!selected;render();board.querySelector(`[data-square="${square}"]`)?.focus({preventScroll:true});return;}
    attempt(square);
  };
  board.addEventListener('keydown',event=>{
    if(!session||!event.key.startsWith('Arrow'))return;const next=squareNeighbor(event.target.dataset.square,event.key,orientation());event.preventDefault();
    if(next){for(const tile of board.querySelectorAll('button'))tile.tabIndex=tile.dataset.square===next?0:-1;board.querySelector(`[data-square="${next}"]`).focus({preventScroll:true});}
  });
  enableBoardDrag(board,{read:()=>({chess:session?.mode==='route'?routePosition(session.puzzle,session.current):null,disabled:!active||session?.mode!=='route'||!['ready','play'].includes(session.phase)}),
    select:()=>{if(session.phase==='ready')session.start();selected=true;render();},play:(from,to)=>{if(from===session.current)attempt(to);}});
  $('lab-primary').onclick=()=>{
    stopClock();const phase=session.phase;
    if(phase==='complete')session.newSession();else if(phase==='result')session.next();else if(phase==='observe')session.hide();else session.start();
    selected=false;painted=null;render();startClock();
    if(['answer','play'].includes(session.phase))focusBoard();else if(!$('lab-primary').hidden)$('lab-primary').focus({preventScroll:true});
    if(session.phase==='complete')feedbackSound('complete');
  };
  $('lab-hint').onclick=()=>{session.hint();render();$('lab-hint').focus({preventScroll:true});};
  $('lab-reveal').onclick=()=>{stopClock();session.reveal();selected=false;render();$('lab-primary').focus({preventScroll:true});};
  $('lab-undo').onclick=()=>{if(session.undo()){selected=false;render();focusBoard();}};
  $('lab-flip').onclick=()=>{preferences.flipped=!preferences.flipped;savePreferences();painted=null;render();};
  $('lab-coordinates').onclick=()=>{preferences.coordinates=!preferences.coordinates;savePreferences();render();};
  $('lab-countdown').onclick=()=>{preferences.timed=!preferences.timed;savePreferences();stopClock();render();startClock();};
  $('lab-restart').onclick=()=>{stopClock();session.newSession();selected=false;painted=null;render();$('lab-primary').focus({preventScroll:true});};
  for(const button of document.querySelectorAll('[data-lab-mode]'))button.onclick=()=>{preferences.mode=button.dataset.labMode;savePreferences();openSession();};
  $('lab-level').onchange=()=>{preferences.level=$('lab-level').value;savePreferences();openSession();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&session?.phase==='observe'){stopClock(true);if(active)render();}});
  window.addEventListener('pagehide',()=>{stopClock(true);session?.save();});
  return {setActive(value){active=value;if(!value){stopClock(true);menu.open=false;}else{if(!session)openSession();else render();$('lab-title').focus({preventScroll:true});}},};
}
