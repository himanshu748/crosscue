# CrossCue build and verification notes

Updated October 30, 2026. This document records current boundaries; the sole acceptance ledger remains `BUILD_STATUS.json`, rendered into `BUILD_CHECKLIST.md`. No second checklist replaces it.

**Final recorded status: 60/60 VERIFIED; `ready=true`.** Signed-in provider proof closes CC-043 and the final reconciliation closes CC-042. The final report is `evidence/FINAL_REPORT.md`. The completion verifier and all six isolated rejection controls pass; original acceptance wording is preserved.

## Contract and provenance

The creator confirmed that CrossCue planning began **October 28, 2026**. The implementation in this workspace began October 30. Searches of the workspace, local project roots and related repository found no existing CrossCue 60-check ledger. The related Second Feature project was inspected and preserved. The ten-phase, 60-check contract was reconstructed from the user's mission; acceptance wording and mandatory gates have not been weakened.

Tested and deployed application commit: **`aca964bf85ee718c9b5676a209e8cda99389c660`**. Deployment version: `2407b568-699c-41fd-a6df-85be336ecace`. The release manifest checks 21 runtime files against this commit and records identical bytes. Public browser and external tool responses report the same revision. A later documentation/evidence commit records the results without changing the deployed application. Older observations retain their own source revisions and are not silently relabeled.

The first hosted Qloo analyses failed with actual 502/network errors. The UI reported the failures without substituting evidence. Regression tests reproduced loss of the native Worker fetch receiver and an unsupported Worker redirect mode. The final adapter wraps native fetch correctly and uses supported manual redirect handling, explicitly rejecting redirects. An independent two-server experiment confirmed that credential-bearing requests never reached the redirect destination. The fixed final release then completed fresh hosted Qloo acquisition and the full browser journey. Original public failures remain in evidence.

## Exercised evidence

- Authenticated Qloo server adapter resolved eight identities and completed eight directional fixed-shortlist queries: sixteen successful calls in `evidence/qloo-live.json`. A failed development parse attempt is retained separately. Credentials are outside source control and are not included in evidence.
- The actual Qloo-supported Björk/Moonlight pair has two feasible, distinct branch optima: Protect moves three sessions by 90 minutes each; Allow moves none. The finite-domain solver and separate validator confirm the repair.
- The current unit suite passes **42/42** tests, including Worker fetch receiver and redirect regressions. Failure-path tests use explicit injected provider fixtures; they are not live API proof. A separately authored oracle agrees on **250** seeded finite scheduling domains.
- Fresh public Chromium verification passed **54 assertions and eleven axe audits** at desktop 1440×1000 and mobile 390×844. It includes fresh Qloo acquisition, desktop Protect/approval/reload/actual downloaded export, mobile Allow/Defer/actual downloaded export, visitor isolation, fully locked zero-question behavior and a real stale-version HTTP 409 followed by UI recovery. Both downloaded exports pass the independent validator. The preview-progress correction is explicitly asserted. Source hashes, viewport sizes and the exact deployed revision are in `evidence/browser-public.json`.
- Independent read-only review reproduced backend checks and targeted desktop/mobile/keyboard/axe interactions. Hosted follow-up verified D1 isolation, concurrent writes, cookies/headers, export protection and the actual 30-request-per-minute limit. Current adapter redirect handling received separate review. No unresolved critical/high source defect was recorded; historical review scopes remain explicit in `evidence/reviewer-final.md` and `evidence/hosted-security-review.json`.
- The actual external read-only tool client invokes all three strict tools on the public release using real Qloo evidence, preserves state and rejects an unauthorized mutation tool. `evidence/tool-client-public.json` records the exact tested application revision. No internal model invocation is claimed.
- Benchmark results are recorded, including unfavorable comparisons: Qloo 1 question/3 moves/270 minutes; metadata 2/3/270; blind LLM 2/2/180. Metadata has 15 zero-score ties; the LLM arm leaves one actionable pair after its budget. The secondary ablation produces two inconsequential questions without consequence filtering versus one useful question with it.

