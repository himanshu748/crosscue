#!/usr/bin/env python3
"""One ledger; fail closed on evidence gaps or unsynchronized Markdown."""
import argparse,json,pathlib,sys
root=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--require-complete',action='store_true');a=p.parse_args()
s=json.loads((root/'BUILD_STATUS.json').read_text());checks=s['checks'];errors=[]
if [c['id'] for c in checks]!=[f'CC-{i:03}' for i in range(1,61)]:errors.append('Expected exactly CC-001 through CC-060 in order')
if {c['phase'] for c in checks}!=set(range(1,11)):errors.append('Expected ten phases')
allowed={'NOT_TESTED','IMPLEMENTED','VERIFIED','FAILED','BLOCKED'}
for c in checks:
 if c['status'] not in allowed:errors.append(c['id']+': invalid status')
 if c['status']=='VERIFIED':
  for field in ['implementationPaths','verification','expected','observed','evidencePaths','testedRevision']:
   if not c.get(field):errors.append(c['id']+': missing '+field)
  for f in c['implementationPaths']+c['evidencePaths']:
   if not (root/f).is_file():errors.append(c['id']+': missing evidence/implementation file '+f)
verified=sum(c['status']=='VERIFIED' for c in checks)
if s['ready'] and verified!=60:errors.append('Ready requires all 60 mandatory checks verified')
lines=['# CrossCue — sole implementation ledger','',s['contractOrigin'],'',f'**{verified}/60 VERIFIED. Ready: {str(s["ready"]).lower()}.** IMPLEMENTED is not VERIFIED.','']
for phase in range(1,11):
 entries=[c for c in checks if c['phase']==phase]
 lines += [f'## Phase {phase}: {entries[0]["phaseName"]}','']
 for c in entries:
  lines += [f'### {c["id"]} — {c["title"]} [{c["status"]}]','',f'- Acceptance: {c["expected"]}',f'- Implementation: {", ".join(c["implementationPaths"]) or "Pending"}',f'- Verification: {c["verification"] or "Not run"}',f'- Observed: {c["observed"]}',f'- Evidence: {", ".join(c["evidencePaths"]) or "None"}',f'- Tested revision: {c["testedRevision"] or "None"}','']
rendered='\n'.join(lines).rstrip()+'\n';target=root/'BUILD_CHECKLIST.md'
if a.write:target.write_text(rendered)
elif not target.exists() or target.read_text()!=rendered:errors.append('BUILD_CHECKLIST.md is not synchronized; run --write')
if a.require_complete and verified!=60:errors.append(f'{60-verified} mandatory gates remain unverified')
print(json.dumps({'verified':verified,'total':60,'ready':s['ready'],'errors':errors},indent=2));sys.exit(bool(errors))
