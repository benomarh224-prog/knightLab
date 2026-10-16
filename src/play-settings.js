export const PLAY_LEVELS={
  beginner:{label:'Beginner',skill:0,depth:4,milliseconds:180,description:'More forgiving replies while you learn the rules.'},
  casual:{label:'Casual',skill:5,depth:8,milliseconds:350,description:'A relaxed opponent for practicing plans.'},
  challenging:{label:'Challenging',skill:12,depth:12,milliseconds:800,description:'Stronger calculation and fewer forgiving replies.'},
  strong:{label:'Strong',skill:20,depth:18,milliseconds:1500,description:'Full skill with a longer search.'},
};
export function playSearch(level='casual'){const value=PLAY_LEVELS[level];if(!value)throw new Error('Unknown opponent difficulty');return {skill:value.skill,depth:value.depth,milliseconds:value.milliseconds};}
