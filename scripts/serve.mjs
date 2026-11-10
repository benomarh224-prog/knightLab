import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
const root = resolve('dist');
const {createAuthProxy}=await import('../server/auth-proxy.js');
const {createAccountAPI}=await import('../server/account-api.js');
const authProxy=createAuthProxy(),accountAPI=createAccountAPI();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain', '.wav':'audio/wav' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(pathname.startsWith('/api/auth/')||pathname==='/api/account'){
      const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>4300000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
      const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
      const response=await (pathname==='/api/account'?accountAPI:authProxy)(request),headers=Object.fromEntries(response.headers);delete headers['set-cookie'];const cookies=response.headers.getSetCookie();if(cookies.length)headers['set-cookie']=cookies;
      res.writeHead(response.status,headers);res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    let file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    if ((await stat(file)).isDirectory())file=resolve(file,'index.html');
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.argv[2] || 4173), '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${process.argv[2] || 4173}`));
