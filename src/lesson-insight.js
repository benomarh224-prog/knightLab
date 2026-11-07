import{Chess}from'chess.js';import{tacticalFact}from'./tactical-facts.js';import{moveIdea,continuationEvidence}from'./coach.js';
const cache=new WeakMap(),groupOrder=['Mating patterns','Promotion plans','Double attacks','Pins & discovered checks','Material & exchanges','Checks & replies','Quiet moves'];
export function exercisePresentation(lesson){
  if(cache.has(lesson))return cache.get(lesson);
  let moves=[];try{const board=new Chess(lesson.fen);moves=lesson.moves.map(san=>board.move(san));}catch{return {title:lesson.title,group:lesson.unit||'',effort:''};}
  const solver=moves.filter(move=>move.color===lesson.practiceColor),first=solver[0],fact=tacticalFact(first),captures=moves.filter(move=>move.captured),queens=captures.filter(move=>move.captured==='q');
  const piece={n:'Knight',b:'Bishop',r:'Rook',q:'Queen',k:'King',p:'Pawn'}[first?.piece]||'Piece';let group,title;
  if(moves.at(-1)?.san.endsWith('#')){group='Mating patterns';title=solver.some(m=>m.piece==='n'&&/[+#]/.test(m.san))?'Knight checks into mate':'Build a mating sequence';}
  else if(moves.some(move=>move.promotion)){group='Promotion plans';title='Calculate a promotion line';}
  else if(fact?.kind==='fork'){group='Double attacks';title=`${piece} double attack`;}
  else if(['pin','discovered-check'].includes(fact?.kind)){group='Pins & discovered checks';title=fact.kind==='pin'?'An absolute pin':'Reveal a discovered check';}
  else if(captures.length){group='Material & exchanges';title=new Set(queens.map(move=>move.color)).size===2?'Calculate a queen exchange':queens.length?'A queen capture to calculate':`${piece} captures and follow-up`;}
  else if(moves.some(move=>move.san.includes('+'))){group='Checks & replies';title=`${piece} checks and replies`;}
  else{group='Quiet moves';title=`A quiet ${piece.toLowerCase()} move`;}
  const value={title,group,effort:`${solver.length} move${solver.length===1?'':'s'} to find`,complexity:solver.length*100+moves.length,rank:groupOrder.indexOf(group)};cache.set(lesson,value);return value;
}
const sequences=new WeakMap();
export function orderedLessons(course){
  if(course.presentation!=='tactical-themes')return course.lessons;
  if(!sequences.has(course))sequences.set(course,[...course.lessons].sort((a,b)=>course.levels.indexOf(a.level)-course.levels.indexOf(b.level)||exercisePresentation(a).rank-exercisePresentation(b).rank||exercisePresentation(a).complexity-exercisePresentation(b).complexity||a.id.localeCompare(b.id)));
  return sequences.get(course);
}
export function lessonDisplay(course,lesson,study={}){return course.presentation==='tactical-themes'?exercisePresentation(lesson):{title:study.title||lesson.title,group:lesson.unit||'',effort:''};}
export function lessonStepInsight(session,{replyLimit=3}={}){
  if(!session?.cursor||!session.lesson?.verboseMoves)return null;
  const moves=session.lesson.verboseMoves,index=session.cursor-1,played=moves[index];if(!played)return null;
  const fact=tacticalFact(played),replies=moves.slice(index+1,index+1+Math.max(0,replyLimit)),reply=replies[0];
  const idea=fact?.text||moveIdea(played),response=reply?`Study reply: ${reply.san}. ${continuationEvidence(replies).text}`:'This is the end of the selected study line.';
  return {idea,response,note:session.note||'',short:idea,full:`Played: ${played.san}. ${idea} ${response} These are selected legal study moves, not a claim that every reply is forced.`};
}
