const KEY='knightlab-review-memory-v1';

export function createReviewMemory(storage) {
  function read() {
    try {
      const data=JSON.parse(storage?.getItem(KEY)||'[]');
      return Array.isArray(data)?data.filter(entry=>typeof entry?.game?.pgn==='string'&&entry.game.pgn.length<=250000&&Number.isInteger(entry.ply)&&entry.ply>=0).slice(0,8):[];
    } catch { return []; }
  }
  return {
    list:()=>read(),
    last:()=>read()[0]||null,
    position(pgn,total) {
      const saved=read().find(entry=>entry.game.pgn===pgn);
      return saved?{ply:Math.min(total,saved.ply),flipped:Boolean(saved.flipped)}:null;
    },
    save(game,{ply,flipped,demo}) {
      if(typeof game?.pgn!=='string'||game.pgn.length>250000||!Number.isInteger(ply)||ply<0)return false;
      const retained={pgn:game.pgn};
      for(const key of ['white','black'])if(game[key])retained[key]={username:String(game[key].username||''),rating:Number(game[key].rating)||0};
      for(const key of ['url','time_class','time_control','end_time','eco'])if(['string','number'].includes(typeof game[key]))retained[key]=game[key];
      const entry={game:retained,ply,flipped:Boolean(flipped),demo:Boolean(demo)};
      try { storage?.setItem(KEY,JSON.stringify([entry,...read().filter(item=>item.game.pgn!==game.pgn)].slice(0,8)));return Boolean(storage); }
      catch { return false; }
    },
  };
}
