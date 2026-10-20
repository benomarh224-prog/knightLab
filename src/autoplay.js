export function createAutoplay({read,next,onState=()=>{},schedule=setTimeout,unschedule=clearTimeout,delay=700}){
  let timer=null,active=false,source=null,generation=0;
  function stop(){generation++;active=false;if(timer!==null)unschedule(timer);timer=null;onState(false);}
  function start(){
    stop();const state=read();if(!state||state.cursor>=state.total)return false;
    source=state.source;active=true;const revision=generation;onState(true);
    function tick(){
      if(!active||revision!==generation)return;
      const current=read();if(!current||current.source!==source||current.cursor>=current.total){stop();return;}
      next();if(read().cursor>=read().total){stop();return;}timer=schedule(tick,delay);
    }
    timer=schedule(tick,delay);return true;
  }
  return {start,stop,get active(){return active;},toggle(){return active?stop():start();}};
}
