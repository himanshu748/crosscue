/** Server-only Qloo boundary. No response can create scheduling authority. */
export type CulturalType = 'artist' | 'movie';
export interface Identity { id: string; name: string; type: CulturalType; year?: number }
export interface RankedEntity extends Identity { rank: number; affinity: number | null }
export interface QueryEvidence {
  source: 'qloo-live'; endpoint: string; parameters: Record<string,string>; fetchedAt: string;
  responseHash: string; requestedIds: string[]; returnedIds: string[]; missingIds: string[];
  results: RankedEntity[];
}
export class QlooError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}
type Obj = Record<string,unknown>;
const obj = (v:unknown):Obj => v && typeof v==='object' && !Array.isArray(v) ? v as Obj : {};
export const normalizeName = (s:string) => s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export function parseQloo(payload: unknown, type: CulturalType): RankedEntity[] {
  const root=obj(payload);
  if(root.success===false || root.error) throw new QlooError('invalid_response','Qloo reported an unsuccessful response.');
  const raw=Array.isArray(root.results)?root.results:obj(root.results).entities;
  if(!Array.isArray(raw)) throw new QlooError('invalid_response','Qloo returned an unsupported response shape.');
  const seen=new Set<string>();
  return raw.map((v,i)=>{
    const e=obj(v),p=obj(e.properties),q=obj(e.query);
    const id=typeof e.entity_id==='string'?e.entity_id.toLowerCase():'';
    // Search uses types[]; Insights uses generic type plus concrete subtype.
    const types=[...(Array.isArray(e.types)?e.types:[]),e.type,e.subtype].filter((t):t is string=>typeof t==='string'&&t.startsWith('urn:entity:'));
    if(!uuid.test(id)||typeof e.name!=='string'||e.name.length>300||!types.includes(`urn:entity:${type}`)||types.some(t=>t!==`urn:entity:${type}`)||seen.has(id))
      throw new QlooError('invalid_response','Qloo returned a duplicate, malformed or wrong-type entity.');
    seen.add(id);
    const date=p.release_year??p.release_date??p.year;
    const year=typeof date==='number'?date:typeof date==='string'&&/^\d{4}(?:-|$)/.test(date)?Number(date.slice(0,4)):undefined;
    const score=q.affinity??e.affinity;
    if(score!==undefined&&(typeof score!=='number'||!Number.isFinite(score))) throw new QlooError('invalid_response','Invalid Qloo affinity value.');
    return {id,name:e.name,type,...(year?{year}:{}),rank:i+1,affinity:typeof score==='number'?score:null};
  });
}
export interface QlooOptions {
  apiKey: string; baseUrl?: string; fetcher?: typeof fetch; timeoutMs?: number;
  beforeRequest?: ()=>Promise<void>; onEvidence?: (e:QueryEvidence)=>Promise<void>;
}
export class QlooAdapter {
  private readonly base:string;
  private readonly fetcher:typeof fetch;
  calls=0;
  constructor(private readonly options:QlooOptions) {
    this.base=options.baseUrl??'https://hackathon.api.qloo.com';
    if(!['https://hackathon.api.qloo.com','https://api.qloo.com'].includes(this.base))
      throw new QlooError('invalid_configuration','Qloo endpoint must be an official HTTPS origin.',503);
    // Workers' native fetch requires the global receiver; a stored method call
    // would otherwise pass this adapter as `this` and fail before any HTTP call.
    this.fetcher=options.fetcher??((input,init)=>globalThis.fetch(input,init));
  }
  private async request(path:string, parameters:Record<string,string>,type:CulturalType,requestedIds:string[]=[]):Promise<QueryEvidence> {
    if(!this.options.apiKey.trim()) throw new QlooError('not_configured','QLOO_API_KEY is not configured on the server.',503);
    if(this.calls>=20) throw new QlooError('request_budget','This adapter reached its 20-call budget.',429);
    // Reserve synchronously before yielding; failed reservations also consume budget.
    this.calls++;
    await this.options.beforeRequest?.();
    const url=new URL(path,this.base);
    for(const [k,v] of Object.entries(parameters))url.searchParams.set(k,v);
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),this.options.timeoutMs??12000);
    try {
      const response=await this.fetcher(url,{headers:{'X-Api-Key':this.options.apiKey,Accept:'application/json'},signal:abort.signal,redirect:'error'});
      if(!response.ok) {
        await response.body?.cancel();
        if(path==='/search'&&response.status===404)throw new QlooError('unresolved_entity','No Qloo search results matched this entity.',422);
        const code=response.status===429?'rate_limited':response.status===401||response.status===403?'authentication_failed':'upstream_error';
        throw new QlooError(code,`Qloo returned HTTP ${response.status}. No substitute evidence was used.`,response.status===429?429:502);
      }
      const raw=await response.text();
      if(raw.length>1_000_000)throw new QlooError('invalid_response','Qloo response exceeds the safe size limit.');
      let payload:unknown;try{payload=JSON.parse(raw);}catch{throw new QlooError('invalid_response','Qloo returned invalid JSON.');}
      const results=parseQloo(payload,type);
      if(requestedIds.length&&results.some(e=>!requestedIds.includes(e.id)))throw new QlooError('shortlist_mismatch','Qloo returned an entity outside the fixed shortlist.');
      const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
      const evidence:QueryEvidence={source:'qloo-live',endpoint:this.base+path,parameters,fetchedAt:new Date().toISOString(),responseHash:Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join(''),requestedIds,returnedIds:results.map(e=>e.id),missingIds:requestedIds.filter(id=>!results.some(e=>e.id===id)),results};
      await this.options.onEvidence?.(evidence);
      return evidence;
    }catch(error){
      if(error instanceof QlooError)throw error;
      throw new QlooError(abort.signal.aborted?'timeout':'network_error',abort.signal.aborted?'Qloo request timed out. Retry the analysis later.':'Qloo could not be reached. No substitute evidence was used.');
    }finally{clearTimeout(timer);}
  }
  async resolve(name:string,type:CulturalType,year?:number):Promise<{identity:Identity;evidence:QueryEvidence}> {
    if(!name||name.length>100|| (type==='movie'&&!year))throw new QlooError('invalid_input','Use a name, entity type and movie year.',400);
    const evidence=await this.request('/search',{query:name,types:`urn:entity:${type}`,take:'5',sort_by:'match'},type);
    const matches=evidence.results.filter(e=>normalizeName(e.name)===normalizeName(name)&&(year===undefined||e.year===year));
    if(matches.length!==1)throw new QlooError('unresolved_entity',`No unique exact ${type} identity for ${name}${year?` (${year})`:''}. Nothing was substituted.`,422);
    const {rank:_,affinity:__,...identity}=matches[0];
    return {identity,evidence};
  }
  async rank(signal:Identity,shortlist:Identity[]):Promise<QueryEvidence> {
    const type=shortlist[0]?.type;
    if(!uuid.test(signal.id)||!type||shortlist.length!==4||new Set(shortlist.map(e=>e.id)).size!==4||shortlist.some(e=>e.type!==type||!uuid.test(e.id)))
      throw new QlooError('invalid_input','Ranking requires one resolved signal and four unique same-type targets.',400);
    return this.request('/v2/insights',{'filter.type':`urn:entity:${type}`,'signal.interests.entities':signal.id,'filter.results.entities':shortlist.map(e=>e.id).join(','),take:'4',sort_by:'affinity'},type,shortlist.map(e=>e.id));
  }
}
