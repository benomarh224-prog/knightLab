// Run explicitly against the provisioned backend; no real person is emailed.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {neon} from '@neondatabase/serverless';
import {createAuthProxy} from '../server/auth-proxy.js';import {createAccountAPI} from '../server/account-api.js';
import {createROQVYNAuth} from '../src/account-neon.js';
const sql=neon(process.env.DATABASE_URL),origin=process.env.ACCOUNT_TEST_ORIGIN||'http://localhost:4179',fixtures=[];let checks=0;
const http=Boolean(process.env.ACCOUNT_TEST_ORIGIN),auth=http?request=>fetch(request):createAuthProxy(),account=http?request=>fetch(request):createAccountAPI();
const check=(value,message)=>{assert.ok(value,message);checks++;};
async function fixture(label){
 const email=`roqvyn-${randomUUID()}@tests.example.invalid`,password=randomUUID()+'Aa!8';let cookies='';
 const call=async(path,body)=>{const response=await auth(new Request(origin+'/api/auth/'+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookies},...(body?{body:JSON.stringify(body)}:{})}));const set=response.headers.getSetCookie();if(set.length)cookies=set.map(c=>c.split(';')[0]).join('; ');return response;};
 const response=await call('sign-up/email',{email,password,name:'ROQVYN test '+label});assert.equal(response.status,200,'Test signup failed');const created=await response.json(),id=created.user?.id||created.data?.user?.id;assert.ok(id,'Test user missing');fixtures.push({id,email});
 const session=await call('get-session'),body=await session.json(),token=session.headers.get('set-auth-jwt')||body.session?.token;assert.ok(token?.includes('.'),'Managed JWT missing');
 check(/no-store/.test(session.headers.get('cache-control')),'Session responses must never be publicly cached');
 check(response.headers.getSetCookie().every(cookie=>! /;\s*Domain=/i.test(cookie)&&/HttpOnly/i.test(cookie)),'Session cookies must be first-party and HttpOnly');
 return {id,email,token,call,password};
}
const api=(user,method='GET',body,path='')=>account(new Request(origin+'/api/account'+path,{method,headers:{Origin:origin,Authorization:'Bearer '+user.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));
try{
 const alice=await fixture('Alice'),bob=await fixture('Bob');
 check((await api(alice)).status===403,'Unverified emails must not access cloud progress');
 for(const user of fixtures)await sql`update neon_auth."user" set "emailVerified"=true where id=${user.id}::uuid and email=${user.email}`;
 const key='knightlab-french-course-v1',put=await api(alice,'PUT',{key,value:'["foundations"]',version:0});check(put.status===200,'Alice save');
 check((await api(alice)).status===200,'Verified identity accepted');
 const other=await (await api(bob,'GET',null,'?key='+key)).json();check(other.record===null,'Bob cannot read Alice');
 const write=await api(bob,'PUT',{key,value:'["advance"]',version:0,user_id:alice.id});check(write.status===200,'Owner is derived from JWT');
 const aliceData=await (await api(alice,'GET',null,'?key='+key)).json();check(aliceData.record.value==='["foundations"]','Bob cannot overwrite Alice');
 check((await api(alice,'PUT',{key,value:'[]',version:0})).status===409,'Stale revisions are rejected');
 check((await api(alice,'PUT',{key:'password',value:'secret',version:0})).status===400,'Unsupported keys rejected');
 check((await account(new Request(origin+'/api/account'))).status===401,'Anonymous rejected');
 check((await account(new Request(origin+'/api/account',{headers:{Authorization:'Bearer fake.token.value'}}))).status===401,'Forged JWT rejected');
 check((await auth(new Request(origin+'/api/auth/sign-up/email',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}))).status===403,'Cross-origin auth rejected');
 check((await auth(new Request(origin+'/api/auth/admin/list-users'))).status===404,'Administrative proxy endpoints rejected');
 // Exercise the real client SDK as well as raw HTTP, including its JWT injection.
 // This is Node transport verification, not a browser/cookie-policy test.
 const originalFetch=globalThis.fetch;let sdkCookies='';
 try{
  globalThis.fetch=async(input,options={})=>{
   const headers=new Headers(options.headers);headers.set('Origin',origin);if(sdkCookies)headers.set('Cookie',sdkCookies);
   const request=new Request(input,{...options,headers}),response=http?await originalFetch(request):await auth(request);
   const set=response.headers.getSetCookie();if(set.length)sdkCookies=set.map(c=>c.split(';')[0]).join('; ');return response;
  };
  const sdk=createROQVYNAuth(origin),signed=await sdk.signIn.email({email:alice.email,password:alice.password});check(!signed.error,'SDK sign-in');
  const current=await sdk.getSession();check(current.data?.user?.id===alice.id,'SDK session identity');check(current.data?.session?.token?.split('.').length===3,'SDK receives the signed JWT');
  globalThis.fetch=originalFetch;
  check((await api({...alice,token:current.data.session.token})).status===200,'SDK token accepted by progress API');
 }finally{globalThis.fetch=originalFetch;}
 console.log(JSON.stringify({checks,transport:http?'HTTP':'direct handlers',realAuth:true,realDatabase:true,isolatedAccounts:2,emailDeliveryTested:false}));
}finally{
 for(const user of fixtures){await sql`delete from roqvyn_account_progress where user_id=${user.id}::uuid`;await sql`delete from neon_auth."user" where id=${user.id}::uuid and email=${user.email}`;}
 console.log('Temporary test accounts and progress removed.');
}
