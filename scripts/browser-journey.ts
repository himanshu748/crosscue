import {chromium,expect,type Page,type BrowserContext} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateSchedule} from '../src/core/validator';
import type {Placement} from '../src/core/types';

const base=process.env.CROSSCUE_URL??'http://localhost:3008';
const label=process.env.CROSSCUE_EVIDENCE_LABEL??'local';
if(!/^[a-z0-9-]+$/.test(label))throw new Error('Use a simple evidence label.');
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const assertions:string[]=[],consoleErrors:string[]=[],violations:unknown[]=[];
const screenshots:string[]=[],responses:Array<{url:string;status:number}>=[],expectedFailureResponses:Array<{url:string;status:number}>=[],expectedFailureConsole:string[]=[];
const artifact=`evidence/browser-${label}.json`;
await mkdir('evidence/screenshots',{recursive:true});
const placementSignature=(placements:Placement[])=>JSON.stringify([...placements].sort((a,b)=>a.sessionId.localeCompare(b.sessionId)).map(p=>[p.sessionId,p.roomId,p.start]));
const check=(condition:unknown,message:string)=>{assert(condition,message);assertions.push(message);};
const snap=async(page:Page,name:string)=>{await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));const file=`evidence/screenshots/${label}-${name}.png`;await page.screenshot({path:file,fullPage:true});screenshots.push(file);};
async function make(viewport={width:1440,height:1000},reducedMotion:'reduce'|'no-preference'='no-preference',expectStaleFailure=false){
 const context=await browser.newContext({viewport,reducedMotion,acceptDownloads:true});
 const page=await context.newPage();
 page.on('pageerror',error=>consoleErrors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'){if(expectStaleFailure&&/409/.test(message.text()))expectedFailureConsole.push(message.text());else consoleErrors.push(message.text());}});
 page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400){const record={url:r.url(),status:r.status()};if(expectStaleFailure&&r.status()===409&&new URL(r.url()).pathname==='/api/analyze')expectedFailureResponses.push(record);else responses.push(record);}});
 await page.goto(base,{waitUntil:'networkidle'});
 await expect(page.getByRole('heading',{name:'Fieldnotes Festival'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Analyze cultural conflicts'})).toBeEnabled();
 check((await page.title()).includes('CrossCue'),'Page title identifies CrossCue');
 check(await page.locator('vite-error-overlay').count()===0,'No framework error overlay');
 return {context,page};
}
async function state(context:BrowserContext){const r=await context.request.get(`${base}/api/session`);assert.equal(r.status(),200);return r.json();}
async function analyze(page:Page){await page.getByRole('button',{name:'Analyze cultural conflicts'}).click();await expect.poll(async()=>await page.getByRole('button',{name:'Preview Protect decision'}).isVisible()?'ready':await page.getByRole('alert').isVisible()?'error':'waiting',{timeout:90000}).not.toBe('waiting');if(await page.getByRole('alert').isVisible())throw new Error(await page.getByRole('alert').innerText());await expect(page.getByRole('button',{name:'Preview Protect decision'})).toBeVisible();}
async function axe(page:Page,stage:string){await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();violations.push({stage,violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))}))});if(result.violations.length===0)assertions.push(`${stage}: no axe WCAG A/AA violations`);}
let report:Record<string,unknown>={};let observedSourceRevision:string|null=null;
try{
 const desktop=await make();const {page,context}=desktop;
 await snap(page,'initial');await axe(page,'desktop initial');
 const initial=await state(context);observedSourceRevision=initial.status.sourceRevision;
 check(initial.programme.sessions.length===8&&initial.programme.rooms.length===2,'Complete eight-session two-room programme loaded');
 await page.keyboard.press('Tab');check(await page.getByRole('link',{name:'Skip to programme desk'}).evaluate(e=>e===document.activeElement),'Keyboard starts at visible skip link');
 await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'Inspect scheduling constraints'}).click();await expect(page.getByRole('dialog')).toBeVisible();await axe(page,'desktop constraints dialog');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();assertions.push('Scheduling constraints dialog opens and Escape closes');await page.getByRole('button',{name:/Radiohead, music/}).click();await expect(page.getByRole('dialog')).toBeVisible();await axe(page,'desktop session dialog');await page.keyboard.press('Escape');
 await analyze(page);const analyzed=await state(context);
 check(analyzed.evidence.source==='qloo-live'&&analyzed.evidence.identities.length===8&&analyzed.evidence.queries.filter((q:{endpoint:string})=>q.endpoint.includes('/v2/insights')).length===8,'Real provider provenance has eight resolved identities and eight directional queries');
 check(analyzed.analysis.question.id==='bjork::moonlight','Captured Qloo evidence selects consequential Björk / Moonlight question');
 check(analyzed.analysis.question.test.allow.feasible&&analyzed.analysis.question.test.protect.feasible,'Both decision branches are feasible');
 check(analyzed.analysis.question.test.allow.objective.movedSessions===0&&analyzed.analysis.question.test.protect.objective.movedSessions===3,'Allow keeps baseline; Protect moves three sessions');
 await snap(page,'question');await axe(page,'desktop question');
 await page.getByRole('tab',{name:'Why this question?'}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Qloo evidence',exact:true})).toBeFocused();await expect(page.getByRole('tab',{name:'Qloo evidence',exact:true})).toHaveAttribute('aria-selected','true');
 await page.getByText('Query context & provenance',{exact:false}).first().click();await expect(page.getByText('Response SHA-256',{exact:true}).first()).toBeVisible();assertions.push('Keyboard tab navigation exposes real Qloo query provenance');
 await page.getByRole('button',{name:'Preview Protect decision'}).click();await expect(page.getByRole('button',{name:'Confirm & apply repair'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Review the Protect decision.'})).toBeFocused();assertions.push('Preview transfers keyboard focus to its review heading');const previewed=await state(context);check(JSON.stringify(previewed.state.placements)===JSON.stringify(analyzed.state.placements)&&previewed.state.version===analyzed.state.version,'Protect preview does not mutate saved placements or version');
 await page.getByRole('button',{name:'Before',exact:true}).click();await expect(page.getByRole('button',{name:'Before',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'After',exact:true}).click();await expect(page.getByRole('button',{name:'After',exact:true})).toHaveAttribute('aria-pressed','true');assertions.push('Before and After timetable controls switch preview state');
 check(await page.locator('.workflow-strip .is-active').innerText().then(t=>t.includes('Approve the repair')),'Preview correctly activates approval step');
 await snap(page,'preview');await axe(page,'desktop preview');
 await page.getByRole('button',{name:'Confirm & apply repair'}).click();await expect(page.getByText('Protection approved. 3 sessions moved; your validated timetable is saved.')).toBeVisible();
 const applied=await state(context);check(applied.state.version===analyzed.state.version+1&&applied.state.changes.length===3&&applied.state.decisions[0].choice==='protect','Explicit confirmation saves three-move repair and organizer decision');
 check(validateSchedule(applied.programme,applied.state.placements,applied.state.protectedPairs,analyzed.state.placements).valid,'Applied repair passes independent validator');
 await page.reload({waitUntil:'networkidle'});await expect(page.getByText('Recorded and saved.',{exact:false})).toBeVisible();const reloaded=await state(context);check(JSON.stringify(reloaded.state)===JSON.stringify(applied.state),'Reload preserves full organizer state');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export schedule',exact:true}).click();const download=await downloadPromise;const exportPath=`evidence/browser-${label}-export.json`;await download.saveAs(exportPath);const exported=JSON.parse(await readFile(exportPath,'utf8'));
 check(exported.validation.valid&&exported.placements.length===8&&exported.changes.length===3&&validateSchedule(exported.programme,exported.placements,exported.protectedPairs).valid,'Actual downloaded JSON contains validated eight-session repair, changes and protections');
 check(JSON.stringify(exported.placements)===JSON.stringify(applied.state.placements),'Downloaded schedule matches the applied saved state');
 await page.getByRole('button',{name:'Check for the next useful question'}).click();await expect(page.getByRole('heading',{name:'No more questions worth asking.'})).toBeVisible();check((await state(context)).state.questionsAsked===1,'Main journey naturally stops after one useful question');
 await snap(page,'saved');await axe(page,'desktop saved');
 await page.getByRole('button',{name:'Load the fully locked timetable'}).click();await expect(page.getByRole('dialog')).toBeVisible();await axe(page,'desktop reset dialog');await page.getByRole('button',{name:'Reset programme'}).click();await page.getByRole('button',{name:'Analyze cultural conflicts'}).click();await expect(page.getByRole('heading',{name:'No more questions worth asking.'})).toBeVisible();const locked=await state(context);check(locked.state.questionsAsked===0&&locked.programme.sessions.every((s:{locked:boolean})=>s.locked),'Completely locked programme stops with zero questions');await snap(page,'locked');
 const mobile=await make({width:390,height:844},'reduce');
 check(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px mobile layout has no horizontal overflow');
 check(await mobile.page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),'Mobile browser honors reduced-motion preference');
 await mobile.page.getByRole('button',{name:'Analyze cultural conflicts'}).scrollIntoViewIfNeeded();await snap(mobile.page,'mobile-initial');await axe(mobile.page,'mobile initial');
 const secondInitial=await state(mobile.context);check(secondInitial.state.version===0&&secondInitial.state.decisions.length===0,'Fresh browser context has isolated original state');
 await analyze(mobile.page);await snap(mobile.page,'mobile-question');await axe(mobile.page,'mobile question');
 await mobile.page.getByRole('button',{name:'Preview Allow decision'}).click();await expect(mobile.page.getByRole('button',{name:'Confirm Allow decision'})).toBeVisible();const allowPreview=await state(mobile.context);check(allowPreview.state.decisions.length===0&&allowPreview.preview.result.objective.movedSessions===0,'Allow preview is nonmutating and permits unchanged baseline');
 await mobile.page.getByRole('button',{name:'Confirm Allow decision'}).click();await expect(mobile.page.getByText('Allow decision approved. Your timetable is saved.')).toBeVisible();const allowed=await state(mobile.context);check(allowed.state.decisions[0].choice==='allow'&&allowed.state.changes.length===0,'Explicit Allow confirmation records decision without forcing overlap or changes');
 await mobile.page.getByRole('button',{name:'Check for the next useful question'}).click();await expect(mobile.page.getByRole('button',{name:'Defer question'})).toBeVisible();const beforeDefer=await state(mobile.context);await mobile.page.getByRole('button',{name:'Defer question'}).click();await expect(mobile.page.getByText('Question deferred.',{exact:false})).toBeVisible();const deferred=await state(mobile.context);check(deferred.state.decisions[1].choice==='defer'&&JSON.stringify(deferred.state.placements)===JSON.stringify(beforeDefer.state.placements),'Defer records decision without modifying placements');
 await mobile.page.getByRole('button',{name:'Check for the next useful question'}).click();await expect(mobile.page.getByRole('heading',{name:'Two questions. A clear stopping point.'})).toBeVisible();check((await state(mobile.context)).state.questionsAsked===2,'Allow plus Defer stops at the two-question budget');await snap(mobile.page,'mobile-budget');
 check(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile final state has no horizontal overflow');await axe(mobile.page,'mobile budget');
 const mobileDownloadPromise=mobile.page.waitForEvent('download');await mobile.page.getByRole('button',{name:'Export schedule',exact:true}).click();const mobileDownload=await mobileDownloadPromise;const mobileExportPath=`evidence/browser-${label}-mobile-export.json`;await mobileDownload.saveAs(mobileExportPath);const mobileExport=JSON.parse(await readFile(mobileExportPath,'utf8'));
 check(mobileExport.validation.valid&&mobileExport.placements.length===8&&mobileExport.decisions.length===2&&mobileExport.decisions[0].choice==='allow'&&mobileExport.decisions[1].choice==='defer'&&mobileExport.changes.length===0&&validateSchedule(mobileExport.programme,mobileExport.placements,mobileExport.protectedPairs).valid,'Actual mobile download independently validates eight unchanged placements and both Allow/Defer decisions');
 check(placementSignature(mobileExport.placements)===placementSignature(secondInitial.state.placements),'Mobile export matches the unchanged baseline after Allow and Defer');
 const stale=await make({width:1440,height:1000},'reduce',true);const staleInitial=await state(stale.context);const changed=await stale.context.request.post(`${base}/api/reset`,{headers:{Origin:new URL(base).origin},data:{version:staleInitial.state.version,scenario:'locked'}});check(changed.status()===200,'Concurrent same-visitor action changes server version behind the visible UI');const changedPayload=await changed.json();
 await stale.page.getByRole('button',{name:'Analyze cultural conflicts'}).click();await expect(stale.page.getByRole('alert')).toContainText('This programme has a newer version.');check(expectedFailureResponses.length===1,'Stale UI request is rejected with an actual HTTP409');await axe(stale.page,'desktop stale error');await snap(stale.page,'stale-error');
 const staleCurrent=await state(stale.context);check(staleCurrent.state.version===changedPayload.state.version&&staleCurrent.state.questionsAsked===0,'Stale rejected request leaves current schedule and question count intact');
 await stale.page.getByRole('button',{name:'Refresh workspace'}).click();await expect(stale.page.getByRole('alert')).not.toBeVisible();await expect(stale.page.getByText('All session start times locked',{exact:true})).toBeVisible();assertions.push('Refresh workspace clears the error and loads the current server state');
 await stale.page.getByRole('button',{name:'Analyze cultural conflicts'}).click();await expect(stale.page.getByRole('heading',{name:'No more questions worth asking.'})).toBeVisible();check((await state(stale.context)).state.questionsAsked===0,'Recovered UI completes a fresh valid zero-question analysis');await snap(stale.page,'stale-recovered');await stale.context.close();
 check(violations.every(v=>(v as {violations:unknown[]}).violations.length===0),'All tested states have no axe WCAG A/AA violations');check(consoleErrors.length===0,'No unexpected browser console or page errors');check(responses.length===0,'No unexpected failed application HTTP responses');
 report={pass:true,sourceRevision:applied.status.sourceRevision,evidenceCapturedAt:analyzed.evidence.capturedAt,provenanceQueries:analyzed.evidence.queries.length,exportPath,mobileExportPath};
 await context.close();await mobile.context.close();
}catch(error){const failurePages=[];for(const [i,ctx]of browser.contexts().entries())for(const [j,page]of ctx.pages().entries()){failurePages.push({url:page.url(),alert:await page.getByRole('alert').allTextContents()});await snap(page,`failure-${i}-${j}`);}report={pass:false,error:error instanceof Error?error.stack:String(error),failurePages};process.exitCode=1;}
finally{
 const files=['src/App.tsx','src/styles.css','src/core/analysis.ts','src/core/solver.ts','src/core/validator.ts','server/app.ts','server/qloo.ts'];const sourceHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
 await writeFile(artifact,JSON.stringify({...report,observedSourceRevision,testedAt:new Date().toISOString(),url:base,browser:'Playwright Chromium',browserVersion:browser.version(),browserRouting:'Browser plugin/browser skill not available; regular Playwright with existing installed Chromium',viewports:[{width:1440,height:1000},{width:390,height:844}],sourceHashes,assertions,violations,consoleErrors,responses,expectedFailureResponses,expectedFailureConsole,screenshots},null,2)+'\n');await browser.close();console.log(JSON.stringify({artifact,...report,assertionCount:assertions.length},null,2));
}
