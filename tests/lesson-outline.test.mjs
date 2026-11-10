import test from'node:test';import assert from'node:assert/strict';import{outlinePage,createLessonOutline}from'../src/lesson-outline.js';
const rows=Array.from({length:120},(_,index)=>({id:'exercise-'+index,index,title:'Find the finish.',group:'Group '+Math.floor(index/16),done:index<24}));
test('a deep-linked exercise opens its own short page instead of extending the whole document',()=>{
 const value=outlinePage(rows,{activeId:'exercise-119',follow:true});assert.equal(value.group,'Group 7');assert.equal(value.rows.length,3);assert.ok(value.rows.some(r=>r.id==='exercise-119'));assert.equal(value.start,5);assert.equal(value.end,8);
});
test('every exercise is reachable through its group and page with no duplicates or omissions',()=>{
 const found=[];for(const group of new Set(rows.map(r=>r.group))){const first=outlinePage(rows,{group,size:3});for(let page=0;page<first.pages;page++)found.push(...outlinePage(rows,{group,size:3,page}).rows.map(r=>r.id));}
 assert.deepEqual(found,rows.map(r=>r.id));assert.equal(new Set(found).size,120);
});
test('an invalid remembered group or page is clamped to real lesson data',()=>{
 const value=outlinePage(rows,{group:'Removed',page:999});assert.equal(value.group,'Group 0');assert.equal(value.page,3);assert.equal(value.rows.length,1);
});
test('board rerenders preserve browsing; selecting a lesson follows its group and page',()=>{
 const nodes=new Map(),doc={activeElement:null,getElementById(id){if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,innerHTML:'',textContent:'',value:'',querySelector(){return null;},focus(){doc.activeElement=this;}});return nodes.get(id);}},viewport={innerHeight:820,addEventListener(_e,fn){this.resize=fn;}};
 const outline=createLessonOutline({doc,viewport}),render=id=>outline.render(rows,{courseId:'mates',lessonId:id,lessonLabel:'Exercise'});render('exercise-119');
 assert.match(nodes.get('course-lessons').innerHTML,/exercise-119/);nodes.get('course-group').value='Group 2';nodes.get('course-group').onchange();nodes.get('course-page-next').onclick();render('exercise-119');assert.match(nodes.get('course-lessons').innerHTML,/exercise-37/);assert.doesNotMatch(nodes.get('course-lessons').innerHTML,/exercise-119/);
 render('exercise-65');assert.match(nodes.get('course-lessons').innerHTML,/exercise-65/);viewport.innerHeight=600;viewport.resize();assert.equal((nodes.get('course-lessons').innerHTML.match(/data-lesson=/g)||[]).length,3);
});
