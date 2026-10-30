import {chromium,expect,type Page,type BrowserContext} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateSchedule} from '../src/core/validator';

const base=process.env.CROSSCUE_URL??'http://localhost:3008';
const label=process.env.CROSSCUE_EVIDENCE_LABEL??'local';
if(!/^[a-z0-9-]+$/.test(label))throw new Error('Use a simple evidence label.');
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const assertions:string[]=[],consoleErrors:string[]=[],violations:unknown[]=[];
const screenshots:string[]=[],responses:Array<{url:string;status:number}>=[];
const artifact=`evidence/browser-${label}.json`;
await mkdir('evidence/screenshots',{recursive:true});
const check=(condition:unknown,message:string)=>{assert(condition,message);assertions.push(message);};
const snap=async(page:Page,name:string)=>{const file=`evidence/screenshots/${label}-${name}.png`;await page.screenshot({path:file,fullPage:true});screenshots.push(file);};
async function make(viewport={width:1440,height:1000},reducedMotion:'reduce'|'no-preference'='no-preference'){
 const context=await browser.newContext({viewport,reducedMotion,acceptDownloads:true});
 const page=await context.newPage();
 page.on('pageerror',error=>consoleErrors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
 page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)responses.push({url:r.url(),status:r.status()});});
 await page.goto(base,{waitUntil:'networkidle'});
 await expect(page.getByRole('heading',{name:'Fieldnotes Festival'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Analyze cultural conflicts'})).toBeEnabled();
 check((await page.title()).includes('CrossCue'),'Page title identifies CrossCue');
 check(await page.locator('vite-error-overlay').count()===0,'No framework error overlay');
 return {context,page};
}
async function state(context:BrowserContext){const r=await context.request.get(`${base}/api/session`);assert.equal(r.status(),200);return r.json();}
async function analyze(page:Page){await page.getByRole('button',{name:'Analyze cultural conflicts'}).click();await expect(page.getByRole('button',{name:'Preview Protect decision'})).toBeVisible({timeout:90000});}
async function axe(page:Page,stage:string){await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();violations.push({stage,violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))}))});if(result.violations.length===0)assertions.push(`${stage}: no axe WCAG A/AA violations`);}
let report:Record<string,unknown>={};
try{
 const desktop=await make();const {page,context}=desktop;
 await snap(page,'initial');await axe(page,'desktop initial');
 const initial=await state(context);
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
 check(violations.every(v=>(v as {violations:unknown[]}).violations.length===0),'All tested states have no axe WCAG A/AA violations');check(consoleErrors.length===0,'No browser console or page errors');check(responses.length===0,'No failed application HTTP responses');
 report={pass:true,sourceRevision:applied.status.sourceRevision,evidenceCapturedAt:analyzed.evidence.capturedAt,provenanceQueries:analyzed.evidence.queries.length,exportPath};
 await context.close();await mobile.context.close();
}catch(error){report={pass:false,error:error instanceof Error?error.stack:String(error)};process.exitCode=1;}
finally{
 const files=['src/App.tsx','src/styles.css','src/core/analysis.ts','src/core/solver.ts','src/core/validator.ts','server/app.ts','server/qloo.ts'];const sourceHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
 await writeFile(artifact,JSON.stringify({...report,testedAt:new Date().toISOString(),url:base,browser:'Playwright Chromium',browserVersion:browser.version(),browserRouting:'Browser plugin/browser skill not available; regular Playwright with existing installed Chromium',viewports:[{width:1440,height:1000},{width:390,height:844}],sourceHashes,assertions,violations,consoleErrors,responses,screenshots},null,2)+'\n');await browser.close();console.log(JSON.stringify({artifact,...report,assertionCount:assertions.length},null,2));
}
