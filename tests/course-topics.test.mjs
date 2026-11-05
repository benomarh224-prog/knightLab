import test from 'node:test';
import assert from 'node:assert/strict';
import {courseTopics} from '../src/course-topics.js';
import {COURSES} from '../src/courses.js';

test('topic options cover every registered course and start with the beginner path',()=>{
 const topics=courseTopics(COURSES);
 assert.deepEqual(topics.map(topic=>topic.value),['beginners','openings','tactics','attacking']);
 assert.equal(topics.reduce((sum,topic)=>sum+topic.count,0),Object.values(COURSES).length);
 for(const topic of topics)assert.equal(topic.count,Object.values(COURSES).filter(course=>course.category===topic.value).length);
});
test('added courses update topic counts without duplicating options or accepting missing categories',()=>{
 const extra={...COURSES,next:{category:'openings'},later:{category:'endgame-practice'},empty:{}};
 const topics=courseTopics(extra);
 assert.equal(topics.find(topic=>topic.value==='openings').count,courseTopics(COURSES).find(topic=>topic.value==='openings').count+1);
 assert.equal(topics.find(topic=>topic.value==='endgame-practice').label,'Endgame practice');
 assert.equal(new Set(topics.map(topic=>topic.value)).size,topics.length);
});
