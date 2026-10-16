import {FRENCH_LESSONS,FRENCH_REFERENCE} from './french-lessons.js';
import {lessonStudy,studyIdea} from './lesson-presentation.js';
import {TACTICAL_LESSONS,TACTICAL_REFERENCE} from './tactical-lessons.js';
import {OPEN_GAMES_LESSONS,OPEN_GAMES_REFERENCE} from './open-games-lessons.js';
import {BEGINNER_LESSONS,BEGINNER_REFERENCE} from './beginner-lessons.js';
import {TAL_LESSONS,TAL_REFERENCE,TAL_COURSE_INFO} from './tal-lessons.js';
import {SCOTCH_LESSONS,SCOTCH_REFERENCE} from './scotch-lessons.js';
export const COURSES={
  beginners:{id:'beginners',title:'Chess for Beginners',path:'/learn/chess-for-beginners/',lessons:BEGINNER_LESSONS,reference:BEGINNER_REFERENCE,key:'knightlab-beginner-course-v1',study:id=>BEGINNER_LESSONS.find(lesson=>lesson.id===id).study,idea:move=>move&&/[+#]/.test(move.san)?'check':studyIdea(move),label:'Lesson',orientToSolver:false},
  french:{id:'french',title:'French Defense',path:'/learn/french-defense/',lessons:FRENCH_LESSONS,reference:FRENCH_REFERENCE,key:'knightlab-french-course-v1',study:lessonStudy,idea:studyIdea,label:'Lesson',orientToSolver:true,orientationRevision:1},
  tactics:{id:'tactics',title:'Tactical Vision',path:'/learn/tactical-vision/',lessons:TACTICAL_LESSONS,reference:TACTICAL_REFERENCE,key:'knightlab-tactical-course-v1',study:id=>TACTICAL_LESSONS.find(lesson=>lesson.id===id).study,idea:move=>move&&/[+#]/.test(move.san)?'check':studyIdea(move),label:'Exercise',orientToSolver:true},
  opengames:{id:'opengames',title:'Italian Game',path:'/learn/open-games/',lessons:OPEN_GAMES_LESSONS,reference:OPEN_GAMES_REFERENCE,key:'knightlab-open-games-course-v1',study:id=>OPEN_GAMES_LESSONS.find(lesson=>lesson.id===id).study,idea:move=>move&&/[+#]/.test(move.san)?'check':studyIdea(move),label:'Lesson',orientToSolver:true},
  scotch:{id:'scotch',title:'Scotch Gambit',path:'/learn/scotch-gambit/',lessons:SCOTCH_LESSONS,reference:SCOTCH_REFERENCE,key:'knightlab-scotch-course-v1',study:id=>SCOTCH_LESSONS.find(lesson=>lesson.id===id).study,idea:studyIdea,label:'Lesson',orientToSolver:true,category:'openings',practice:{lessonId:'scotch-first-moves',startPly:4,goal:'Develop quickly, challenge the center, and compare recovering the pawn with gaining activity.'}},
};
for(const info of TAL_COURSE_INFO){
  const lessons=TAL_LESSONS.filter(lesson=>lesson.courseId===info.id).sort((a,b)=>a.unit.localeCompare(b.unit));
  COURSES[info.id]={...info,lessons,reference:TAL_REFERENCE,key:`knightlab-${info.id}-course-v1`,
    category:'attacking',label:'Lesson',orientToSolver:true,
    study:id=>lessons.find(lesson=>lesson.id===id)?.study||{},idea:studyIdea,
    method:['Identify the king’s weak squares and the pieces that defend them.','List forcing checks, captures and direct threats.','Visualize the opponent’s reply before choosing your next move.','Count the full exchange and check your own king’s safety.'],
  };
}
COURSES.beginners.category='beginners';
COURSES.french.category=COURSES.opengames.category='openings';
COURSES.tactics.category='tactics';
COURSES.tactics.levels=['beginner','intermediate','advanced'];
COURSES.scotch.catalog={cover:'/assets/scotch-gambit.svg',alt:'Scotch Gambit course cover with the position after 4.Bc4',kicker:'PLAYING WHITE · ACTIVE OPENING PLAY',description:'Trade a little material for development. Learn the Scotch Gambit’s central breaks, forcing ideas, and practical replies to Black’s defenses.',benefits:['10 short lessons with guided board exercises and knowledge checks','Compare Bxf7+ with Nxc3 after the c3 pawn offer','Meet the declined gambit, …Bb4+, and …Nf6']};
COURSES.beginners.practice={lessonId:'support-your-pawn',startPly:0,goal:'Bring your king closer, support your passed pawn, and watch the opposing king.'};
COURSES.french.practice={lessonId:FRENCH_LESSONS[0].id,startPly:4,goal:'Challenge White’s center. Develop your pieces and look for the …c5 pawn break.'};
COURSES.opengames.practice={lessonId:'italian-development',startPly:2,goal:'Develop toward the center, protect your king, and compare the opponent’s replies.'};
COURSES.tactics.practice={lessonId:TACTICAL_LESSONS[0].id,startPly:0,goal:'Compare checks, captures, and direct threats. Calculate the opponent’s reply before moving.'};
COURSES.tactics.method=[
  'Count the material and identify the opponent’s immediate threats.',
  'List forcing checks, captures, and direct attacks.',
  'Choose a candidate and calculate plausible defensive replies.',
  'Compare the resulting position with the one you started from.',
  'Recheck the line for hidden resources before committing.',
];
export function courseLessons(course,level){return course.levels?.length?course.lessons.filter(lesson=>lesson.level===level):course.lessons;}
