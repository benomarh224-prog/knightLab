import {FRENCH_LESSONS,FRENCH_REFERENCE} from './french-lessons.js';
import {lessonStudy,studyIdea} from './lesson-presentation.js';
import {TACTICAL_LESSONS,TACTICAL_REFERENCE} from './tactical-lessons.js';
export const COURSES={
  french:{id:'french',title:'French Defense',path:'/learn/french-defense/',lessons:FRENCH_LESSONS,reference:FRENCH_REFERENCE,key:'knightlab-french-course-v1',study:lessonStudy,idea:studyIdea,label:'Lesson',orientToSolver:false},
  tactics:{id:'tactics',title:'Tactical Vision',path:'/learn/tactical-vision/',lessons:TACTICAL_LESSONS,reference:TACTICAL_REFERENCE,key:'knightlab-tactical-course-v1',study:id=>TACTICAL_LESSONS.find(lesson=>lesson.id===id).study,idea:move=>move&&/[+#]/.test(move.san)?'check':studyIdea(move),label:'Exercise',orientToSolver:true},
};
export function courseLessons(course,level){return course.id==='tactics'?course.lessons.filter(lesson=>lesson.level===level):course.lessons;}
