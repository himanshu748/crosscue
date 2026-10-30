#!/usr/bin/env python3
"""Exercise ledger rejection guards in a disposable synthetic copy, never the live ledger."""
import copy
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

root = pathlib.Path(__file__).resolve().parents[1]
source = json.loads((root / 'BUILD_STATUS.json').read_text())
results = []

with tempfile.TemporaryDirectory(prefix='crosscue-ledger-guards-') as directory:
    sandbox = pathlib.Path(directory)
    (sandbox / 'scripts').mkdir()
    shutil.copy2(root / 'scripts/verify_completion.py', sandbox / 'scripts/verify_completion.py')
    # These empty stand-ins test path-presence guards only. They are not product evidence.
    for check in source['checks']:
        for name in check['implementationPaths'] + check['evidencePaths']:
            target = sandbox / name
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists():
                target.write_text('Synthetic verifier-control fixture; not acceptance evidence.\n')

    def save(document):
        (sandbox / 'BUILD_STATUS.json').write_text(json.dumps(document))

    def run(*arguments):
        result = subprocess.run([sys.executable, str(sandbox / 'scripts/verify_completion.py'), *arguments], text=True, capture_output=True)
        return result.returncode, json.loads(result.stdout)

    save(source)
    code, report = run('--write')
    assert code == 0, report
    code, report = run()
    assert code == 0, report
    results.append({'case': 'synchronized valid structure', 'result': 'PASS'})

    (sandbox / 'BUILD_CHECKLIST.md').write_text('Unsynchronized synthetic Markdown.\n')
    code, report = run()
    assert code != 0 and any('not synchronized' in e for e in report['errors']), report
    results.append({'case': 'Markdown mismatch rejected', 'result': 'PASS'})

    missing = copy.deepcopy(source)
    missing['checks'].pop()
    save(missing)
    code, report = run('--write')
    assert code != 0 and any('CC-001 through CC-060' in e for e in report['errors']), report
    results.append({'case': 'missing mandatory ID rejected', 'result': 'PASS'})

    unsupported = copy.deepcopy(source)
    unsupported['checks'][0].update(status='VERIFIED', implementationPaths=[], verification='', observed='', evidencePaths=[], testedRevision=None)
    save(unsupported)
    code, report = run('--write')
    assert code != 0 and all(any('missing ' + field in e for e in report['errors']) for field in ['implementationPaths', 'verification', 'observed', 'evidencePaths', 'testedRevision']), report
    results.append({'case': 'unsupported VERIFIED assertion rejected', 'result': 'PASS'})

    missing_evidence = copy.deepcopy(source)
    missing_evidence['checks'][0].update(status='VERIFIED', implementationPaths=['scripts/verify_completion.py'], verification='Synthetic verifier control', observed='Synthetic verifier control', evidencePaths=['evidence/absent-control.json'], testedRevision='synthetic-control-only')
    save(missing_evidence)
    code, report = run('--write')
    assert code != 0 and any('missing evidence/implementation file' in e for e in report['errors']), report
    results.append({'case': 'absent proof file rejected', 'result': 'PASS'})

    premature = copy.deepcopy(source)
    premature['ready'] = True
    premature['checks'][0]['status'] = 'IMPLEMENTED'
    save(premature)
    code, report = run('--write', '--require-complete')
    assert code != 0 and any('Ready requires all 60' in e for e in report['errors']) and any('mandatory gates remain' in e for e in report['errors']), report
    results.append({'case': 'premature readiness and incomplete release rejected', 'result': 'PASS'})

print(json.dumps({'kind': 'synthetic-verifier-control-tests', 'realLedgerModified': False, 'passed': len(results), 'results': results}, indent=2))
