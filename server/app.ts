import { z } from 'zod';
import { analyzeCandidates, testPairProtection } from '../src/core/analysis';
import { cloneProgramme, initialPlacements } from '../src/core/programme';
import { canonicalSchedule, pairKey } from '../src/core/solver';
import { validateSchedule } from '../src/core/validator';
import type { AnalysisResult, Pair, Placement, Programme, ScheduleChange, SolveResult, ValidationResult } from '../src/core/types';
import { gatherEvidence, type CulturalEvidence } from './evidence';
import { QlooAdapter, QlooError } from './qloo';
import type { Store } from './store';

const SESSION_TTL=24*60*60*1000, EVIDENCE_TTL=3*60*60*1000, BODY_LIMIT=32768;
const COOKIE='crosscue_session';
export interface TraceEntry { at:string;tool:string;status:'ok'|'stopped';detail:string }
export interface DecisionRecord {
  id:string;questionId:string;pair:Pair;choice:'protect'|'allow'|'defer';at:string;
  beforeVersion:number;version:number;changes:ScheduleChange[];proof?:SolveResult['proof'];
}
export interface State {
  version:number;scenario:'default'|'locked';placements:Placement[];protectedPairs:Pair[];
  decisions:DecisionRecord[];changes:(ScheduleChange&{decisionId:string;reason:string})[];
  questionsAsked:number;runId:string|null;questionId:string|null;stopReason:string|null;audit:TraceEntry[];
}
export interface Preview {
  id:string;version:number;questionId:string;choice:'protect'|'allow';result:SolveResult;
  protectedPairs:Pair[];validation:ValidationResult;
}
export interface SessionDocument { state:State;evidence:CulturalEvidence|null;analysis:AnalysisResult|null;preview:Preview|null }
export interface SessionPayload {
  programme:Programme;state:State;evidence:CulturalEvidence|null;analysis:AnalysisResult|null;
  status:{qlooConfigured:boolean;sourceRevision:string};preview?:Preview;
}
export interface AppOptions {
  store:Store;apiKey:string;baseUrl?:string;sourceRevision?:string;appOrigin?:string;
  /** Enable only behind Cloudflare, which supplies this trusted edge header. */
  trustConnectingIp?:boolean;
  /** Injection for isolated failure-path tests only; never enabled by request input. */
  evidenceProvider?:(programme:Programme,beforeRequest:()=>Promise<void>)=>Promise<CulturalEvidence>;
  now?:()=>number;
}
class HttpError extends Error { constructor(public status:number,public code:string,message:string){super(message);} }
const versions=z.object({version:z.number().int().nonnegative()}).strict();
const previewInput=versions.extend({questionId:z.string().min(1).max(256),choice:z.enum(['protect','allow'])}).strict();
const applyInput=versions.extend({previewId:z.string().uuid(),confirm:z.literal(true)}).strict();
const deferInput=versions.extend({questionId:z.string().min(1).max(256)}).strict();
const resetInput=versions.extend({scenario:z.enum(['default','locked'])}).strict();
const emptyToolArgs=z.object({}).strict();
const toolPairArgs=z.object({
  musicId:z.enum(cloneProgramme().sessions.filter(s=>s.kind==='music').map(s=>s.id) as [string,...string[]]),
  filmId:z.enum(cloneProgramme().sessions.filter(s=>s.kind==='film').map(s=>s.id) as [string,...string[]]),
}).strict();
const toolInput=z.discriminatedUnion('name',[
  versions.extend({name:z.literal('read_programme'),args:emptyToolArgs}).strict(),
  versions.extend({name:z.literal('test_pair_protection'),args:toolPairArgs}).strict(),
  versions.extend({name:z.literal('explain_changes'),args:emptyToolArgs}).strict(),
]);
export const TOOL_DEFINITIONS=[
  {name:'read_programme',description:'Read this visitor’s exact fictional programme and accepted constraints at the requested version.',inputSchema:z.toJSONSchema(emptyToolArgs),readOnly:true},
  {name:'test_pair_protection',description:'Compare exact Protect and Allow optima from the same current baseline. No placement is applied and no organizer question is consumed.',inputSchema:z.toJSONSchema(toolPairArgs),readOnly:true},
  {name:'explain_changes',description:'Read actual organizer-approved changes and an independent validation of the current programme. No invented rationale or affinity inference.',inputSchema:z.toJSONSchema(emptyToolArgs),readOnly:true},
] as const;
const utc=(now:number)=>new Date(now).toISOString();
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');

