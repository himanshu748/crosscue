import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCandidates, testPairProtection } from '../src/core/analysis';
import { cloneProgramme, INITIAL_PLACEMENTS, initialPlacements, PROGRAMME } from '../src/core/programme';
import { canonicalSchedule, solveProgramme } from '../src/core/solver';
import { validateSchedule } from '../src/core/validator';
import type { Pair, Placement, Programme, Session } from '../src/core/types';

const pair: Pair = { musicId:'bjork',filmId:'moonlight' };
const allPairs = PROGRAMME.sessions.filter(s=>s.kind==='music').flatMap(m => PROGRAMME.sessions.filter(s=>s.kind==='film').map(f => ({musicId:m.id,filmId:f.id})));

/** Independent brute-force test oracle: explicit loops and interval intersection. */
function oracle(programme: Programme, baseline: Placement[], pairs: Pair[]): Placement[] | undefined {
  let assignments: Placement[][] = [[]];
  for (const s of programme.sessions) {
    const old = baseline.find(p=>p.sessionId===s.id)!;
    assignments = assignments.flatMap(partial => (s.locked?[old.start]:s.allowedStarts).map(start=>[...partial,{sessionId:s.id,roomId:s.roomId,start}]));
  }
  function cost(ps: Placement[]): [number,number,string] {
    let count=0,minutes=0;
    for (const p of ps) {
      const old=baseline.find(x=>x.sessionId===p.sessionId)!;
      count+=Number(old.start!==p.start || old.roomId!==p.roomId);
      minutes+=Math.abs(old.start-p.start);
    }
    const key=ps.map(p=>`${p.sessionId}:${p.roomId}:${('000000'+p.start).slice(-6)}`).sort().join('|');
    return [count,minutes,key];
  }
  const valid=assignments.filter(ps => {
    for(let i=0;i<ps.length;i++) for(let j=i+1;j<ps.length;j++) {
      const a=ps[i],b=ps[j], sa=programme.sessions.find(s=>s.id===a.sessionId)!,sb=programme.sessions.find(s=>s.id===b.sessionId)!;
      const protectedPair=pairs.some(p=>(p.musicId===a.sessionId && p.filmId===b.sessionId)||(p.musicId===b.sessionId && p.filmId===a.sessionId));
      if(a.roomId===b.roomId || protectedPair) {
        const extra=a.roomId===b.roomId?programme.turnoverMinutes:0;
        const occupiedA=new Set(Array.from({length:sa.durationMinutes+extra},(_,k)=>a.start+k));
        if(Array.from({length:sb.durationMinutes+extra},(_,k)=>b.start+k).some(t=>occupiedA.has(t))) return false;
      }
    }
    return true;
  });
  valid.sort((a,b)=>{const x=cost(a),y=cost(b);return x[0]-y[0]||x[1]-y[1]||(x[2]<y[2]?-1:x[2]>y[2]?1:0);});
  return valid[0];
}

test('declared fixture is complete, valid, two rooms/four music/four films, with 256 finite assignments',()=>{
  assert.equal(PROGRAMME.sessions.length,8);
  assert.equal(PROGRAMME.sessions.filter(s=>s.kind==='music').length,4);
  assert.equal(PROGRAMME.sessions.filter(s=>s.kind==='film').length,4);
  assert.equal(PROGRAMME.rooms.length,2);
  assert.deepEqual(validateSchedule(PROGRAMME,INITIAL_PLACEMENTS),{valid:true,errors:[]});
  const result=solveProgramme(PROGRAMME,INITIAL_PLACEMENTS);
  assert.ok(result.feasible);
  assert.equal(result.proof.domainSize,256);
  assert.equal(result.proof.examined,256);
  assert.equal(result.objective.movedSessions,0);
});

