// Browser-local learning history, independent of the existing completion arrays.
export function createLearningMemory(storage,courses){
  const key='knightlab-learning-memory-v1';let state;
  const valid=entry=>entry&&Object.hasOwn(courses,entry.courseId)&&courses[entry.courseId].lessons.some(l=>l.id===entry.lessonId);
  const validReview=entry=>{
    if(!valid(entry)||!Number.isInteger(entry.index)||entry.index<0)return false;
    const lesson=courses[entry.courseId].lessons.find(l=>l.id===entry.lessonId);
    if(entry.kind==='question')return entry.index<(lesson.questions?.length||(lesson.quiz?1:0));
    const activities=lesson.activities??lesson.exercises??(lesson.moves?.length?[lesson]:[]);
    return entry.kind==='practice'&&entry.index<activities.length&&(activities[entry.index].kind||'practice')==='practice';
  };
  const identity=entry=>`${entry.courseId}/${entry.lessonId}/${entry.kind}/${entry.index}`;
  try{state=JSON.parse(storage?.getItem(key)||'null');}catch{}
  const lastByCourse=Object.fromEntries(Object.entries(state?.lastByCourse||{}).filter(([courseId,lessonId])=>valid({courseId,lessonId})));
  if(valid(state?.last))lastByCourse[state.last.courseId]??=state.last.lessonId;
  state={last:valid(state?.last)?state.last:null,lastByCourse,review:Array.isArray(state?.review)?state.review.filter(validReview).slice(0,100):[]};
  function save(){try{storage?.setItem(key,JSON.stringify(state));}catch{}}
  return {
    last:()=>state.last,
    lastFor:courseId=>state.lastByCourse[courseId]||null,
    review:()=>state.review.map(entry=>({...entry})),
    remember(courseId,lessonId){const entry={courseId,lessonId};if(!valid(entry))return;state.last=entry;state.lastByCourse[courseId]=lessonId;save();},
    add(entry){if(!validReview(entry))return;
      state.review=[{...entry},...state.review.filter(item=>identity(item)!==identity(entry))].slice(0,100);save();},
    resolve(entry){state.review=state.review.filter(item=>identity(item)!==identity(entry));save();},
  };
}

export function learningLink(courses,entry,{review=false}={}){
  const course=courses[entry?.courseId];if(!course?.lessons.some(l=>l.id===entry.lessonId))return null;
  const query=new URLSearchParams({lesson:entry.lessonId});
  if(review){query.set('review',entry.kind);query.set('exercise',String(entry.index));}
  return {href:`${course.path}?${query}`,route:course.id,course,lesson:course.lessons.find(l=>l.id===entry.lessonId)};
}