function programmeFor(state:State):Programme { const programme=cloneProgramme();if(state.scenario==='locked')programme.sessions.forEach(s=>s.locked=true);return programme; }
function freshDocument(now:number,version=0,scenario:State['scenario']='default'):SessionDocument {
  const programme=cloneProgramme();
  return {state:{version,scenario,placements:initialPlacements(programme),protectedPairs:[],decisions:[],changes:[],questionsAsked:0,runId:null,questionId:null,stopReason:null,audit:[{at:utc(now),tool:'read_programme',status:'ok',detail:'A deterministic bounded tool workflow loaded eight fictional sessions in two rooms. Cultural evidence has not been requested. No internal LLM chooses or applies placements.'}]},evidence:null,analysis:null,preview:null};
}
function trace(document:SessionDocument,now:number,tool:string,detail:string,status:'ok'|'stopped'='ok'):void {
  document.state.audit.push({at:utc(now),tool,status,detail});
  document.state.audit=document.state.audit.slice(-100);
}
function payload(document:SessionDocument,options:AppOptions):SessionPayload {
  return {programme:programmeFor(document.state),state:document.state,evidence:document.evidence,analysis:document.analysis,status:{qlooConfigured:Boolean(options.apiKey),sourceRevision:options.sourceRevision??'working-tree'},...(document.preview?{preview:document.preview}:{})};
}
async function readJson(request:Request):Promise<unknown> {
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))throw new HttpError(415,'content_type','Send application/json.');
  const declared=Number(request.headers.get('content-length'));
  if(Number.isFinite(declared)&&declared>BODY_LIMIT)throw new HttpError(413,'body_too_large','Request exceeds 32 KiB.');
  const reader=request.body?.getReader();let text='',size=0;const decoder=new TextDecoder();
  if(reader)while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>BODY_LIMIT){await reader.cancel();throw new HttpError(413,'body_too_large','Request exceeds 32 KiB.');}text+=decoder.decode(next.value,{stream:true});}
  text+=decoder.decode();
  try{return JSON.parse(text);}catch{throw new HttpError(400,'invalid_json','Request body is not valid JSON.');}
}
function parsed<T>(schema:z.ZodType<T>,value:unknown):T {const result=schema.safeParse(value);if(!result.success)throw new HttpError(400,'invalid_input','Request fields do not match this operation.');return result.data;}
function checkVersion(document:SessionDocument,version:number):void {if(document.state.version!==version)throw new HttpError(409,'stale_version','The programme changed. Reload the current state before deciding.');}
function requireQuestion(document:SessionDocument,questionId:string):NonNullable<AnalysisResult['question']> {
  const question=document.analysis?.question;
  if(!question||document.state.questionId!==questionId||question.id!==questionId)throw new HttpError(409,'stale_question','This question is no longer pending. Refresh the programme.');
  return question;
}

/** One bounded workflow; only this function presents (and counts) a new question. */
function presentQuestion(document:SessionDocument,now:number):void {
  if(!document.evidence)throw new HttpError(409,'analysis_required','Analyze the programme with Qloo first.');
  const analysis=analyzeCandidates({programme:programmeFor(document.state),baseline:document.state.placements,protectedPairs:document.state.protectedPairs,candidates:document.evidence.candidates,decisions:document.state.decisions,questionsAsked:document.state.questionsAsked});
  document.analysis=analysis;
  document.state.questionId=analysis.question?.id??null;
  document.state.stopReason=analysis.stopReason;
  trace(document,now,'test_pair_protection',`Tested ${analysis.testedPairs} supported pairs against the same baseline using exact finite-domain optimization.`);
  if(analysis.question){
    document.state.questionsAsked++;
    analysis.questionsRemaining=2-document.state.questionsAsked;
    trace(document,now,'request_organizer_decision',`Question ${document.state.questionsAsked} of 2: ${analysis.question.id}. Both branches are feasible and have different placements.`);
  }else trace(document,now,'request_organizer_decision',analysis.stopReason==='question_budget_exhausted'?'Two questions have been presented. This run is complete.':'No useful further question: no supported pair has two different feasible outcomes.','stopped');
}

