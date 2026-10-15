// Concept questions complement the board exercise; neither replaces the other.
export function createLessonCheck(quiz){
  let selected=null,passed=!quiz,feedback='';
  return {
    get required(){return Boolean(quiz);},get selected(){return selected;},get passed(){return passed;},get feedback(){return feedback;},
    answer(index){
      if(!quiz||passed||!Number.isInteger(index)||index<0||index>=quiz.options.length)return;
      selected=index;passed=index===quiz.answer;
      feedback=`${passed?'Correct.':'Not quite. Try again.'} ${quiz.explanation}`;
    },
    canContinue(boardComplete,stored=false){return stored||Boolean(boardComplete&&passed);},
  };
}
