import { OpeningLesson,createCourseProgress } from './opening-course.js';

const bounded=(value,max)=>Number.isInteger(value)?Math.max(0,Math.min(max,value)):0;
const list=value=>Array.isArray(value)?value:[];
const concept=value=>typeof value==='string'?{title:'Learn the idea',text:value}:value;
const fingerprint=value=>{let hash=2166136261;for(const char of JSON.stringify(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(36);};

// The adapter accepts existing course records and future, explicitly structured lessons.
// No course name determines stages, board behaviour, or completion requirements.
export function lessonPlan(lesson,study={}){
  const concepts=(lesson.concepts!==undefined?list(lesson.concepts):lesson.guide?.intro?.length?lesson.guide.intro:[lesson.subtitle].filter(Boolean)).map(concept);
  const raw=lesson.activities??lesson.exercises??(lesson.moves?.length?[{...lesson,kind:lesson.kind||'practice',startPly:study.start}]:[]);
  const activities=list(raw).map((activity,index)=>{
    const moves=activity.moves||[],kind=activity.kind||'practice';
    if(!['practice','demonstration'].includes(kind))throw new Error(`Unknown lesson activity: ${kind}`);
    if(kind==='practice'&&!moves.length)throw new Error(`Practice needs a selected legal continuation: ${lesson.id}`);
    return {...activity,id:activity.id||`${lesson.id}-${index}`,kind,required:activity.required!==false,
      startPly:activity.startPly??0,instruction:activity.instruction||study.prompt||lesson.subtitle||'',
      title:activity.title||lesson.title,subtitle:activity.subtitle||lesson.subtitle||'',
      practiceColor:activity.practiceColor||lesson.practiceColor||'w',course:lesson.course,
      notes:activity.notes??moves.map(()=>activity.explanation||lesson.takeaway||'Study the resulting position.'),moves};
  });
  const questions=list(lesson.questions??(lesson.quiz?[lesson.quiz]:[])).map((question,index)=>({...question,id:question.id||`question-${index}`,required:question.required!==false}));
  const stages=[concepts.length&&'learn',activities.length&&'try',questions.length&&'check'].filter(Boolean);
  if(!stages.length)throw new Error(`Lesson has no learning content: ${lesson.id}`);
  const learnRequired=lesson.completion?.learn??(!activities.some(a=>a.required)&&!questions.some(q=>q.required));
  return {concepts,activities,questions,stages,learnRequired,signature:fingerprint({concepts,activities,questions,learnRequired})};
}

export class LessonPlayer {
  constructor({lesson,study,storage,progressKey,lessonIds}){
    this.lesson=lesson;this.plan=lessonPlan(lesson,study);this.storage=storage;
    this.progress=createCourseProgress(storage,lessonIds||[lesson.id],progressKey);
    // Keep the existing v1 completion arrays unchanged. Partial work lives separately.
    this.storageKey=`${progressKey}:lesson-player-v1:${lesson.id}`;
    this.stage=this.plan.stages[0];this.conceptIndex=0;this.activityIndex=0;this.questionIndex=0;this.seen=[];this.answers=[];this.flipped=false;this.reviewing=false;
    this.activities=this.plan.activities.map(data=>{
      const session=new OpeningLesson(data),review=new OpeningLesson(data);
      if(data.kind==='practice')session.practice({startPly:data.startPly});
      return {data,session,review,done:false};
    });
    this.restore();
  }
  get activity(){return this.activities[this.activityIndex]||null;}
  get session(){const activity=this.activity;return activity?(this.reviewing?activity.review:activity.session):null;}
  get question(){return this.plan.questions[this.questionIndex]||null;}
  get boardComplete(){return this.activities.every(a=>!a.data.required||a.done);}
  get checkUnlocked(){return this.boardComplete||this.storedComplete;}
  get storedComplete(){return this.progress.read().includes(this.lesson.id);}
  get checksComplete(){return this.plan.questions.every((q,i)=>!q.required||this.answers[i]===q.answer);}
  get learned(){return this.plan.concepts.every((_,index)=>this.seen.includes(index));}
  get complete(){return this.storedComplete||(this.boardComplete&&this.checksComplete&&(!this.plan.learnRequired||this.learned));}
  stageComplete(stage){return stage==='learn'?this.learned:stage==='try'?this.boardComplete:this.checksComplete;}
  setStage(stage){if(!this.plan.stages.includes(stage)||stage==='check'&&!this.checkUnlocked)return false;this.stage=stage;this.save();return true;}
  learnNext(){
    if(!this.seen.includes(this.conceptIndex))this.seen.push(this.conceptIndex);
    if(this.conceptIndex<this.plan.concepts.length-1)this.conceptIndex++;
    else this.setStage(this.plan.stages.find(stage=>stage!=='learn')||'learn');
    this.save();
  }
  selectActivity(index){this.activityIndex=bounded(index,this.activities.length-1);this.reviewing=false;this.save();}
  attempt(from,to,promotion){
    if(this.reviewing||this.activity?.data.kind!=='practice')return {status:'inactive'};
    const result=this.session.attempt(from,to,promotion);
    if(result.completed)this.activity.done=true;
    this.save();return result;
  }
  hint(){const move=this.session?.mode==='practice'&&!this.session.completed?this.session.hint():null;this.save();return move;}
  reset(){
    const activity=this.activity;if(!activity)return;
    if(this.reviewing){activity.review.watch();}else if(activity.data.kind==='practice')activity.session.practice({startPly:activity.data.startPly});else activity.session.watch();
    // A retry does not revoke a solved exercise or a previously completed lesson.
    this.save();
  }
  jump(cursor){
    this.session?.jump(cursor);
    if(this.activity?.data.kind==='demonstration'&&this.session.cursor===this.session.lesson.moves.length)this.activity.done=true;
    this.save();
  }
  acknowledgeDemonstration(){if(this.activity?.data.kind==='demonstration'&&(!this.session.lesson.moves.length||this.activity.data.completion==='acknowledge')){this.activity.done=true;this.save();}}
  answer(index){
    const q=this.question;if(!this.checkUnlocked||!q||this.answers[this.questionIndex]===q.answer||!Number.isInteger(index)||index<0||index>=q.options.length)return false;
    this.answers[this.questionIndex]=index;this.save();return index===q.answer;
  }
  save(){
    if(this.boardComplete&&this.checksComplete&&(!this.plan.learnRequired||this.learned))this.progress.complete(this.lesson.id);
    try{this.storage?.setItem(this.storageKey,JSON.stringify({version:1,signature:this.plan.signature,stage:this.stage,conceptIndex:this.conceptIndex,activityIndex:this.activityIndex,questionIndex:this.questionIndex,seen:this.seen,answers:this.answers,flipped:this.flipped,reviewing:this.reviewing,
      activities:this.activities.map(a=>({correct:a.session.correct,hints:a.session.hints,cursor:a.session.cursor,reviewCursor:a.review.cursor,done:a.done}))}));}catch{/* Storage can be unavailable in private browsing. */}
  }
  restore(){
    try{
      const data=JSON.parse(this.storage?.getItem(this.storageKey)||'null');if(data?.version!==1||data.signature!==this.plan.signature)return;
      this.conceptIndex=bounded(data.conceptIndex,this.plan.concepts.length-1);this.activityIndex=bounded(data.activityIndex,this.activities.length-1);this.questionIndex=bounded(data.questionIndex,this.plan.questions.length-1);
      this.seen=list(data.seen).filter(i=>Number.isInteger(i)&&i>=0&&i<this.plan.concepts.length);
      this.answers=this.plan.questions.map((q,i)=>Number.isInteger(data.answers?.[i])&&data.answers[i]>=0&&data.answers[i]<q.options.length?data.answers[i]:null);
      this.activities.forEach((activity,index)=>{
        const saved=data.activities?.[index];if(!saved)return;
        if(activity.data.kind==='practice'){
          for(let i=0;i<bounded(saved.correct,activity.data.moves.length)&&activity.session.expected;i++){
            const move=activity.session.expected;activity.session.attempt(move.from,move.to,move.promotion);
          }
          activity.session.hints=bounded(saved.hints,10000);
          activity.done=activity.session.completed||saved.done===true;
        }else{activity.session.jump(bounded(saved.cursor,activity.data.moves.length));activity.done=saved.done===true;}
        activity.review.jump(bounded(saved.reviewCursor,activity.data.moves.length));
      });
      this.flipped=data.flipped===true;this.reviewing=data.reviewing===true;
      if(this.plan.stages.includes(data.stage)&&(data.stage!=='check'||this.checkUnlocked))this.stage=data.stage;
    }catch{/* Corrupt or obsolete partial work must not damage legacy completion. */}
  }
}
