/** External read-only client demonstration. No model or Qloo fixture is injected. */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const origin=process.env.CROSSCUE_URL??'http://localhost:3008';
const first=await fetch(`${origin}/api/session`);
assert.equal(first.status,200);
const cookie=first.headers.get('set-cookie')!.split(';')[0];
let state=await first.json() as any;
const call=async(path:string,body?:unknown)=>{
  const response=await fetch(`${origin}/api/${path}`,{method:body?'POST':'GET',headers:{cookie,...(body?{origin,'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,body:await response.json() as any};
};
const analysis=await call('analyze',{version:state.state.version});
assert.equal(analysis.status,200);state=analysis.body;
assert.equal(state.evidence.source,'qloo-live');assert.equal(state.evidence.identities.length,8);
const registry=await call('tools');assert.equal(registry.status,200);
assert(registry.body.tools.every((t:any)=>t.readOnly));
const trace=[];
for(const [name,args] of [['read_programme',{}],['test_pair_protection',{musicId:'bjork',filmId:'moonlight'}],['explain_changes',{}]] as const){
  const response=await call('tools',{version:state.state.version,name,args});assert.equal(response.status,200);
  assert.equal(response.body.authority,'read-only');
  if(name==='test_pair_protection')assert(response.body.result.actionable&&response.body.result.validation.protect.valid&&response.body.result.culturalSupport);
  trace.push(response.body);
}
const rejected=await call('tools',{version:state.state.version,name:'apply_programme',args:{placements:[]}});
assert.equal(rejected.status,400);
const after=await call('session');assert.deepEqual(after.body.state,state.state);
const report={kind:'actual-external-tool-client',url:origin,testedAt:new Date().toISOString(),sourceRevision:state.status.sourceRevision,result:'PASS',modelUsed:false,registry:registry.body,trace,unauthorizedMutationStatus:rejected.status,stateUnchanged:true};
await writeFile(process.env.EVIDENCE_PATH??'evidence/tool-client.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',tools:trace.length,liveEvidence:state.evidence.source,sourceRevision:state.status.sourceRevision,stateUnchanged:true}));
