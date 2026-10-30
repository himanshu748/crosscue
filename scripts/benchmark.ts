import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {PROGRAMME,INITIAL_PLACEMENTS} from '../src/core/programme';
import {analyzeCandidates,testPairProtection} from '../src/core/analysis';
import {validateSchedule} from '../src/core/validator';
import {objectiveFor} from '../src/core/solver';
import {buildEvidence} from '../server/evidence';
import type {Candidate,OrganizerDecision,Pair} from '../src/core/types';
const raw=await readFile('benchmark/blind-llm.json','utf8'),blind=JSON.parse(raw);
const live=JSON.parse(await readFile('evidence/qloo-live.json','utf8'));
const cultural=buildEvidence(PROGRAMME,live.identities,live.evidence,live.calls);
const tokens=(tags:string[])=>new Set(tags.flatMap(t=>t.toLowerCase().split(/[^a-z]+/)).filter(Boolean));
const metadata=blind.metadata.music.flatMap((m:{id:string;tags:string[]})=>blind.metadata.films.map((f:{id:string;tags:string[]})=>{const a=tokens(m.tags),b=tokens(f.tags),intersection=[...a].filter(t=>b.has(t)).length,union=new Set([...a,...b]).size;return {id:`${m.id}::${f.id}`,pair:{musicId:m.id,filmId:f.id},similarity:intersection/union};})).sort((a:{similarity:number;id:string},b:{similarity:number;id:string})=>b.similarity-a.similarity||(a.id<b.id?-1:a.id>b.id?1:0));
const llm:Candidate[]=blind.ranking.map((pair:Pair)=>({id:`${pair.musicId}::${pair.filmId}`,pair:{musicId:pair.musicId,filmId:pair.filmId}}));
assert.equal(new Set(llm.map(c=>c.id)).size,16);
const arms=[{name:'Qloo-assisted',candidates:cultural.candidates,preparationQlooCalls:live.calls,modelInvocations:0},{name:'Metadata-only',candidates:metadata,preparationQlooCalls:0,modelInvocations:0},{name:'Blind LLM-only',candidates:llm,preparationQlooCalls:0,modelInvocations:1}];
const results=arms.map(arm=>{
 const start=performance.now();let placements=structuredClone(INITIAL_PLACEMENTS);const protectedPairs:Pair[]=[],decisions:OrganizerDecision[]=[],questions:unknown[]=[];let cumulativeMoved=0,cumulativeDisplacement=0;
 for(let n=0;n<2;n++){
  const a=analyzeCandidates({programme:PROGRAMME,baseline:placements,protectedPairs,candidates:arm.candidates,decisions,questionsAsked:decisions.length});
  if(!a.question)break;const q=a.question;assert(q.test.protect.feasible&&q.test.allow.feasible&&q.test.actionable);
  protectedPairs.push(q.pair);decisions.push({pair:q.pair,choice:'protect'});const repaired=q.test.protect;
  assert(validateSchedule(PROGRAMME,repaired.placements,protectedPairs,placements).valid);
  cumulativeMoved+=repaired.objective.movedSessions;cumulativeDisplacement+=repaired.objective.displacementMinutes;placements=repaired.placements;
  questions.push({pair:q.pair,choice:'protect',protect:repaired.objective,allow:q.test.allow.objective});
 }
 const final=objectiveFor(placements,INITIAL_PLACEMENTS);
 const remaining=analyzeCandidates({programme:PROGRAMME,baseline:placements,protectedPairs,candidates:llm,decisions,questionsAsked:0}).assessments.filter(a=>a.test?.actionable).map(a=>a.candidate.pair);
 const stopReason=questions.length===2?'question_budget_exhausted':'no_actionable_candidates';
 return {selector:arm.name,stopReason,protectedPairs,remainingActionablePairsAcrossAll16:remaining,remainingActionableCount:remaining.length,questionsAsked:questions.length,actionableQuestions:questions.length,differentFeasibleBranchOutcomes:questions.length,validRepairs:questions.length,distinctSessionsMoved:final.movedSessions,totalFinalDisplacementMinutes:final.displacementMinutes,cumulativeMoved,cumulativeDisplacementMinutes:cumulativeDisplacement,replayRuntimeMs:Number((performance.now()-start).toFixed(2)),preparationQlooCalls:arm.preparationQlooCalls,modelInvocations:arm.modelInvocations,questions,finalPlacements:placements};
});
// Secondary mechanism ablation, declared after the primary protocol was frozen.
// Keep the same Qloo ordering and always-Protect policy, but spend the two-question
// budget before testing consequence. Both methods still validate every applied state.
let naivePlacements=structuredClone(INITIAL_PLACEMENTS);
const naiveProtected:Pair[]=[];
const naiveQuestions=cultural.candidates.slice(0,2).map(candidate=>{
 const test=testPairProtection(PROGRAMME,naivePlacements,naiveProtected,candidate.pair);
 let applied=false;
 if(test.protect.feasible){
  naiveProtected.push(candidate.pair);
  assert(validateSchedule(PROGRAMME,test.protect.placements,naiveProtected,naivePlacements).valid);
  naivePlacements=test.protect.placements;applied=true;
 }
 return {pair:candidate.pair,choice:'protect',actionable:test.actionable,reason:test.reason,bothBranchesFeasible:test.allow.feasible&&test.protect.feasible,applied,protect:test.protect.feasible?test.protect.objective:null,allow:test.allow.feasible?test.allow.objective:null};
});
const naiveObjective=objectiveFor(naivePlacements,INITIAL_PLACEMENTS);
const consequenceFilterAblation={
 kind:'secondary-mechanism-ablation',
 changedVariable:'Ask the top two Qloo-ranked pairs before consequence filtering versus the existing consequence-filtered workflow.',
 shared:'Same captured Qloo ordering, initial programme, solver, two-question cap, always-Protect policy and independent validator.',
 unfiltered:{questionsAsked:naiveQuestions.length,actionableQuestions:naiveQuestions.filter(q=>q.actionable).length,inconsequentialQuestions:naiveQuestions.filter(q=>q.reason==='same_schedule').length,validAppliedDecisions:naiveQuestions.filter(q=>q.applied).length,distinctSessionsMoved:naiveObjective.movedSessions,totalFinalDisplacementMinutes:naiveObjective.displacementMinutes,questions:naiveQuestions},
 filtered:{questionsAsked:results[0].questionsAsked,actionableQuestions:results[0].actionableQuestions,inconsequentialQuestions:0,distinctSessionsMoved:results[0].distinctSessionsMoved,totalFinalDisplacementMinutes:results[0].totalFinalDisplacementMinutes},
 interpretation:'Tests the value of consequence filtering, not Qloo versus another cultural selector. More schedule movement is not evidence of better attendee outcomes.'
};
const report={kind:'single-festival-controlled-replay',capturedAt:new Date().toISOString(),protocol:'benchmark/PROTOCOL.md',blindInputSha256:createHash('sha256').update(raw).digest('hex'),programmeSha256:createHash('sha256').update(JSON.stringify(PROGRAMME)).digest('hex'),results,consequenceFilterAblation,metadataSelectorScores:metadata.map((c:{id:string;similarity:number})=>({id:c.id,similarity:c.similarity})),metadataZeroScoreTies:metadata.filter((c:{similarity:number})=>c.similarity===0).length,limitations:['No ground-truth audience labels; not a taste-quality or attendance evaluation.','One actual blind model generation; provider model ID/inference latency not exposed.','The sparse metadata baseline has 15 of 16 zero-similarity ties, so its result is substantially driven by canonical tie-breaking.','Replay times exclude acquisition; no provider speed superiority claim.','All repairs exact only within declared domains; simulated always-Protect policy.','Residual actionable pairs are an operational diagnostic across all 16 pairs, not evidence that an organizer should protect those pairs.']};
await writeFile('evidence/benchmark.json',JSON.stringify(report,null,2)+'\n');
console.table(results.map(({selector,questionsAsked,validRepairs,distinctSessionsMoved,totalFinalDisplacementMinutes,replayRuntimeMs,preparationQlooCalls})=>({selector,questionsAsked,validRepairs,distinctSessionsMoved,totalFinalDisplacementMinutes,replayRuntimeMs,preparationQlooCalls})));
