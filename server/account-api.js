import {neon} from '@neondatabase/serverless';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {accountKey,validAccountValue} from '../src/account-policy.js';
import {authURL,json,sameOrigin} from './account-security.js';
let database,jwks,issuer;
async function authenticate(request){
  const match=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_.-]+)$/);if(!match)throw Error('unauthorized');
  if(!jwks){const url=authURL();issuer=url.origin;jwks=createRemoteJWKSet(new URL(url.href.replace(/\/$/,'')+'/.well-known/jwks.json'),{timeoutDuration:8000});}
  const {payload}=await jwtVerify(match[1],jwks,{algorithms:['EdDSA'],issuer,audience:issuer,clockTolerance:5});
  if(!/^[a-f0-9-]{36}$/i.test(payload.sub||''))throw Error('unauthorized');return payload.sub;
}
export function createAccountAPI({sql,identify=authenticate}={}){
  return async request=>{
    if(!['GET','PUT'].includes(request.method))return json({error:'Method not allowed'},405);
    if(request.method==='PUT'&&!sameOrigin(request))return json({error:'This request must come from ROQVYN.'},403);
    let userId;try{userId=await identify(request);}catch{return json({error:'Sign in to synchronize your progress.'},401);}
    try{
      sql||=database||=neon(process.env.DATABASE_URL);
      const [user]=await sql`select id,name,email,"emailVerified" from neon_auth."user" where id=${userId}::uuid and coalesce(banned,false)=false`;
      if(!user)return json({error:'This account is unavailable.'},401);
      if(!user.emailVerified)return json({error:'Verify your email before synchronizing.',code:'EMAIL_NOT_VERIFIED'},403);
      const url=new URL(request.url),key=url.searchParams.get('key');
      if(request.method==='GET'){
        if(key!==null){if(!accountKey(key))return json({error:'Invalid progress key.'},400);const [row]=await sql`select key,value,version,updated_at from roqvyn_account_progress where user_id=${userId}::uuid and key=${key}`;return json({record:row||null});}
        const records=await sql`select key,version,updated_at,octet_length(value) as bytes from roqvyn_account_progress where user_id=${userId}::uuid order by key`;
        return json({user:{id:user.id,name:user.name,email:user.email},records});
      }
      if(Number(request.headers.get('content-length')||0)>4300000)return json({error:'This saved item is too large.'},413);
      let body;try{body=await request.json();}catch{return json({error:'Invalid saved progress.'},400);}
      if(!accountKey(body?.key)||!validAccountValue(body.value)||!Number.isSafeInteger(body.version)||body.version<0)return json({error:'Invalid saved progress or item too large.'},400);
      try{const [row]=await sql`select * from roqvyn_write_progress(${userId}::uuid,${body.key},${body.value},${body.version}::bigint)`;return json({record:row});}
      catch(error){if(error.code==='40001')return json({error:'Progress changed on another device. Combining changes.',code:'CONFLICT'},409);if(error.code==='54000')return json({error:'Your cloud storage is full. This device still keeps your progress.',code:'QUOTA'},413);throw error;}
    }catch{return json({error:'Progress could not synchronize. It is still saved on this device.'},503);}
  };
}
