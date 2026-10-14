const $=id=>document.getElementById(id);

export function createBoardCoach({showBoard,navigate}) {
  const panel=$('coach-panel'), card=$('board-coach-card');
  const board=document.querySelector('.board-card');
  const triggers=['board-coach-toggle','board-coach','coach-tab','mobile-coach-tab'].map($);
  const players=document.createElement('div');
  players.className='board-players';
  document.querySelector('.board-area').before(players,card);
  players.append(...board.querySelectorAll(':scope > .player-row'));
  card.insertBefore(panel,$('coach-playback'));
  panel.querySelector('.insight-heading').append($('board-coach-close'));
  card.querySelector('.coach-card-heading').className='sr-only';
  card.hidden=false; panel.hidden=false;
  panel.setAttribute('role','region');
  panel.setAttribute('aria-labelledby','board-coach-title');
  for(const trigger of triggers)trigger.setAttribute('aria-expanded','true');
  function close(restoreFocus=false) {
    card.classList.remove('is-expanded');
    $('board-coach-close').textContent='Details';
    $('board-coach-close').setAttribute('aria-expanded','false');
    $('board-coach-close').setAttribute('aria-label','Show coach details');
    if(restoreFocus)$('board-coach-close').focus({preventScroll:true});
  }
  function open() {
    showBoard(); close();
    reveal();
  }
  function reveal() {
    if(!matchMedia('(max-width:860px)').matches)return;
    const area=board.querySelector('#board').getBoundingClientRect();
    if(!area.height)return;
    const focus=Boolean(board.closest('dialog[open]'));
    if(card.getBoundingClientRect().top<(focus?12:96)||area.bottom>innerHeight-(focus?12:64)){
      $('board-top').scrollIntoView({block:'start',behavior:'instant'});
    }
  }
  for(const trigger of triggers)trigger.onclick=open;
  $('board-coach-close').onclick=()=>{
    if(card.classList.contains('is-expanded')){close();reveal();return;}
    card.classList.add('is-expanded');
    $('board-coach-close').textContent='Less';
    $('board-coach-close').setAttribute('aria-expanded','true');
    $('board-coach-close').setAttribute('aria-label','Collapse coach details');
  };
  $('coach-previous').onclick=()=>navigate(-1);
  $('coach-next').onclick=()=>navigate(1);
  document.addEventListener('keydown',event=>{
    if(card.classList.contains('is-expanded') && event.key==='Escape'){
      event.preventDefault();event.stopImmediatePropagation();close(true);reveal();
    }
  },true);
  return {open,close,reveal};
}