## Hosting and publication boundary

The user explicitly authorized using the existing Cloudflare hosting allowance only, with no upgrade or paid overage. The dedicated D1 schema was applied successfully. The API token lacks billing-read access; the creator signed into the dashboard instead. At11:19UTC, it showed Workers Free as current,233/100000 daily requests, D1 reads657/5000000, writes441/100000 and storage1.44MB/5GB, with hard limits. `evidence/hosting-allowance.json` closes CC-043 through actual provider observation. No upgrade, purchase or billing change occurred. This is a current capacity observation, not an invoice audit or future uptime guarantee.

The public repository is [himanshu748/crosscue](https://github.com/himanshu748/crosscue), with MIT-licensed complete source. Independent anonymous API readback confirmed public visibility and MIT licensing. The release manifest records the tested/deployed application commit separately from later proof/documentation changes.

The live application is [crosscue.tbud.workers.dev](https://crosscue.tbud.workers.dev). Fresh hosted Qloo acquisition completed on October 30 at **10:35:56 UTC**, resolving eight identities and retrieving eight directional rankings. Actual D1 readback records 19 upstream-attempt reservations, including failed attempts, and durable cache expiry. Independent hosted security checks preserve their original source revisions; unchanged state/limiter code and final public runtime proof are linked by the manifest. Functionality and existing free allowance are verified; the application source remains unchanged.

## Submission boundary

The current Devpost required fields were inspected on October 30: start date (28597), public project URL (28598), public repository URL (28599), and optional existing-project improvements (28701). No video is required. The creator supplied October 28 as the actual project start date.

`docs/SUBMISSION.md` records the actual submitted description and accepted answers. The historical draft receipt remains in `evidence/devpost-draft.json`. After60/60 checks passed and the creator confirmed eligibility/rules, the final submission succeeded: project1518014 published, Qloo entry1272444 **Submitted** at2026-10-30T11:23:56.572Z. A separate `get_project` readback confirms the same timestamp. `evidence/devpost-submitted.json` records the receipt. The first submit attempt rejected an optional answer exceeding255characters; the truthful shortened224-character answer was accepted on retry. Four actual release screenshots and a thumbnail remain attached.

The creator requested a product-story rewrite after submission. Devpost description version3 was saved and read back at15:21:59UTC. The public story now uses a concrete scheduling choice, essential architecture and genuine challenges, with an explicit fictional-event/real-Qloo distinction. Test totals and release chronology remain in repository evidence. The entry retains its original Submitted timestamp. `evidence/devpost-story-update.json` records this editorial update; no application source or deployment changed.

Description version4 responds to the creator's Qloo-positioning concern. The public copy makes real Qloo rankings central to cultural candidate selection, explains question effort as the measured comparison, and links the unchanged full results including movement/displacement tradeoffs. Version4 and the original Submitted timestamp were read back. `evidence/devpost-qloo-positioning.json` records this copy-only change.

## Completion boundary

The software, public journey, mobile exports, error recovery, hosted isolation/limits, secret/history/export review, release manifest and draft readback now have proof. An independent reviewer also completed sixteen fresh public spot-checks and two additional axe audits without changing the application; no critical finding remained. The final internal judge score remains15/20, with actual organizer validation still absent.

Authenticated dashboard evidence resolves the previous free-allowance blocker. The final report reconciles the manifest, public browser proof, independent review, clean public clone, benchmark, portal readback and sole ledger. All60 mandatory gates have exercised proof. No runtime or visual redesign was introduced during this completion pass; the tested/deployed application revision remains unchanged.

The ledger guard harness uses temporary synthetic copies only. It must reject a missing mandatory ID, Markdown mismatch, an unsupported VERIFIED assertion, an absent proof file, and premature readiness. Those control fixtures are never product or Qloo evidence.
