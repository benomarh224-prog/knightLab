import { OpeningLesson,createCourseProgress } from './opening-course.js';
import { progressiveHint } from './lesson-hints.js';

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
  constructor({lesson,study,storage,progressKey,lessonIds,memory,courseId}){
    this.lesson=lesson;this.plan=lessonPlan(lesson,study);this.storage=storage;
    this.memory=memory;this.courseId=courseId;this.challengeMode=false;this.questionReviewIndex=null;this.reviewSource=null;
    this.progress=createCourseProgress(storage,lessonIds||[lesson.id],progressKey);
    // Keep the existing v1 completion arrays unchanged. Partial work lives separately.
    this.storageKey=`${progressKey}:lesson-player-v1:${lesson.id}`;
    this.stage=this.plan.stages[0];this.conceptIndex=0;this.activityIndex=0;this.questionIndex=0;this.seen=[];this.answers=[];this.flipped=false;this.reviewing=false;
    this.activities=this.plan.activities.map(data=>{
      const session=new OpeningLesson(data),review=new OpeningLesson(data);
      if(data.kind==='practice')session.practice({startPly:data.startPly});
      return {data,session,review,challenge:null,challengeHelped:false,challengeMistakes:0,mistakes:0,hintCursor:-1,hintLevel:0,done:false};
    });
    this.restore();
  }
  get activity(){return this.activities[this.activityIndex]||null;}
  get session(){const activity=this.activity;return activity?(this.reviewing?activity.review:this.challengeMode&&activity.challenge?activity.challenge:activity.session):null;}
  get question(){return this.plan.questions[this.questionIndex]||null;}
  get boardComplete(){return this.activities.every(a=>!a.data.required||a.done);}
  get checkUnlocked(){return this.boardComplete||this.storedComplete;}
  get storedComplete(){return this.progress.read().includes(this.lesson.id);}
  get checksComplete(){return this.plan.questions.every((q,i)=>!q.required||this.answers[i]===q.answer);}
  get learned(){return this.plan.concepts.every((_,index)=>this.seen.includes(index));}
  get complete(){return this.storedComplete||(this.boardComplete&&this.checksComplete&&(!this.plan.learnRequired||this.learned));}
  stageComplete(stage){return stage==='learn'?this.learned:stage==='try'?this.boardComplete:this.checksComplete;}
  setStage(stage){if(!this.plan.stages.includes(stage)||stage==='check'&&!this.checkUnlocked)return false;if(this.challengeMode&&stage!=='try')this.activity.challengeHelped=true;this.stage=stage;this.save();return true;}
  learnNext(){
    if(!this.seen.includes(this.conceptIndex))this.seen.push(this.conceptIndex);
    if(this.conceptIndex<this.plan.concepts.length-1)this.conceptIndex++;
    else this.setStage(this.plan.stages.find(stage=>stage!=='learn')||'learn');
    this.save();
  }
  selectActivity(index){this.activityIndex=bounded(index,this.activities.length-1);this.reviewing=false;this.challengeMode=false;this.save();}
  reviewEntry(kind='practice',index=this.activityIndex){return {courseId:this.courseId,lessonId:this.lesson.id,kind,index};}
  get currentHint(){const a=this.activity;return !this.challengeMode&&!this.reviewing&&a?.hintCursor===this.session?.cursor?progressiveHint(this.session.expected,a.hintLevel):null;}
  requestHint(){
    if(this.challengeMode||this.reviewing||this.activity?.data.kind!=='practice'||this.session.completed)return null;
    const a=this.activity;if(a.hintCursor!==this.session.cursor){a.hintCursor=this.session.cursor;a.hintLevel=0;}
    if(a.hintLevel<3){a.hintLevel++;this.session.hint();}
    this.memory?.add({...this.reviewEntry(),reason:'hint'});this.save();return this.currentHint;
  }
  startChallenge(index=this.activityIndex){
    this.selectActivity(index);const a=this.activity;if(a?.data.kind!=='practice')return false;
    a.challenge=new OpeningLesson(a.data);a.challenge.practice({startPly:a.data.startPly});a.challengeHelped=false;a.challengeMistakes=0;
    this.challengeMode=true;this.stage='try';this.save();return true;
  }
  endChallenge(){this.challengeMode=false;this.reviewSource=null;this.save();}
  reviewQuestion(index){
    if(!this.checkUnlocked||!this.plan.questions[index])return false;
    this.challengeMode=false;this.questionIndex=index;this.questionReviewIndex=index;this.answers[index]=null;this.stage='check';this.save();return true;
  }
  attempt(from,to,promotion){
    if(this.reviewing||this.activity?.data.kind!=='practice')return {status:'inactive'};
    const result=this.session.attempt(from,to,promotion);
    if(result.status==='illegal'||result.status==='different'){
      if(this.challengeMode)this.activity.challengeMistakes++;else this.activity.mistakes++;
      this.memory?.add({...this.reviewEntry(),reason:'retry'});
    }
    if(result.completed){
      this.activity.done=true;
      if(this.challengeMode){if(!this.activity.challengeHelped&&this.activity.challengeMistakes===0)this.memory?.resolve(this.reviewEntry());}
    }
    this.save();return result;
  }
  hint(){const move=!this.challengeMode&&this.session?.mode==='practice'&&!this.session.completed?this.session.hint():null;this.save();return move;}
  undo(){
    if(this.reviewing||!this.session?.undo())return false;
    if(this.challengeMode)this.activity.challengeHelped=true;
    this.activity.hintCursor=-1;this.activity.hintLevel=0;
    this.save();return true;
  }
  reset(){
    const activity=this.activity;if(!activity)return;
    if(this.challengeMode){this.startChallenge();return;}
    if(this.reviewing){activity.review.watch();}else if(activity.data.kind==='practice'){activity.session.practice({startPly:activity.data.startPly});activity.mistakes=0;activity.hintLevel=0;activity.hintCursor=-1;}else activity.session.watch();
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
    this.answers[this.questionIndex]=index;
    if(index!==q.answer)this.memory?.add({...this.reviewEntry('question',this.questionIndex),reason:'question'});
    else if(this.questionReviewIndex===this.questionIndex){this.memory?.resolve(this.reviewEntry('question',this.questionIndex));this.questionReviewIndex=null;}
    this.save();return index===q.answer;
  }
  save(){
    if(this.boardComplete&&this.checksComplete&&(!this.plan.learnRequired||this.learned))this.progress.complete(this.lesson.id);
    try{this.storage?.setItem(this.storageKey,JSON.stringify({version:1,signature:this.plan.signature,stage:this.stage,conceptIndex:this.conceptIndex,activityIndex:this.activityIndex,questionIndex:this.questionIndex,seen:this.seen,answers:this.answers,flipped:this.flipped,reviewing:this.reviewing,challengeMode:this.challengeMode,questionReviewIndex:this.questionReviewIndex,reviewSource:this.reviewSource,
      activities:this.activities.map(a=>({correct:a.session.correct,hints:a.session.hints,cursor:a.session.cursor,reviewCursor:a.review.cursor,done:a.done,mistakes:a.mistakes,hintCursor:a.hintCursor,hintLevel:a.hintLevel,challenge:a.challenge?{correct:a.challenge.correct,helped:a.challengeHelped,mistakes:a.challengeMistakes}:null}))}));}catch{/* Storage can be unavailable in private browsing. */}
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
        activity.mistakes=bounded(saved.mistakes,10000);activity.hintCursor=Number.isInteger(saved.hintCursor)?saved.hintCursor:-1;activity.hintLevel=bounded(saved.hintLevel,3);
        if(saved.challenge&&activity.data.kind==='practice'){
          activity.challenge=new OpeningLesson(activity.data);activity.challenge.practice({startPly:activity.data.startPly});
          for(let i=0;i<bounded(saved.challenge.correct,activity.data.moves.length)&&activity.challenge.expected;i++){const move=activity.challenge.expected;activity.challenge.attempt(move.from,move.to,move.promotion);}
          activity.challengeHelped=saved.challenge.helped===true;activity.challengeMistakes=bounded(saved.challenge.mistakes,10000);
        }
      });
      this.flipped=data.flipped===true;this.reviewing=data.reviewing===true;
      this.challengeMode=data.challengeMode===true&&Boolean(this.activity?.challenge);this.questionReviewIndex=Number.isInteger(data.questionReviewIndex)&&this.plan.questions[data.questionReviewIndex]?data.questionReviewIndex:null;
      this.reviewSource=typeof data.reviewSource==='string'?data.reviewSource:null;
      if(this.plan.stages.includes(data.stage)&&(data.stage!=='check'||this.checkUnlocked))this.stage=data.stage;
    }catch{/* Corrupt or obsolete partial work must not damage legacy completion. */}
  }
}
