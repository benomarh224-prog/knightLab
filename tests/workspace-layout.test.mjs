import test from 'node:test';import assert from 'node:assert/strict';
import {evaluationShare,paintEvaluationBar,keepMoveInList} from '../src/workspace-layout.js';

test('evaluation painting keeps the existing White-perspective scale and bounds',()=>{
  for(const cp of [-100000,-500,-20,0,20,500,100000])assert.equal(evaluationShare({cp}),(50+45*Math.tanh(cp/450))/100);
  assert.equal(evaluationShare(null),.5);assert.equal(evaluationShare({cp:NaN}),.5);
  assert.equal(evaluationShare({cp:100000,mate:2}),.95);assert.equal(evaluationShare({cp:-100000,mate:-2}),.05);
});
test('pending, ordinary and mate updates only transform the fill, never size the bar or board',()=>{
  const toggles=[],attributes={},fill={style:{}},label={textContent:''};
  const bar={setAttribute(k,v){attributes[k]=v;},classList:{toggle(...v){toggles.push(v);}}};
  for(const [score,text]of [[null,'—'],[{cp:0},'0.00'],[{cp:-350},'−3.50'],[{cp:100000,mate:1},'+M1']]){
    paintEvaluationBar({bar,fill,label},score,text);assert.deepEqual(Object.keys(fill.style),['transform']);assert.equal(label.textContent,text);
  }
  assert.equal(attributes['aria-label'],'Position evaluation from White’s perspective: +M1');assert.deepEqual(toggles[0],['awaiting-evaluation',true]);
});
function list({scrollTop=100,top=20,height=200,total=1000}={}){return{scrollTop,clientTop:1,clientHeight:height,scrollHeight:total,getBoundingClientRect(){return{top};}};}
const cell=(top,bottom)=>({getBoundingClientRect(){return{top,bottom};},scrollIntoView(){throw Error('Must not scroll the window');}});
test('move navigation scrolls only the move list, including in a sticky desktop panel',()=>{
  const panel=list();assert.equal(keepMoveInList(cell(250,290),panel),true);assert.equal(panel.scrollTop,169);
  assert.equal(keepMoveInList(cell(4,44),panel),true);assert.equal(panel.scrollTop,152);
  assert.equal(keepMoveInList(cell(50,90),panel),false);assert.equal(panel.scrollTop,152);
});
test('move list navigation clamps both ends and ignores hidden or non-scrollable panels',()=>{
  let panel=list({scrollTop:0});keepMoveInList(cell(-500,-460),panel);assert.equal(panel.scrollTop,0);
  panel=list({scrollTop:700});keepMoveInList(cell(900,940),panel);assert.equal(panel.scrollTop,800);
  assert.equal(keepMoveInList(cell(0,10),list({height:0})),false);assert.equal(keepMoveInList(null,panel),false);
});
