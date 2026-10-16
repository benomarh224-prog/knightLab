import {Chess} from 'chess.js';

export function lessonEntry(course,{requestedId,rememberedId,completed=[]}={}){
  return course.lessons.find(l=>l.id===requestedId)||course.lessons.find(l=>l.id===rememberedId)||course.lessons.find(l=>!completed.includes(l.id))||course.lessons[0];
}
export function learningCategory(courses,requested,saved){
  const available=new Set(Object.values(courses).map(course=>course.category));
  return [requested,saved,'beginners',...available].find(category=>available.has(category));
}

// Describe the board the learner is actually looking at, without changing its rules.
export function lessonGuidance(player,{session=player.exploration||player.session,busy=false}={}){
  if(!session)return null;
  const chess=new Chess(session.fen),side=chess.turn()==='w'?'White':'Black';
  if(busy)return {mode:'playing',status:'Playing the study line…',instruction:player.activity.data.instruction||'Watch the reply, then make your next move.'};
  if(player.exploring)return {mode:'explore',status:session.ending||`Free play · ${side} to move`,instruction:session.ending?'Use Undo to try a different continuation.':'Try moves for either side. Back returns to your exercise.'};
  if(player.reviewing||player.activity.data.kind==='demonstration')return {mode:'review',status:'Review the moves',instruction:session.note||player.activity.data.instruction||'Use Next to follow the study line.'};
  if(session.completed)return {mode:'complete',status:chess.isCheckmate()?'Checkmate · Exercise complete':'Exercise complete',instruction:'Continue below, or move a piece to explore another line.'};
  return {mode:'practice',status:`Your turn · ${side}`,instruction:player.challengeMode?'Find the study move without hints.':player.activity.data.instruction||'Select a piece, then a highlighted square.'};
}
