const validSquare=value=>typeof value==='string'&&/^[a-h][1-8]$/.test(value);

export function squareGrid(orientation='w'){
  const files=orientation==='b'?'hgfedcba':'abcdefgh',ranks=orientation==='b'?'12345678':'87654321';
  return [...ranks].flatMap(rank=>[...files].map(file=>file+rank));
}

export function squareNeighbor(square,key,orientation='w'){
  const grid=squareGrid(orientation),index=grid.indexOf(square),delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[key];
  if(index<0||delta===undefined||key==='ArrowLeft'&&index%8===0||key==='ArrowRight'&&index%8===7)return null;
  return grid[index+delta]||null;
}

// Optional, data-driven warm-ups never alter a lesson's chess exercise or quiz.
// Saves use a separate namespace, keeping all existing lesson progress intact.
export class SquarePractice {
  constructor({data,storage,key}){
    this.targets=(data.targets||[]).map(value=>typeof value==='string'?{square:value,orientation:'w'}:{square:value.square,orientation:value.orientation==='b'?'b':'w'});
    if(!this.targets.length||this.targets.some(target=>!validSquare(target.square)))throw new Error('Square practice needs valid board coordinates');
    this.guided=Number.isInteger(data.guided)?Math.max(0,Math.min(this.targets.length,data.guided)):4;
    this.storage=storage;this.key=key;this.solved=[];this.labels=null;this.last=null;this.feedback='';
    this.signature=JSON.stringify(this.targets);
    try{
      const saved=JSON.parse(storage?.getItem(key)||'null');
      if(saved?.version===1&&saved.signature===this.signature){
        // Restore only a matching solved prefix, never an unchecked cursor.
        for(const token of Array.isArray(saved.solved)?saved.solved:[]){
          const target=this.targets[this.solved.length];
          if(!target||token!==`${target.orientation}:${target.square}`)break;
          this.solved.push(token);
        }
        this.labels=typeof saved.labels==='boolean'?saved.labels:null;
      }
    }catch{/* Private browsing and damaged saves still allow local practice. */}
  }
  get complete(){return this.solved.length===this.targets.length;}
  get target(){return this.targets[Math.min(this.solved.length,this.targets.length-1)];}
  get showCoordinates(){return this.labels??this.solved.length<this.guided;}
  get prompt(){return this.complete?'You know your way around.':`Click ${this.target.square}`;}
  attempt(square){
    if(!validSquare(square))return {status:'invalid'};
    if(this.complete)return {status:'complete'};
    const target=this.target,correct=square===target.square;
    this.last={square,orientation:target.orientation,correct};
    if(correct)this.solved.push(`${target.orientation}:${square}`);
    this.feedback=correct?(this.complete?'Well done! All squares found. Continue with the lesson, or practice again.':`Correct — ${square}. Now find ${this.target.square}.`):`That is ${square}. Try ${target.square} again.`;
    this.save();return {status:correct?'correct':'retry',completed:this.complete};
  }
  toggleCoordinates(){this.labels=!this.showCoordinates;this.save();}
  reset(){this.solved=[];this.labels=null;this.last=null;this.feedback='';this.save();}
  save(){try{this.storage?.setItem(this.key,JSON.stringify({version:1,signature:this.signature,solved:this.solved,labels:this.labels}));}catch{/* Keep progress in memory if storage is unavailable. */}}
}

export function createSquarePracticeUI({document:doc=document,storage,feedbackSound=()=>{}}){
  const get=id=>doc.getElementById(id),board=get('lesson-square-board'),models=new Map();
  board.before(get('lesson-square-view'));
  let trainer=null;
  function render(){
    if(!trainer)return;
    const focusSquare=board.contains(doc.activeElement)?doc.activeElement.dataset.square:null;
    const grid=squareGrid(trainer.target.orientation),last=trainer.last;
    get('lesson-square-progress').textContent=`Optional warm-up · ${trainer.complete?trainer.targets.length:trainer.solved.length+1} / ${trainer.targets.length}`;
    get('lesson-square-prompt').textContent=trainer.prompt;
    get('lesson-square-labels').textContent=`Coordinates ${trainer.showCoordinates?'on':'off'}`;
    get('lesson-square-labels').setAttribute('aria-pressed',String(trainer.showCoordinates));
    get('lesson-square-view').textContent=`${trainer.target.orientation==='b'?'Black':'White'} view · ${trainer.complete?`${trainer.targets.length} squares practiced.`:`File ${trainer.target.square[0]} (letter), rank ${trainer.target.square[1]} (number).`}`;
    get('lesson-square-feedback').textContent=trainer.feedback||(trainer.complete?'All squares found. Your practice is saved.':trainer.showCoordinates?'':'Coordinates are hidden. Try from memory, or turn them back on.');
    get('lesson-square-retry').hidden=!trainer.complete;
    board.innerHTML=grid.map((square,index)=>{
      const marked=last?.orientation===trainer.target.orientation&&last.square===square;
      const dark=(square.charCodeAt(0)-97+Number(square[1]))%2===1;
      return `<button type="button" class="square${dark?' dark':''}${marked?last.correct?' square-found':' square-missed':''}" data-square="${square}" aria-label="${square}" tabindex="${square===(focusSquare||grid[56])?0:-1}">${trainer.showCoordinates&&index%8===0?`<span class="rank" aria-hidden="true">${square[1]}</span>`:''}${trainer.showCoordinates&&index>=56?`<span class="file" aria-hidden="true">${square[0]}</span>`:''}${marked?`<strong aria-hidden="true">${last.correct?'✓':'×'}</strong>`:''}</button>`;
    }).join('');
    if(focusSquare)board.querySelector(`[data-square="${focusSquare}"]`)?.focus({preventScroll:true});
  }
  board.onclick=event=>{const square=event.target.closest('button[data-square]')?.dataset.square;if(trainer&&square){const outcome=trainer.attempt(square);if(outcome.status==='retry')feedbackSound('incorrect');else if(outcome.completed)feedbackSound('complete');render();}};
  board.addEventListener('keydown',event=>{
    if(!trainer)return;
    const next=squareNeighbor(event.target.dataset.square,event.key,trainer.target.orientation);
    if(!event.key.startsWith('Arrow'))return;
    event.preventDefault();
    if(next){const tile=board.querySelector(`[data-square="${next}"]`);for(const button of board.querySelectorAll('button'))button.tabIndex=button===tile?0:-1;tile.focus({preventScroll:true});}
  });
  get('lesson-square-labels').onclick=()=>{if(trainer){trainer.toggleCoordinates();render();}};
  get('lesson-square-retry').onclick=()=>{if(trainer){trainer.reset();render();(board.querySelector('[tabindex="0"]')||board).focus({preventScroll:true});}};
  return {update({lesson,progressKey,stage,conceptIndex}){
    const available=Boolean(lesson.squarePractice);
    get('lesson-squares-open').hidden=!available;
    get('lesson-square-practice').hidden=!available||stage!=='learn'||conceptIndex!==0;
    if(!available){trainer=null;return;}
    const key=`${progressKey}:square-practice-v1:${lesson.id}`;
    if(!models.has(key))models.set(key,new SquarePractice({data:lesson.squarePractice,storage,key}));
    trainer=models.get(key);
    if(stage==='learn'&&conceptIndex===0)render();
  }};
}
