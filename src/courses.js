import {FRENCH_LESSONS,FRENCH_REFERENCE} from './french-lessons.js';
import {lessonStudy,studyIdea} from './lesson-presentation.js';
import {TACTICAL_LESSONS,TACTICAL_REFERENCE} from './tactical-lessons.js';
import {OPEN_GAMES_LESSONS,OPEN_GAMES_REFERENCE} from './open-games-lessons.js';
import {BEGINNER_LESSONS,BEGINNER_REFERENCE} from './beginner-lessons.js';
export const COURSES={
  beginners:{id:'beginners',title:'Chess for Beginners',path:'/learn/chess-for-beginners/',lessons:BEGINNER_LESSONS,reference:BEGINNER_REFERENCE,key:'knightlab-beginner-course-v1',study:id=>BEGINNER_LESSONS.find(lesson=>lesson.id===id).study,idea:move=>move&&/[+#]/.test(move.san)?'check':studyIdea(move),label:'Lesson',orientToSolver:false},
  french:{id:'french',title:'French Defense',path:'/learn/french-defense/',lessons:FRENCH_LESSONS,reference:FRENCH_REFERENCE,key:'knightlab-french-course-v1',study:lessonStudy,idea:studyIdea,label:'Lesson',orientToSolver:false},
  tactics:{id:'tactics',title:'Tactical Vision',path:'/learn/tactical-vision/',lessons:TACTICAL_LESSONS,reference:TACTICAL_REFERENCE,key:'knightlab-tactical-course-v1',study:id=>TACTICAL_LESSONS.find(lesson=>lesson.id===id).study,idea:move=>move&&/[+#]/.test(move.san)?'check':studyIdea(move),label:'Exercise',orientToSolver:true},
  opengames:{id:'opengames',title:'Italian Game',path:'/learn/open-games/',lessons:OPEN_GAMES_LESSONS,reference:OPEN_GAMES_REFERENCE,key:'knightlab-open-games-course-v1',study:id=>OPEN_GAMES_LESSONS.find(lesson=>lesson.id===id).study,idea:move=>move&&/[+#]/.test(move.san)?'check':studyIdea(move),label:'Lesson',orientToSolver:true},
};
export function courseLessons(course,level){return course.id==='tactics'?course.lessons.filter(lesson=>lesson.level===level):course.lessons;}
