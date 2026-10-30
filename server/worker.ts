import { createApp, type SessionDocument } from './app';
import type { CulturalEvidence } from './evidence';
import type { Store } from './store';

interface D1Statement {
  bind(...values:unknown[]):D1Statement;
  first<T=Record<string,unknown>>():Promise<T|null>;
  run():Promise<{meta:{changes:number}}>;
}
export interface D1DatabaseLike { prepare(sql:string):D1Statement }
export interface Env {
  DB:D1DatabaseLike;
  ASSETS:{fetch(request:Request):Promise<Response>};
  QLOO_API_KEY:string;
  QLOO_BASE_URL?:string;
  SOURCE_REVISION?:string;
}

/** Every mutating statement is atomic in D1; no mutable visitor state lives in the isolate. */
export class D1Store implements Store {
  constructor(private readonly db:D1DatabaseLike){}
  async readSession(hash:string,now:number):Promise<SessionDocument|null>{
    const row=await this.db.prepare('SELECT payload FROM sessions WHERE token_hash=? AND expires_at>?').bind(hash,now).first<{payload:string}>();
    return row?JSON.parse(row.payload) as SessionDocument:null;
  }
  async createSession(hash:string,document:SessionDocument,expiresAt:number):Promise<void>{
    await this.db.prepare('INSERT INTO sessions(token_hash,version,payload,expires_at) VALUES(?,?,?,?)').bind(hash,document.state.version,JSON.stringify(document),expiresAt).run();
  }
  async compareAndSwap(hash:string,previousVersion:number,document:SessionDocument,expiresAt:number):Promise<boolean>{
    const result=await this.db.prepare('UPDATE sessions SET version=?,payload=?,expires_at=? WHERE token_hash=? AND version=?').bind(document.state.version,JSON.stringify(document),expiresAt,hash,previousVersion).run();
    return result.meta.changes===1;
  }
  async readEvidence(key:string,now:number):Promise<CulturalEvidence|null>{
    const row=await this.db.prepare('SELECT payload FROM cache WHERE key=? AND expires_at>?').bind(key,now).first<{payload:string}>();
    return row?JSON.parse(row.payload) as CulturalEvidence:null;
  }
  async writeEvidence(key:string,value:CulturalEvidence,expiresAt:number):Promise<void>{
    await this.db.prepare('INSERT INTO cache(key,payload,expires_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at').bind(key,JSON.stringify(value),expiresAt).run();
  }
  async acquireLease(key:string,owner:string,now:number,expiresAt:number):Promise<boolean>{
    const row=await this.db.prepare('INSERT INTO leases(key,owner,expires_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE leases.expires_at<=? RETURNING owner').bind(key,owner,expiresAt,now).first<{owner:string}>();
    return row?.owner===owner;
  }
  async releaseLease(key:string,owner:string):Promise<void>{await this.db.prepare('DELETE FROM leases WHERE key=? AND owner=?').bind(key,owner).run();}
  async reserve(key:string,limit:number,now:number,expiresAt:number,intervalMs=0):Promise<number|null>{
    if(!Number.isSafeInteger(limit)||limit<1)return null;
    const row=await this.db.prepare(`INSERT INTO counters(key,count,next_at,expires_at) VALUES(?,1,?,?)
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN counters.expires_at<=? THEN 1 ELSE counters.count+1 END,
      next_at=MAX(?,CASE WHEN counters.expires_at<=? THEN ? ELSE counters.next_at END)+?,expires_at=excluded.expires_at
      WHERE counters.expires_at<=? OR counters.count<? RETURNING next_at`).bind(key,now+intervalMs,expiresAt,now,now,now,now,intervalMs,now,limit).first<{next_at:number}>();
    return row?row.next_at-intervalMs:null;
  }
  async cleanup(now:number):Promise<void>{
    for(const table of ['sessions','cache','counters','leases'])await this.db.prepare(`DELETE FROM ${table} WHERE expires_at<=?`).bind(now).run();
  }
}

const apps=new WeakMap<object,ReturnType<typeof createApp>>();
export default {
  async fetch(request:Request,env:Env):Promise<Response>{
    if(new URL(request.url).pathname.startsWith('/api/')){
      let app=apps.get(env);if(!app){app=createApp({store:new D1Store(env.DB),apiKey:env.QLOO_API_KEY??'',baseUrl:env.QLOO_BASE_URL,sourceRevision:env.SOURCE_REVISION,trustConnectingIp:true});apps.set(env,app);}
      return app(request);
    }
    const response=await env.ASSETS.fetch(request);
    const headers=new Headers(response.headers);
    headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');
    headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(_event:unknown,env:Env):Promise<void>{await new D1Store(env.DB).cleanup(Date.now());},
};
