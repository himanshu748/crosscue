import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {PROGRAMME,INITIAL_PLACEMENTS} from '../src/core/programme';
import {analyzeCandidates} from '../src/core/analysis';
import {validateSchedule} from '../src/core/validator';
import {buildEvidence} from '../server/evidence';
const live=JSON.parse(await readFile('evidence/qloo-live.json','utf8'));
assert.equal(live.status,'live_api_verified');assert.equal(live.identities.length,8);
const rankings=live.evidence.filter((q:{endpoint:string})=>q.endpoint.endsWith('/v2/insights'));
assert.equal(rankings.length,8);for(const q of rankings){assert.equal(q.results.length,4);assert.equal(q.missingIds.length,0);}
const evidence=buildEvidence(PROGRAMME,live.identities,live.evidence,live.calls);
const analysis=analyzeCandidates({programme:PROGRAMME,baseline:INITIAL_PLACEMENTS,protectedPairs:[],candidates:evidence.candidates});
const question=analysis.question;assert(question?.test.actionable);
assert(question.test.protect.feasible&&question.test.allow.feasible);
assert(validateSchedule(PROGRAMME,question.test.protect.placements,[question.pair],INITIAL_PLACEMENTS).valid);
assert(validateSchedule(PROGRAMME,question.test.allow.placements,[],INITIAL_PLACEMENTS).valid);
const proof={capturedAt:new Date().toISOString(),kind:'real-Qloo-evidence-plus-deterministic-consequence',liveSource:'evidence/qloo-live.json',questionId:question.id,ranks:question.evidence,protect:question.test.protect,allow:question.test.allow,discarded:analysis.assessments.filter(a=>!a.test?.actionable).map(a=>({id:a.candidate.id,reason:a.reason})),unsupported:evidence.unsupported};
await writeFile('evidence/consequence-proof.json',JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({question:question.id,protect:question.test.protect.objective,allow:question.test.allow.objective,candidates:evidence.candidates.length,discarded:proof.discarded.length},null,2));
