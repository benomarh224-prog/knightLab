export const privateHeaders={'Cache-Control':'private, no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
export function json(value,status=200){return Response.json(value,{status,headers:privateHeaders});}
export function sameOrigin(request){const origin=request.headers.get('origin');return origin===new URL(request.url).origin;}
export function authURL(env=process.env){const url=new URL(env.NEON_AUTH_BASE_URL||'');if(url.protocol!=='https:'||!/^.+\.neonauth\..+\.neon\.(tech|build)$/.test(url.hostname)||url.username||url.password||url.search)throw Error('Authentication is not configured');return url;}
