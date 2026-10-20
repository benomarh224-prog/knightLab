// Keep the saved rules session authoritative; animate its already-validated prefix.
export function lessonFrames(session,fromCursor){
  return Array.from({length:Math.max(0,session.cursor-fromCursor)},(_,index)=>{
    const frame=Object.create(session);frame.cursor=fromCursor+index+1;
    frame.completed=frame.cursor===session.cursor&&session.completed;return frame;
  });
}
export function createLessonMotion({paint,onFrame=()=>{},reduced=()=>false,schedule=setTimeout,unschedule=clearTimeout}){
  let timer=null,frame=null,active=false,generation=0;
  function cancel(){generation++;if(timer!==null)unschedule(timer);timer=null;frame=null;active=false;}
  return {get frame(){return frame;},get active(){return active;},cancel,
    play(frames){
      cancel();if(!frames.length)return;
      if(reduced()){paint();onFrame(frames.at(-1));return;}
      const revision=generation;let index=0;active=true;
      function next(){
        if(revision!==generation)return;
        if(index===frames.length){frame=null;active=false;timer=null;paint();return;}
        frame=frames[index++];paint();onFrame(frame);timer=schedule(next,260);
      }
      next();
    }
  };
}
