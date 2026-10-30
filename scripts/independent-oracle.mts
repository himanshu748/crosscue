import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const {solveProgramme}=await import(pathToFileURL(root+'/src/core/solver.ts').href);
const {validateSchedule}=await import(pathToFileURL(root+'/src/core/validator.ts').href);
const {PROGRAMME,INITIAL_PLACEMENTS}=await import(pathToFileURL(root+'/src/core/programme.ts').href);
let seed=7139; const rnd=(n:number)=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
let checked=0;
for(let trial=0;trial<250;trial++){
 const p:any={id:'fuzz',name:'Synthetic independent audit',fictional:true,startTime:'14:00',horizonMinutes:120,turnoverMinutes:rnd(4),rooms:[{id:'stage',name:'Stage'},{id:'screen',name:'Screen'}],sessions:Array.from({length:4},(_,i)=>{const starts=[...new Set([rnd(12)*5,rnd(12)*5,rnd(12)*5])];return{id:'s'+i,title:'s'+i,kind:i%2?'film':'music',entityType:i%2?'movie':'artist',roomId:i%2?'screen':'stage',durationMinutes:5+rnd(4)*5,initialStart:starts[0],allowedStarts:starts,locked:rnd(5)===0};})};
 const baseline=p.sessions.map((s:any)=>({sessionId:s.id,roomId:s.roomId,start:s.initialStart}));
 const pairs:any[]=[];for(const m of [0,2])for(const f of [1,3])if(rnd(2))pairs.push({musicId:'s'+m,filmId:'s'+f});
 let assignments:any[][]=[[]];for(const s of p.sessions)assignments=assignments.flatMap(a=>(s.locked?[s.initialStart]:s.allowedStarts).map((t:number)=>[...a,{sessionId:s.id,roomId:s.roomId,start:t}]));
 const valid=assignments.filter(a=>a.every((x,i)=>a.every((y,j)=>{if(j<=i)return true;const sx=p.sessions[i],sy=p.sessions[j];const same=x.roomId===y.roomId,protect=pairs.some(q=>[q.musicId,q.filmId].includes(x.sessionId)&&[q.musicId,q.filmId].includes(y.sessionId));if(!same&&!protect)return true;const left=x.start<y.start?{x,s:sx,y}:{x:y,s:sy,y:x};return left.y.start-left.x.start-left.s.durationMinutes>=(same?p.turnoverMinutes:0);})));
 const score=(a:any[]):[number,number,string]=>[a.filter((x,i)=>x.start!==baseline[i].start).length,a.reduce((n,x,i)=>n+Math.abs(x.start-baseline[i].start),0),a.map(x=>x.sessionId+':'+x.roomId+':'+('000000'+x.start).slice(-6)).sort().join('|')];
 valid.sort((a,b)=>{const x=score(a),y=score(b);return x[0]-y[0]||x[1]-y[1]||(x[2]<y[2]?-1:x[2]>y[2]?1:0);});
 const actual=solveProgramme(p,baseline,pairs);
 if(actual.feasible!==!!valid.length)throw Error('feasibility mismatch '+trial);
 if(actual.feasible){if(!validateSchedule(p,actual.placements,pairs,baseline).valid)throw Error('validator mismatch '+trial);const expected=score(valid[0]);if(actual.objective.movedSessions!==expected[0]||actual.objective.displacementMinutes!==expected[1]||actual.objective.canonical!==expected[2])throw Error('optimum mismatch '+trial);}
 checked++;
}
const malformed=structuredClone(PROGRAMME);malformed.sessions[0].entityType='movie';const result=solveProgramme(malformed,INITIAL_PLACEMENTS);
const files=['src/core/solver.ts','src/core/validator.ts','src/core/analysis.ts','tests/scheduler.test.ts'];
console.log(JSON.stringify({kind:'synthetic-independent-oracle',seed:7139,randomDomains:checked,result:'PASS',structuralMismatchRejected:!result.feasible,sourceHashes:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(root+'/'+p)).digest('hex')]))},null,2));
if(result.feasible)process.exitCode=1;
