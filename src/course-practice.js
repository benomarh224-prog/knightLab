import { Chess } from 'chess.js';
import { OpeningLesson } from './opening-course.js';

// New courses inherit a legal study position; metadata can choose a more useful one.
export function coursePractice(course){
  const config=course.practice||{},lesson=course.lessons.find(item=>item.id===config.lessonId)||course.lessons.find(item=>item.moves?.length);
  if(!lesson)return null;
  const session=new OpeningLesson(lesson);
  session.practice({startPly:config.startPly??course.study?.(lesson.id)?.start??0});
  if(new Chess(session.fen).isGameOver())return null;
  return {fen:session.fen,color:session.lesson.practiceColor,title:`${course.title} · Put it into play`,goal:config.goal||lesson.takeaway||lesson.subtitle,moves:config.moves||4};
}
