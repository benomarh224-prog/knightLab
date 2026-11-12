import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountUI} from '../src/account-ui.js';
import {createAccountStorage} from '../src/account-storage.js';
const user={id:'11111111-1111-4111-8111-111111111111',name:'Alice <script>',email:'alice@example.invalid',emailVerified:true};
const key='knightlab-french-course-v1';
function fixture({initialUser=null,delayedSession=null,rows=[],failDownload=false,host='roqvyn.example'}={}){
  const map=new Map(),raw={get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
  raw.setItem(key,'["guest"]');const storage=createAccountStorage(raw),nodes=new Map(),listeners={},calls=[];let current=initialUser,reloads=0;
  const node=()=>({value:'',checked:false,hidden:false,textContent:'',focus(){this.focused=true;}}),root=node();nodes.set('account-panel',root);nodes.set('account-status',node());
  Object.defineProperty(root,'innerHTML',{get(){return this.html||'';},set(html){this.html=html;for(const id of ['account-form','account-email','account-code','account-password','account-name','account-import'])nodes.delete(id);for(const match of html.matchAll(/\bid="([^"]+)"/g))if(!nodes.has(match[1]))nodes.set(match[1],node());}});
  root.addEventListener=(type,fn)=>listeners[type]=fn;
  const doc={getElementById:id=>nodes.get(id),querySelectorAll:()=>[],querySelector:()=>({hidden:false})};
  const auth={getSession:async()=>{if(delayedSession){await delayedSession;delayedSession=null;}return {data:current?{user:current,session:{token:'test.token.jwt'}}:null};},signUp:{email:async values=>{calls.push(['signup',values]);current={...user,emailVerified:false};return {data:{user:current}};}},signIn:{email:async values=>{calls.push(['signin',values]);current=user;return {data:{user}};}},signOut:async()=>{calls.push(['signout']);current=null;return {data:{success:true}};},emailOtp:{sendVerificationOtp:async values=>{calls.push(['code',values]);return {data:{success:true}};},verifyEmail:async values=>{calls.push(['verify',values]);current=user;return {data:{user}};},resetPassword:async values=>{calls.push(['reset',values]);return {data:{success:true}};}}};
  const win={location:{hostname:host,origin:'https://'+host,reload:()=>reloads++},addEventListener(){},removeEventListener(){},fetch:async(url,options={})=>{calls.push(['fetch',url,options.method||'GET']);if(failDownload)return Response.json({error:'offline'},{status:503});if(options.method==='PUT')return Response.json({record:{...JSON.parse(options.body),version:2}});const q=new URL(url,'https://roqvyn.example').searchParams.get('key');return Response.json(q?{record:rows.find(row=>row.key===q)||null}:{records:rows});}};
  const ui=createAccountUI({storage,doc,win,loadAuth:async()=>({createROQVYNAuth:()=>auth}),formValues:form=>new Map(Object.entries(form.values)),beforeReload:()=>storage.setItem(key,'["saved-before-scope-change"]')});
  const click=action=>listeners.click({target:{closest:()=>({dataset:{accountAction:action}})}});
  const submit=values=>nodes.get('account-form').onsubmit({preventDefault(){},currentTarget:{values}});
  return {storage,raw,nodes,root,ui,click,submit,calls,get reloads(){return reloads;}};
}
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
test('signup verifies email, offers explicit progress import, and never uploads before activation',async()=>{
  const f=fixture();try{await f.click('signup');await f.submit({email:user.email,name:user.name,password:'a long test password'});assert.match(f.root.innerHTML,/Verify your email/);assert.equal(f.calls.find(c=>c[0]==='code')[1].type,'email-verification');assert.equal(f.storage.user,null);
    await f.submit({email:user.email,otp:'123456'});assert.match(f.root.innerHTML,/Continue with this account/);assert.match(f.root.innerHTML,/Alice &lt;script&gt;/);assert.doesNotMatch(f.root.innerHTML,/<script>/);assert.equal(f.nodes.get('account-import').checked,false);assert.equal(f.calls.some(c=>c[0]==='fetch'),false);
  }finally{f.ui.destroy();}
});
test('activation downloads cloud progress first and combines guest progress only by explicit choice',async()=>{
  const f=fixture({initialUser:user,rows:[{key,value:'["cloud"]',version:3}]});try{f.ui.open();await settle();f.nodes.get('account-import').checked=true;await f.click('activate');assert.equal(f.reloads,1);assert.equal(f.storage.user.id,user.id);assert.deepEqual(JSON.parse(f.storage.getItem(key)),['saved-before-scope-change','cloud']);assert.equal(f.raw.getItem(key),'["saved-before-scope-change"]');assert.ok(f.storage.pending().includes(key));assert.equal(f.calls.filter(c=>c[0]==='fetch').length,2);}finally{f.ui.destroy();}
});
test('failed activation leaves the current guest scope and progress unchanged',async()=>{
  const f=fixture({initialUser:user,failDownload:true});try{f.ui.open();await settle();await f.click('activate');assert.equal(f.reloads,0);assert.equal(f.storage.user,null);assert.equal(f.storage.getItem(key),'["guest"]');assert.match(f.nodes.get('account-status').textContent,/could not complete/);}finally{f.ui.destroy();}
});
test('reactivating a cached account retains its offline pending changes',async()=>{
  const f=fixture({initialUser:user,rows:[{key,value:'["cloud"]',version:4}]});try{f.storage.activate(user);f.storage.setItem(key,'["offline"]');f.storage.deactivate();f.ui.open();await settle();await f.click('activate');assert.deepEqual(JSON.parse(f.storage.getItem(key)),['offline','cloud']);assert.ok(f.storage.pending().includes(key));}finally{f.ui.destroy();}
});
test('signout saves the running review in the account scope before restoring guest progress',async()=>{
  const f=fixture({initialUser:user});try{f.storage.activate(user);f.storage.setItem(key,'["account"]');f.ui.open();await settle();await f.click('signout');assert.equal(f.reloads,1);assert.equal(f.storage.user,null);assert.equal(f.storage.getItem(key),'["guest"]');f.storage.activate(user);assert.ok(JSON.parse(f.storage.getItem(key)).includes('saved-before-scope-change'));}finally{f.ui.destroy();}
});
test('an unchanged delayed session check does not repaint and erase a typed password',async()=>{
  let release;const wait=new Promise(resolve=>release=resolve),f=fixture({delayedSession:wait});try{f.ui.open();f.nodes.get('account-password').value='typed-password';release();await settle();assert.equal(f.nodes.get('account-password').value,'typed-password');}finally{f.ui.destroy();}
});
test('reset uses the managed reset-code flow and returns to sign in',async()=>{
  const f=fixture();try{await f.click('reset');f.nodes.get('account-email').value=user.email;await f.click('code');assert.equal(f.calls.find(c=>c[0]==='code')[1].type,'forget-password');await f.submit({email:user.email,otp:'123456',password:'new long test password'});assert.match(f.root.innerHTML,/Welcome back/);assert.match(f.nodes.get('account-status').textContent,/Password updated/);assert.equal(f.calls.find(c=>c[0]==='reset')[1].otp,'123456');}finally{f.ui.destroy();}
});
test('moving from sign in to password reset preserves the typed email',async()=>{
  const f=fixture();try{f.nodes.get('account-email').value=user.email;await f.click('reset');assert.match(f.root.innerHTML,/value="alice@example.invalid"/);assert.equal(f.nodes.get('account-email').focused,true);}finally{f.ui.destroy();}
});
test('the private static Site directs accounts to the canonical public backend',()=>{
  const f=fixture({host:'roqvyn.chatgpt.site'});try{assert.match(f.root.innerHTML,/https:\/\/knightlab.vercel.app\/account\//);assert.equal(f.calls.length,0);}finally{f.ui.destroy();}
});
