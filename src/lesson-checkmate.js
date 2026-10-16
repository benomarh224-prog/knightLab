import { Chess } from 'chess.js';

export function lessonCheckmate(player) {
  const session=player.exploration||player.session;
  if(player.stage!=='try'||!session)return null;
  const chess=new Chess(session.fen);
  if(!chess.isCheckmate())return null;
  return {fen:session.fen,winner:chess.turn()==='w'?'Black':'White',
    canExplore:player.exploring?session.canUndo:session.cursor>0};
}

export function exploreBeforeCheckmate(player) {
  const result=lessonCheckmate(player);
  if(!result?.canExplore)return false;
  if(!player.exploring&&!player.startExploring({fresh:true}))return false;
  // Rewind the free branch only. The solved exercise and earned progress stay intact.
  if(!player.exploration.undo())return false;
  player.save();return true;
}

export function createLessonCheckmateDialog({dialog,title,description,continueButton,exploreButton,closeButton,read,onContinue,onExplore,focusBoard,otherDialogOpen=()=>false,beforeOpen=()=>{}}) {
  let shown=null,actionClose=false,advancing=false;
  function close(){actionClose=true;dialog.close();}
  function explore(){const state=read();close();if(state?.canExplore)onExplore();else focusBoard();}
  continueButton.onclick=()=>{
    close();advancing=true;
    try{onContinue();}finally{advancing=false;shown=read()?.key||null;}
  };
  exploreButton.onclick=explore;closeButton.onclick=explore;
  dialog.addEventListener('cancel',event=>{event.preventDefault();explore();});
  dialog.addEventListener('close',()=>{if(!actionClose)focusBoard();actionClose=false;});
  function sync(){
    if(advancing)return;
    const state=read();
    if(state?.busy)return;
    if(!state){shown=null;if(dialog.open)close();return;}
    if(shown===state.key||otherDialogOpen())return;
    title.textContent='Checkmate!';
    description.textContent=`${state.winner} wins. ${state.canExplore?'Continue your lesson, or go back one move to explore another line.':'Continue your lesson or close this result to review the position.'}`;
    continueButton.textContent=state.continueLabel||'Continue lesson';
    exploreButton.textContent=state.canExplore?'Done · Free play':'Done';
    shown=state.key;beforeOpen();dialog.showModal();continueButton.focus({preventScroll:true});
  }
  return {sync};
}