test('all 16 individual protections agree with a separate exhaustive oracle and independent validator',()=>{
  for(const p of allPairs) {
    const actual=solveProgramme(PROGRAMME,INITIAL_PLACEMENTS,[p]);
    const expected=oracle(PROGRAMME,INITIAL_PLACEMENTS,[p]);
    assert.equal(actual.feasible,Boolean(expected),JSON.stringify(p));
    if(actual.feasible && expected) {
      assert.equal(canonicalSchedule(actual.placements),canonicalSchedule(expected),JSON.stringify(p));
      assert.ok(validateSchedule(PROGRAMME,actual.placements,[p],INITIAL_PLACEMENTS).valid);
    }
  }
});

test('accepted protections persist through a subsequent minimal repair',()=>{
  const priorPair={musicId:'daft-punk',filmId:'blade-runner'};
  const first=solveProgramme(PROGRAMME,INITIAL_PLACEMENTS,[priorPair]);
  assert.ok(first.feasible);
  const protectedPairs=[priorPair,pair];
  const second=solveProgramme(PROGRAMME,first.placements,protectedPairs);
  assert.ok(second.feasible);
  const expected=oracle(PROGRAMME,first.placements,protectedPairs)!;
  assert.equal(canonicalSchedule(second.placements),canonicalSchedule(expected));
  assert.ok(validateSchedule(PROGRAMME,second.placements,protectedPairs,first.placements).valid);
  assert.equal(second.objective.movedSessions,2);
  assert.equal(second.objective.displacementMinutes,180);
});

test('Allow permits overlap while Protect returns the minimal three-session turnover cascade',()=>{
  const result=testPairProtection(PROGRAMME,INITIAL_PLACEMENTS,[],pair);
  assert.ok(result.actionable);
  assert.equal(result.reason,'different_feasible_schedules');
  assert.ok(result.allow.feasible && result.protect.feasible);
  assert.equal(result.allow.objective.movedSessions,0);
  assert.equal(result.protect.objective.movedSessions,3);
  assert.equal(result.protect.objective.displacementMinutes,270);
  assert.deepEqual(result.differentSessionIds,['bjork','daft-punk','kendrick']);
  assert.equal(validateSchedule(PROGRAMME,result.allow.placements,[pair]).valid,false);
  assert.equal(validateSchedule(PROGRAMME,result.protect.placements,[pair]).valid,true);
});

test('a prior repair can make a later question unnecessary without imposing a decision',()=>{
  const first=solveProgramme(PROGRAMME,INITIAL_PLACEMENTS,[pair]);
  assert.ok(first.feasible);
  const nextPair={musicId:'daft-punk',filmId:'blade-runner'};
  const result=testPairProtection(PROGRAMME,first.placements,[pair],nextPair);
  assert.equal(result.actionable,false);assert.equal(result.reason,'same_schedule');
  assert.ok(result.allow.feasible && result.protect.feasible);
  assert.equal(result.allow.objective.movedSessions,0);
});

test('Allow never imposes overlap; a nonoverlapping pair has the same optimum and no question',()=>{
  const nonoverlap={musicId:'bjork',filmId:'whiplash'};
  const result=testPairProtection(PROGRAMME,INITIAL_PLACEMENTS,[],nonoverlap);
  assert.equal(result.actionable,false);
  assert.equal(result.reason,'same_schedule');
  assert.ok(result.allow.feasible);
  assert.equal(validateSchedule(PROGRAMME,result.allow.placements,[nonoverlap]).valid,true);
});

test('infeasible protection is explained and never offered',()=>{
  const result=testPairProtection(PROGRAMME,INITIAL_PLACEMENTS,[],{musicId:'radiohead',filmId:'spirited-away'});
  assert.equal(result.actionable,false);
  assert.equal(result.reason,'protect_infeasible');
  assert.ok(result.allow.feasible);
  assert.equal(result.protect.feasible,false);
});

