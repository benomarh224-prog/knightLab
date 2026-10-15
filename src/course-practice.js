import { Chess } from 'chess.js';
import { OpeningLesson } from './opening-course.js';
import { lessonPlan } from './lesson-player.js';

// New courses inherit a legal study position; metadata can choose a more useful one.
export function coursePractice(course){
  const config=course.practice||{};
  const candidates=config.lessonId?course.lessons.filter(item=>item.id===config.lessonId):course.lessons;
  let lesson,data;
  for(const candidate of candidates){
    const activity=lessonPlan(candidate,course.study?.(candidate.id)).activities.find(item=>item.kind==='practice');
    if(activity){lesson=candidate;data=activity;break;}
  }
  if(!data)return null;
  const session=new OpeningLesson(data);
  session.practice({startPly:config.startPly??data.startPly});
  if(new Chess(session.fen).isGameOver())return null;
  return {fen:session.fen,color:session.lesson.practiceColor,title:`${course.title} · Put it into play`,goal:config.goal||lesson.takeaway||lesson.subtitle,moves:config.moves||4};
}
