import test from 'node:test';import assert from 'node:assert/strict';
import {createAccountStorage} from '../src/account-storage.js';
import {accountKey,validAccountValue} from '../src/account-policy.js';
import {mergeAccountValue} from '../src/account-merge.js';
import {createAccountSync} from '../src/account-sync.js';
import {createAuthProxy} from '../server/auth-proxy.js';
import {createAccountAPI} from '../server/account-api.js';
import {COURSES} from '../src/courses.js';import {LessonPlayer} from '../src/lesson-player.js';
const alice={id:'11111111-1111-4111-8111-111111111111',name:'Alice',email:'alice@example.invalid'},bob={id:'22222222-2222-4222-8222-222222222222',name:'Bob',email:'bob@example.invalid'};
const key='knightlab-french-course-v1';
function memory(){const map=new Map();return {map,get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
test('the sync allowlist includes learning and reviews, and excludes credentials and account metadata',()=>{
  for(const k of [key,key+':lesson-player-v1:foundations',key+':square-practice-v1:test','roqvyn-daily-training-v1:draft:2026-11-10:practice-french-foundations-0','knightlab-review-evidence-v1','roqvyn-adaptive-training-v1','roqvyn-board-lab-v1:memory:expert'])assert.equal(accountKey(k),true,k);
  for(const k of ['password','token','__session','roqvyn-account-active-v1','roqvyn-account-meta:'+alice.id,'NEON_AUTH_BASE_URL','roqvyn-theme'])assert.equal(accountKey(k),false,k);
  assert.equal(validAccountValue('x'.repeat(2100001)),false);
});
test('account scopes isolate Alice, Bob and all guest progress across logout and reload',()=>{
  const raw=memory();raw.setItem(key,'["guest"]');let store=createAccountStorage(raw);store.activate(alice);assert.equal(store.getItem(key),null);store.setItem(key,'["alice"]');
  store.activate(bob);assert.equal(store.getItem(key),null);store.setItem(key,'["bob"]');store=createAccountStorage(raw);assert.equal(store.getItem(key),'["bob"]');
  store.deactivate();assert.equal(store.getItem(key),'["guest"]');store.activate(alice);assert.equal(store.getItem(key),'["alice"]');assert.deepEqual(store.guestEntries(),{[key]:'["guest"]'});
});
test('blocked or quota-limited browser storage keeps the latest progress in memory',()=>{
  const raw=memory(),store=createAccountStorage(raw);store.activate(alice);store.setItem(key,'["first"]');raw.setItem=()=>{throw Error('quota');};store.setItem(key,'["second"]');assert.deepEqual(JSON.parse(store.getItem(key)),['second','first']);assert.ok(store.pending().includes(key));
});
test('earned lessons union on every write, so a stale in-memory model cannot erase another device',()=>{
  const store=createAccountStorage(memory());store.activate(alice);store.remote(key,'["foundations","advance"]',3);store.setItem(key,'["foundations"]');assert.deepEqual(JSON.parse(store.getItem(key)),['foundations','advance']);
});
test('partial lesson merging keeps the farthest legal solution but respects an explicit new retry',()=>{
  const lesson=COURSES.french.lessons[0],storage=memory(),make=()=>new LessonPlayer({lesson,study:COURSES.french.study(lesson.id),storage,progressKey:COURSES.french.key});let player=make();player.save();const first=storage.getItem(player.storageKey);
  const m=player.session.expected;player.attempt(m.from,m.to,m.promotion);const advanced=storage.getItem(player.storageKey),merged=JSON.parse(mergeAccountValue(player.storageKey,first,advanced));assert.equal(merged.activities[0].correct,1);
  player.reset();const retry=storage.getItem(player.storageKey),result=JSON.parse(mergeAccountValue(player.storageKey,retry,advanced));assert.equal(result.activities[0].correct,0);assert.notEqual(result.activities[0].runId,JSON.parse(advanced).activities[0].runId);
});
test('simultaneous daily sessions retain completed tasks from both devices',()=>{
  const task=id=>({id,kind:'practice'}),a={version:1,days:[{date:'2026-11-10',tasks:[task('a'),task('b'),task('c')],done:['a'],opened:['a'],started:true}]},b={version:1,days:[{date:'2026-11-10',tasks:[task('d'),task('e'),task('f')],done:['d'],opened:['d'],started:true}]};
  const value=JSON.parse(mergeAccountValue('roqvyn-daily-training-v1',JSON.stringify(a),JSON.stringify(b)));assert.equal(value.days[0].tasks.length,6);assert.deepEqual(value.days[0].done,['a','d']);assert.equal(value.days[0].merged,true);
});
test('unstarted daily difficulty changes are not resurrected from an earlier device snapshot',()=>{
  const remote=JSON.stringify({version:1,days:[{date:'2026-11-10',tasks:[],done:[],started:false}]}),local=JSON.stringify({version:1,days:[]});assert.deepEqual(JSON.parse(mergeAccountValue('roqvyn-daily-training-v1',local,remote)).days,[]);
});
test('the same helped exercise on another device cannot become an independent solve',()=>{
  const event=quality=>({date:'2026-11-10',key:'puzzle',quality}),a={version:1,records:{},events:[event('supported')]},b={version:1,records:{},events:[event('independent')]};const result=JSON.parse(mergeAccountValue('roqvyn-adaptive-training-v1',JSON.stringify(a),JSON.stringify(b)));assert.equal(result.events[0].quality,'supported');
});
function cloud(){const rows=new Map();let conflict=false;return {rows,conflict(){conflict=true;},async fetcher(url,options={}){const requested=new URL(url,'https://roqvyn.example'),body=options.body?JSON.parse(options.body):null;if(body){const old=rows.get(body.key);if(conflict){conflict=false;rows.set(body.key,{key:body.key,value:'["other-device"]',version:2});return Response.json({code:'CONFLICT'},{status:409});}if((old?.version||0)!==body.version)return Response.json({code:'CONFLICT'},{status:409});const record={key:body.key,value:body.value,version:body.version+1};rows.set(body.key,record);return Response.json({record});}if(requested.searchParams.has('key'))return Response.json({record:rows.get(requested.searchParams.get('key'))||null});return Response.json({records:[...rows.values()].map(({key,version})=>({key,version}))});}};}
test('offline writes stay pending, then synchronize and restore onto a second device',async()=>{
  const store=createAccountStorage(memory());store.activate(alice);store.setItem(key,'["foundations"]');const remote=cloud(),states=[];let online=false;
  const sync=createAccountSync({storage:store,session:async()=>({user:alice,session:{token:'test'}}),fetcher:(...args)=>online?remote.fetcher(...args):Promise.reject(Error('offline')),onState:s=>states.push(s)});
  await sync.run();assert.equal(states.at(-1).status,'offline');assert.equal(store.pending().length,1);online=true;await sync.run();assert.equal(store.pending().length,0);sync.stop();
  const device=createAccountStorage(memory());device.activate(alice);const second=createAccountSync({storage:device,session:async()=>({user:alice,session:{token:'test'}}),fetcher:remote.fetcher});await second.run();assert.equal(device.getItem(key),'["foundations"]');second.stop();
});
test('a compare-and-swap conflict combines lessons instead of overwriting newer cloud data',async()=>{
  const store=createAccountStorage(memory());store.activate(alice);store.remote(key,'["base"]',1);store.setItem(key,'["mine"]');const remote=cloud();remote.rows.set(key,{key,value:'["base"]',version:1});remote.conflict();
  const sync=createAccountSync({storage:store,session:async()=>({user:alice,session:{token:'test'}}),fetcher:remote.fetcher});await sync.run();assert.deepEqual(JSON.parse(remote.rows.get(key).value),['mine','base','other-device']);sync.stop();
});
test('a signed-in identity mismatch never uploads another account’s cached progress',async()=>{
  const store=createAccountStorage(memory());store.activate(alice);store.setItem(key,'["alice"]');let calls=0;const sync=createAccountSync({storage:store,session:async()=>({user:bob,session:{token:'b'}}),fetcher:()=>{calls++;}});await sync.run();assert.equal(calls,0);assert.equal(store.pending().length,1);sync.stop();
});
test('late requests after sign-out cannot copy account data into guest storage',async()=>{
  const raw=memory(),store=createAccountStorage(raw);store.activate(alice);let release;const wait=new Promise(resolve=>release=resolve);const sync=createAccountSync({storage:store,session:async()=>({user:alice,session:{token:'a'}}),fetcher:()=>wait});const running=sync.run();await Promise.resolve();await Promise.resolve();sync.stop();store.deactivate();release(Response.json({records:[{key,value:'["private"]',version:1}]}));await running;assert.equal(raw.getItem(key),null);
});
test('auth proxy rejects cross-origin requests, arbitrary routes and administrative endpoints',async()=>{
  let calls=0;const proxy=createAuthProxy({env:{NEON_AUTH_BASE_URL:'https://ep-example.neonauth.eu-central-1.aws.neon.tech/neondb/auth'},fetcher:()=>{calls++;}});
  assert.equal((await proxy(new Request('https://roqvyn.example/api/auth/sign-in/email',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}))).status,403);
  assert.equal((await proxy(new Request('https://roqvyn.example/api/auth/admin/list-users'))).status,404);assert.equal(calls,0);
});
test('auth responses keep cookies first-party and prevent shared caching',async()=>{
  const proxy=createAuthProxy({env:{NEON_AUTH_BASE_URL:'https://ep-example.neonauth.eu-central-1.aws.neon.tech/neondb/auth'},fetcher:async()=>new Response('{}',{headers:{'Set-Cookie':'session=private; HttpOnly; Secure; Domain=.neon.tech; Path=/auth','Content-Type':'application/json'}})});
  const response=await proxy(new Request('https://roqvyn.example/api/auth/get-session'));assert.match(response.headers.get('Cache-Control'),/no-store/);assert.doesNotMatch(response.headers.get('set-cookie'),/Domain=/i);assert.match(response.headers.get('set-cookie'),/HttpOnly/);assert.match(response.headers.get('set-cookie'),/Path=\//);
});
test('account API rejects missing or forged identity before accessing the database',async()=>{
  let called=false;const api=createAccountAPI({identify:async()=>{throw Error('invalid');},sql:()=>{called=true;}});assert.equal((await api(new Request('https://roqvyn.example/api/account'))).status,401);assert.equal(called,false);
});