test('a completely locked timetable produces zero actionable questions',()=>{
  const programme=cloneProgramme(); programme.sessions.forEach(s=>s.locked=true);
  const result=analyzeCandidates({programme,baseline:INITIAL_PLACEMENTS,protectedPairs:[],candidates:allPairs.map((pair,i)=>({id:`c${i}`,pair}))});
  assert.equal(result.question,null);
  assert.equal(result.stopReason,'no_actionable_candidates');
  assert.equal(result.testedPairs,16);
  assert.ok(result.assessments.every(a=>['same_schedule','protect_infeasible'].includes(a.reason)));
});

test('question budget is two, Defer consumes budget and suppresses repeated question',()=>{
  const candidates=[{id:'first',pair},{id:'second',pair:{musicId:'daft-punk',filmId:'blade-runner'}}];
  const first=analyzeCandidates({programme:PROGRAMME,baseline:INITIAL_PLACEMENTS,protectedPairs:[],candidates});
  assert.equal(first.question?.id,'first');
  const second=analyzeCandidates({programme:PROGRAMME,baseline:INITIAL_PLACEMENTS,protectedPairs:[],candidates,decisions:[{pair,choice:'defer'}]});
  assert.equal(second.question?.id,'second');
  assert.equal(second.questionsRemaining,1);
  const exhausted=analyzeCandidates({programme:PROGRAMME,baseline:INITIAL_PLACEMENTS,protectedPairs:[],candidates,questionsAsked:2});
  assert.equal(exhausted.question,null);assert.equal(exhausted.testedPairs,0);
  assert.equal(exhausted.stopReason,'question_budget_exhausted');
  assert.throws(()=>analyzeCandidates({programme:PROGRAMME,baseline:INITIAL_PLACEMENTS,protectedPairs:[],candidates,questionsAsked:-1}));
});

test('duplicate, wrong-kind and settled candidate pairs cannot manufacture questions',()=>{
  const result=analyzeCandidates({programme:PROGRAMME,baseline:INITIAL_PLACEMENTS,protectedPairs:[],decisions:[{pair,choice:'allow'}],candidates:[
    {id:'settled',pair},{id:'duplicate',pair},{id:'wrong',pair:{musicId:'moonlight',filmId:'bjork'}},
  ]});
  assert.equal(result.question,null);
  assert.deepEqual(result.assessments.map(a=>a.reason),['already_decided','duplicate_pair','invalid_pair']);
});

test('independent validator catches duplicate/missing, room, start, turnover, lock and protection violations',()=>{
  const duplicate=structuredClone(INITIAL_PLACEMENTS); duplicate[1]={...duplicate[0]};
  assert.equal(validateSchedule(PROGRAMME,duplicate).valid,false);
  assert.equal(solveProgramme(PROGRAMME,duplicate).feasible,false);
  const wrongRoom=structuredClone(INITIAL_PLACEMENTS);wrongRoom[0].roomId='screen';
  assert.equal(validateSchedule(PROGRAMME,wrongRoom).valid,false);
  const wrongStart=structuredClone(INITIAL_PLACEMENTS);wrongStart[0].start=31;
  assert.equal(validateSchedule(PROGRAMME,wrongStart).valid,false);
  const turnover=structuredClone(INITIAL_PLACEMENTS);turnover[1].start=270;
  assert.ok(validateSchedule(PROGRAMME,turnover).errors.some(e=>e.includes('turnover')));
  const locked=cloneProgramme();locked.sessions[1].locked=true;
  assert.ok(validateSchedule(locked,turnover,[],INITIAL_PLACEMENTS).errors.some(e=>e.includes('Locked')));
  assert.ok(validateSchedule(PROGRAMME,INITIAL_PLACEMENTS,[pair]).errors.some(e=>e.includes('Protected')));
});

function mini(sessions: Session[]): Programme {
  return {id:'test-only',name:'Synthetic scheduling test',fictional:true,startTime:'14:00',horizonMinutes:200,turnoverMinutes:0,rooms:[{id:'stage',name:'Stage'},{id:'screen',name:'Screen'}],sessions};
}
function session(id:string,kind:'music'|'film',initialStart:number,allowedStarts:number[],durationMinutes=10):Session {
  return {id,title:id,kind,entityType:kind==='music'?'artist':'movie',durationMinutes,roomId:kind==='music'?'stage':'screen',initialStart,allowedStarts,locked:false};
}