export function createApp(options:AppOptions):(request:Request)=>Promise<Response> {
  const now=options.now??Date.now;
  let inFlight:Promise<CulturalEvidence>|null=null;
  async function evidence(programme:Programme):Promise<CulturalEvidence> {
    const signature=programme.sessions.map(s=>`${s.id}:${s.title}:${s.entityType}:${s.year??''}`).join('|');
    const key=`qloo-v1:${await hash(signature)}`;
    const cached=await options.store.readEvidence(key,now());if(cached)return cached;
    if(inFlight)return inFlight;
    const owner=crypto.randomUUID();
    if(!await options.store.acquireLease(key,owner,now(),now()+240000))throw new HttpError(503,'analysis_busy','A live Qloo refresh is already running. Try again shortly.');
    inFlight=(async()=>{
      try{
        const beforeRequest=async()=>{
          const time=now(),day=utc(time).slice(0,10),expires=Date.parse(`${day}T00:00:00.000Z`)+86400000;
          const scheduled=await options.store.reserve(`qloo:${day}`,128,time,expires,750);
          if(scheduled===null)throw new QlooError('daily_budget','The shared Qloo budget of 128 requests for this UTC day is exhausted. No fallback was used.',429);
          const wait=scheduled-now();if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));
        };
        const result=options.evidenceProvider?await options.evidenceProvider(programme,beforeRequest):await gatherEvidence(programme,new QlooAdapter({apiKey:options.apiKey,baseUrl:options.baseUrl,beforeRequest}));
        if(result.source!=='qloo-live'||result.queries.some(q=>q.source!=='qloo-live'))throw new HttpError(502,'invalid_evidence','Analysis did not return live Qloo provenance.');
        await options.store.writeEvidence(key,result,now()+EVIDENCE_TTL);
        return result;
      }finally{await options.store.releaseLease(key,owner);inFlight=null;}
    })();
    return inFlight;
  }
  return async(request:Request):Promise<Response>=>{
    const responseHeaders=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
    const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:responseHeaders});
    try{
      const url=new URL(request.url),path=url.pathname;
      if(!path.startsWith('/api/'))throw new HttpError(404,'not_found','No such API route.');
      if(!['GET','POST'].includes(request.method))throw new HttpError(405,'method_not_allowed','Use GET or POST.');
      if(request.method==='POST'&&request.headers.get('origin')!==(options.appOrigin??url.origin))throw new HttpError(403,'origin_rejected','Changes must originate from this application.');
      const token=request.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
      let tokenHash=token&&/^[a-f0-9]{64}$/.test(token)?await hash(token):'';
      let document=tokenHash?await options.store.readSession(tokenHash,now()):null;
      if(!document){
        if(request.method!=='GET'||path!=='/api/session')throw new HttpError(401,'session_required','Open the programme to start a private organizer session.');
        const createdAt=now(),day=utc(createdAt).slice(0,10),dayEnds=Date.parse(`${day}T00:00:00.000Z`)+86400000;
        const clientAddress=options.trustConnectingIp?request.headers.get('CF-Connecting-IP')??'unknown-edge':'local';
        const clientHash=await hash(`${day}:${clientAddress}`),minute=Math.floor(createdAt/60000),hour=Math.floor(createdAt/3600000);
        if(await options.store.reserve(`new-minute:${clientHash}:${minute}`,10,createdAt,(minute+1)*60000)===null||await options.store.reserve(`new-hour:${clientHash}:${hour}`,60,createdAt,(hour+1)*3600000)===null||await options.store.reserve(`new-global:${day}`,1000,createdAt,dayEnds)===null)throw new HttpError(429,'session_creation_limit','The new-session limit has been reached. Reuse an existing session or try again later.');
        const value=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
        tokenHash=await hash(value);document=freshDocument(now());
        await options.store.createSession(tokenHash,document,now()+SESSION_TTL);
        responseHeaders.set('Set-Cookie',`${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${url.protocol==='https:'?'; Secure':''}`);
      }
      const time=now(),minute=Math.floor(time/60000);
      if(await options.store.reserve(`visitor:${tokenHash}:${minute}`,30,time,(minute+1)*60000)===null)throw new HttpError(429,'visitor_rate_limit','This session reached 30 requests per minute. Wait a minute and try again.');
      if(request.method==='GET'){
        if(path==='/api/session')return respond(payload(document,options));
        if(path==='/api/tools')return respond({protocol:'crosscue-tools/v1',version:document.state.version,tools:TOOL_DEFINITIONS,call:{method:'POST',path:'/api/tools',body:{version:'current integer version',name:'tool name',args:'object matching inputSchema'}},authority:'Read-only deterministic tools. No tool can apply a schedule change. Organizer confirmation through the application is required.'});
        if(path==='/api/export'){
          const programme=programmeFor(document.state),validation=validateSchedule(programme,document.state.placements,document.state.protectedPairs,initialPlacements(programme));
          if(!validation.valid)throw new HttpError(409,'invalid_schedule','The current programme failed independent validation and cannot be exported.');
          responseHeaders.set('Content-Disposition','attachment; filename="crosscue-programme.json"');
          return respond({format:'crosscue-programme/v1',exportedAt:utc(now()),sourceRevision:options.sourceRevision??'working-tree',fictionalProgramme:true,programme,placements:document.state.placements,protectedPairs:document.state.protectedPairs,decisions:document.state.decisions,changes:document.state.changes,audit:document.state.audit,validation,evidence:document.evidence,guarantee:'Repairs are exact minima only within the declared finite placement domains. Qloo ranks are contextual cultural signals, not audience-overlap probabilities.'});
        }
        throw new HttpError(404,'not_found','No such API route.');
      }
      const body=await readJson(request),beforeVersion=document.state.version;
      if(path==='/api/tools'){
        const input=parsed(toolInput,body);checkVersion(document,input.version);
        const programme=programmeFor(document.state);
        let result:unknown;
        if(input.name==='read_programme')result={programme,placements:document.state.placements,protectedPairs:document.state.protectedPairs,evidence:document.evidence};
        else if(input.name==='test_pair_protection'){
          const test=testPairProtection(programme,document.state.placements,document.state.protectedPairs,input.args);
          result={...test,validation:{allow:test.allow.feasible?validateSchedule(programme,test.allow.placements,document.state.protectedPairs,document.state.placements):null,protect:test.protect.feasible?validateSchedule(programme,test.protect.placements,[...document.state.protectedPairs,input.args],document.state.placements):null},culturalSupport:document.evidence?.candidates.find(c=>pairKey(c.pair)===pairKey(input.args))??null};
        }else result={changes:document.state.changes,decisions:document.state.decisions,validation:validateSchedule(programme,document.state.placements,document.state.protectedPairs,initialPlacements(programme)),limit:'Explanations report deterministic recorded outcomes. Contextual Qloo rankings do not establish audience overlap.'};
        return respond({name:input.name,version:beforeVersion,authority:'read-only',result,trace:{tool:input.name,executedAt:utc(now()),mode:'deterministic'}});
      }
      const save=async(increment=true)=>{
        if(increment)document!.state.version=beforeVersion+1;
        if(!await options.store.compareAndSwap(tokenHash,beforeVersion,document!,now()+SESSION_TTL))throw new HttpError(409,'stale_version','Another decision changed this programme. Reload before continuing.');
      };
      if(path==='/api/reset'){
        const input=parsed(resetInput,body);checkVersion(document,input.version);
        document=freshDocument(now(),beforeVersion,input.scenario);await save();return respond(payload(document,options));
      }
      if(path==='/api/analyze'||path==='/api/next'){
        const input=parsed(versions,body);checkVersion(document,input.version);
        if(document.state.questionId)return respond(payload(document,options));
        if(document.evidence&&['question_budget_exhausted','no_actionable_candidates'].includes(document.state.stopReason??''))return respond(payload(document,options));
        if(path==='/api/next'&&!document.evidence)throw new HttpError(409,'analysis_required','Run the live Qloo analysis first.');
        if(!document.evidence){
          document.evidence=await evidence(programmeFor(document.state));
          document.state.runId=crypto.randomUUID();
          trace(document,now(),'resolve_entity',`Resolved ${document.evidence.identities.length} exact typed cultural identities. The timetable is fictional; provenance retains original retrieval timestamps.`);
          trace(document,now(),'rank_shortlist','Read directional Qloo rankings within fixed four-entity shortlists. No cross-query affinity averaging or audience probabilities.');
        }
        presentQuestion(document,now());document.preview=null;await save();return respond(payload(document,options));
      }
      if(path==='/api/preview'){
        const input=parsed(previewInput,body);checkVersion(document,input.version);
        const question=requireQuestion(document,input.questionId),programme=programmeFor(document.state);
        const test=testPairProtection(programme,document.state.placements,document.state.protectedPairs,question.pair);
        if(!test.actionable)throw new HttpError(409,'question_changed','This pair no longer has two different feasible outcomes. Refresh the analysis.');
        const result=input.choice==='protect'?test.protect:test.allow;
        const protectedPairs=input.choice==='protect'?[...document.state.protectedPairs,question.pair]:document.state.protectedPairs;
        const validation=result.feasible?validateSchedule(programme,result.placements,protectedPairs,document.state.placements):{valid:false,errors:['The selected branch is infeasible.']};
        if(!result.feasible||!validation.valid)throw new HttpError(409,'invalid_preview','This repair failed independent validation.');
        document.preview={id:crypto.randomUUID(),version:beforeVersion,questionId:question.id,choice:input.choice,result,protectedPairs,validation};
        await save(false);return respond(payload(document,options));
      }
      if(path==='/api/apply'){
        const input=parsed(applyInput,body);checkVersion(document,input.version);
        const preview=document.preview;
        if(!preview||preview.id!==input.previewId||preview.version!==beforeVersion)throw new HttpError(409,'stale_preview','Preview the current programme before applying this decision.');
        const question=requireQuestion(document,preview.questionId),programme=programmeFor(document.state);
        const test=testPairProtection(programme,document.state.placements,document.state.protectedPairs,question.pair);
        const result=preview.choice==='protect'?test.protect:test.allow;
        const protectedPairs=preview.choice==='protect'?[...document.state.protectedPairs,question.pair]:document.state.protectedPairs;
        if(!test.actionable||!result.feasible||!preview.result.feasible||canonicalSchedule(result.placements)!==canonicalSchedule(preview.result.placements)||!validateSchedule(programme,result.placements,protectedPairs,document.state.placements).valid)throw new HttpError(409,'invalid_repair','The confirmed repair failed recomputation or independent validation.');
        const id=crypto.randomUUID();
        document.state.decisions.push({id,questionId:question.id,pair:question.pair,choice:preview.choice,at:utc(now()),beforeVersion,version:beforeVersion+1,changes:result.changes,proof:result.proof});
        const reason=preview.choice==='protect'?`Organizer protected ${pairKey(question.pair)}; the exact repair preserves room turnover and all accepted protections.`:'Organizer allowed overlap; no non-overlap constraint was added.';
        document.state.changes.push(...result.changes.map(change=>({...change,decisionId:id,reason})));
        document.state.placements=result.placements;document.state.protectedPairs=protectedPairs;
        document.state.questionId=null;document.state.stopReason='decision_applied';document.preview=null;
        if(document.analysis)document.analysis.question=null;
        trace(document,now(),'repair_programme',`${preview.choice} explicitly confirmed. Moved ${result.objective.movedSessions} sessions by ${result.objective.displacementMinutes} total minutes. Independent validation passed.`);
        trace(document,now(),'explain_changes',reason);
        await save();return respond(payload(document,options));
      }
      if(path==='/api/defer'){
        const input=parsed(deferInput,body);checkVersion(document,input.version);const question=requireQuestion(document,input.questionId);
        document.state.decisions.push({id:crypto.randomUUID(),questionId:question.id,pair:question.pair,choice:'defer',at:utc(now()),beforeVersion,version:beforeVersion+1,changes:[]});
        document.state.questionId=null;document.state.stopReason='decision_deferred';document.preview=null;
        if(document.analysis)document.analysis.question=null;
        trace(document,now(),'request_organizer_decision','Organizer deferred this question. No placements or protections changed. The presented question still counts toward the budget.');
        await save();return respond(payload(document,options));
      }
      throw new HttpError(404,'not_found','No such API route.');
    }catch(error){
      if(error instanceof HttpError||error instanceof QlooError){if(error.status===429)responseHeaders.set('Retry-After','60');if(error instanceof HttpError&&error.code==='analysis_busy')responseHeaders.set('Retry-After','5');return respond({error:{code:error.code,message:error.message}},error.status);}
      // Never expose provider bodies, stack traces, cookies or secrets.
      return respond({error:{code:'internal_error',message:'The operation could not complete. Reload the programme and try again.'}},500);
    }
  };
}
