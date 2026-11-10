import {authURL,json,privateHeaders,sameOrigin} from './account-security.js';
const routes=new Map([['get-session','GET'],['sign-in/email','POST'],['sign-up/email','POST'],['sign-out','POST'],['email-otp/send-verification-otp','POST'],['email-otp/verify-email','POST'],['email-otp/check-verification-otp','POST'],['email-otp/reset-password','POST']]);
export function createAuthProxy({env=process.env,fetcher=fetch}={}){
  return async request=>{
    const url=new URL(request.url),path=url.pathname.replace(/^\/api\/auth\//,'');
    if(!routes.has(path)||routes.get(path)!==request.method)return json({error:'Not found'},404);
    if(request.method==='POST'&&!sameOrigin(request))return json({error:'This request must come from ROQVYN.'},403);
    try{
      const headers=new Headers();for(const name of ['content-type','accept','cookie','origin','x-neon-client-info']){const value=request.headers.get(name);if(value)headers.set(name,value);}
      const target=authURL(env);target.pathname=target.pathname.replace(/\/$/,'')+'/'+path;
      // Never proxy arbitrary URLs, admin endpoints or client-supplied redirects.
      const body=request.method==='POST'?await request.text():undefined;
      if(body&&new TextEncoder().encode(body).length>12000)return json({error:'This request is too large.'},413);
      const upstream=await fetcher(target,{method:request.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(15000)});
      if(upstream.status>=300&&upstream.status<400)return json({error:'Unexpected authentication redirect.'},502);
      const responseHeaders=new Headers(privateHeaders);responseHeaders.set('Content-Type',upstream.headers.get('content-type')||'application/json');
      for(const cookie of upstream.headers.getSetCookie()){
        const ownCookie=cookie.replace(/;\s*Domain=[^;]+/ig,'').replace(/;\s*Path=[^;]+/ig,'; Path=/');responseHeaders.append('Set-Cookie',ownCookie);
      }
      // SDK JWT headers are only exposed on this same-origin, non-cacheable route.
      for(const name of ['set-auth-jwt','x-auth-token','retry-after'])if(upstream.headers.has(name))responseHeaders.set(name,upstream.headers.get(name));
      return new Response(upstream.body,{status:upstream.status,headers:responseHeaders});
    }catch{return json({error:'Sign-in is temporarily unavailable. Please retry.'},503);}
  };
}