test('moved-session count outranks displacement; among equal counts displacement is minimized',()=>{
  const p=mini([session('m','music',0,[0,20,100]),session('other','music',20,[20,30]),session('f','film',0,[0],20)]);
  const r=solveProgramme(p,initialPlacements(p),[{musicId:'m',filmId:'f'}]);
  assert.ok(r.feasible);
  assert.equal(r.objective.movedSessions,1);
  assert.equal(r.objective.displacementMinutes,100);
  const smaller=mini([session('m','music',0,[0,20,100]),session('f','film',0,[0],20)]);
  const s=solveProgramme(smaller,initialPlacements(smaller),[{musicId:'m',filmId:'f'}]);
  assert.ok(s.feasible);assert.equal(s.objective.displacementMinutes,20);
});

test('stable canonical tie break survives reordered domains, sessions and baseline',()=>{
  const p=mini([session('m','music',20,[40,20,0]),session('f','film',20,[20])]);
  const baseline=initialPlacements(p);
  const r=solveProgramme(p,baseline,[{musicId:'m',filmId:'f'}]);
  assert.ok(r.feasible);
  assert.equal(r.placements.find(x=>x.sessionId==='m')!.start,0);
  p.sessions.reverse();p.sessions.forEach(s=>s.allowedStarts.reverse());baseline.reverse();
  const reordered=solveProgramme(p,baseline,[{musicId:'m',filmId:'f'}]);
  assert.ok(reordered.feasible);assert.deepEqual(r.objective,reordered.objective);
});

test('touching protected intervals are allowed but same-room turnover remains mandatory',()=>{
  const p=mini([session('m','music',20,[20]),session('f','film',0,[0],20)]);
  p.turnoverMinutes=15;
  const r=solveProgramme(p,initialPlacements(p),[{musicId:'m',filmId:'f'}]);
  assert.ok(r.feasible);assert.ok(validateSchedule(p,r.placements,[{musicId:'m',filmId:'f'}]).valid);
});

test('impossible existing protection makes both branches infeasible and input state remains unchanged',()=>{
  const programme=cloneProgramme();programme.sessions.forEach(s=>s.locked=true);
  const baseline=structuredClone(INITIAL_PLACEMENTS), frozen=JSON.stringify({programme,baseline});
  const result=testPairProtection(programme,baseline,[pair],{musicId:'daft-punk',filmId:'blade-runner'});
  assert.equal(result.reason,'baseline_infeasible');assert.equal(result.actionable,false);
  assert.equal(JSON.stringify({programme,baseline}),frozen);
});

test('oversized domains fail closed without an unproved optimal answer',()=>{
  const p=cloneProgramme();p.horizonMinutes=10000;
  p.sessions.forEach(s=>s.allowedStarts=Array.from({length:10},(_,i)=>s.initialStart+i*15));
  const r=solveProgramme(p,INITIAL_PLACEMENTS);
  assert.equal(r.feasible,false);if(!r.feasible)assert.equal(r.reason,'domain_limit');
  assert.equal(r.proof.examined,0);
});

test('solver rejects malformed entity categories and empty room IDs like independent validator',()=>{
 const programme=structuredClone(PROGRAMME);programme.sessions[0].entityType='movie';
 assert.equal(solveProgramme(programme,INITIAL_PLACEMENTS).feasible,false);
 const empty=structuredClone(PROGRAMME);empty.rooms[0].id='';
 for(const session of empty.sessions)if(session.roomId==='stage')session.roomId='';
 const baseline=INITIAL_PLACEMENTS.map(p=>({...p,roomId:p.roomId==='stage'?'':p.roomId}));
 assert.equal(solveProgramme(empty,baseline).feasible,false);
});
