import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { SqliteStore } from './store';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=resolve(process.env.DATA_DIR??resolve(root,'.data'));
mkdirSync(dataDir,{recursive:true,mode:0o700});
const store=new SqliteStore(resolve(dataDir,'crosscue.db'));
const app=createApp({store,apiKey:process.env.QLOO_API_KEY??'',baseUrl:process.env.QLOO_BASE_URL,sourceRevision:process.env.SOURCE_REVISION,appOrigin:process.env.APP_ORIGIN});
const dist=resolve(root,'dist');
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url??'/',`http://${req.headers.host??'127.0.0.1'}`);
    if(url.pathname.startsWith('/api/')){
      const headers=new Headers();for(const [name,value]of Object.entries(req.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(','):value);
      const init:RequestInit&{duplex?:'half'}={method:req.method,headers};
      if(!['GET','HEAD'].includes(req.method??'GET')){init.body=Readable.toWeb(req) as ReadableStream<Uint8Array>;init.duplex='half';}
      const result=await app(new Request(url,init));res.statusCode=result.status;result.headers.forEach((value,name)=>res.setHeader(name,value));res.end(Buffer.from(await result.arrayBuffer()));return;
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    let file=resolve(dist,`.${decodeURIComponent(url.pathname)}`);
    if(file!==dist&&!file.startsWith(dist+sep)){res.writeHead(403);res.end();return;}
    try{if(!statSync(file).isFile())file=resolve(dist,'index.html');}catch{file=resolve(dist,'index.html');}
    const content=readFileSync(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});res.end(req.method==='HEAD'?undefined:content);
  }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{code:'server_error',message:'The application could not serve this request.'}}));}
});
server.listen(Number(process.env.PORT??8787),'0.0.0.0',()=>console.log(`CrossCue listening on port ${process.env.PORT??8787}; live Qloo ${process.env.QLOO_API_KEY?'configured':'not configured'}.`));
const cleanup=setInterval(()=>{void store.cleanup(Date.now());},3600000);cleanup.unref();
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>server.close(()=>{clearInterval(cleanup);store.close();process.exit(0);}));
