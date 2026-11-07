import{Chess}from'chess.js';
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'},opposite=color=>color==='w'?'b':'w';
const cache=new Map();
// Observable consequences of one legally validated move, not an engine verdict.
export function tacticalFact(move){
  if(!move)return null;const key=move.before+'|'+move.from+move.to+(move.promotion||'')+'|'+move.after+'|'+move.san;if(cache.has(key))return cache.get(key);
  let result=null;
  try{
    const before=new Chess(move.before),legal=before.move({from:move.from,to:move.to,promotion:move.promotion});if(legal.after!==move.after||legal.san!==move.san)return null;
    const chess=new Chess(move.after),enemy=opposite(move.color),board=chess.board().flat().filter(Boolean),king=board.find(piece=>piece.color===enemy&&piece.type==='k');
    if(chess.isCheckmate())result={kind:'mate',text:`${move.san} gives checkmate: the king is in check and has no legal reply.`};
    else if(move.promotion)result={kind:'promotion',text:`${move.san} promotes the pawn to a ${names[move.promotion]}${chess.isCheck()?' with check':''}.`};
    else if(!move.flags.includes('k')&&!move.flags.includes('q')){
      const fields=move.after.split(' ');fields[1]=move.color;const threats=new Chess(fields.join(' ')).moves({square:move.to,verbose:true}).filter(next=>next.captured&&['q','r','b','n'].includes(next.captured));
      const targets=[...new Map(threats.map(next=>[next.to,`${names[next.captured]} on ${next.to}`])).values()];if(chess.isCheck()&&chess.attackers(king.square,move.color).includes(move.to))targets.unshift(`king on ${king.square}`);
      if(targets.length>=2)result={kind:'fork',text:`${move.san} creates a double attack on the ${targets.join(' and the ')}. The opponent can respond; this alone does not prove a material win.`};
      if(!result&&['b','r','q'].includes(move.piece)){
        const directions=move.piece==='b'?[[1,1],[1,-1],[-1,1],[-1,-1]]:move.piece==='r'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
        for(const [df,dr]of directions){let blocker=null;for(let f=move.to.charCodeAt(0)-97+df,r=Number(move.to[1])+dr;f>=0&&f<8&&r>0&&r<9;f+=df,r+=dr){const square=String.fromCharCode(97+f)+r,piece=chess.get(square);if(!piece)continue;if(!blocker&&piece.color===enemy&&piece.type!=='k'){blocker={piece,square};continue;}if(blocker&&piece.color===enemy&&piece.type==='k')result={kind:'pin',text:`The ${names[move.piece]} pins the ${names[blocker.piece.type]} on ${blocker.square} to the king on ${square}. Moving it off this line would expose its king.`};break;}if(result)break;}
      }
      if(!result&&chess.isCheck()){
        const old=new Chess(move.before),revealed=chess.attackers(king.square,move.color).find(square=>square!==move.to&&!old.attackers(king.square,move.color).includes(square));
        result=revealed?{kind:'discovered-check',text:`Vacating ${move.from} reveals check from the ${names[chess.get(revealed).type]} on ${revealed}. The opponent must answer the check.`}:{kind:'check',text:`${move.san} gives check. The opponent’s reply must leave its king safe.`};
      }
    }
  }catch{return null;}
  cache.set(key,result);if(cache.size>256)cache.delete(cache.keys().next().value);return result;
}
