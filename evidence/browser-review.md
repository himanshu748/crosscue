# UX verification and fixes

A fresh worker context reviewed and exercised the product using real Chromium. This worker also fixed findings; a separate post-fix reviewer should provide independent final acceptance.

Flow: complete programme → real Qloo-backed analysis → contextual evidence → Protect preview → before/after → explicit confirmation → reload → actual JSON download → independent validation → natural stop. A separate mobile browser context exercised Allow → next question → Defer → two-question stop. A fully locked timetable produced zero questions.

## Reproduced and corrected

- Small introduction, scenario, question and preview labels failed WCAG AA text contrast (3.41–4.46:1). Adjusted only their foreground colors; retained original failures in `browser-local-initial-failure.json`, `browser-local-question-failure.json` and `browser-local-preview-failure.json`.
- Replacing the decision controls with a preview did not explicitly transfer focus. The review heading now receives focus, as does the saved decision heading. The browser test checks the preview focus.
- Axe sampled dialog entrance opacity before its220ms animation finished, producing transient false positives. The harness now waits for finite Web Animations to finish before auditing. `browser-local-transient-dialog-sampling.json` retains that sampling failure; it is not presented as an unresolved product contrast defect.

## Verified locally

`browser-local.json`:43 assertions passed,10 axe WCAG A/AA state audits with zero violations, no page/console errors and no failed application HTTP responses. Desktop1440×1000; mobile390×844 with reduced motion. Meaningful page/title, no framework overlay, two-room content, keyboard skip link/inspector arrow navigation/Escape, preview focus, no horizontal overflow, separate visitor state, explicit Apply and reload persistence were exercised.

`browser-local-export.json` is the actual downloaded export after a3-session,270-minute repair. Eight placements and accepted protections pass `src/core/validator.ts` and match saved state. This is real Qloo-derived data, not a fixture. Provenance contains8 searches and8 directional Insights queries retrieved2026-10-30T09:56:35.825Z. Shared cache was used by this browser run.

## Reproduce

```sh
# With a running app and installed Playwright Chromium:
CROSSCUE_URL=http://localhost:3008 CROSSCUE_EVIDENCE_LABEL=local \
  node node_modules/tsx/dist/cli.mjs scripts/browser-journey.ts
# Set PLAYWRIGHT_CHROMIUM_EXECUTABLE only to use an existing compatible browser.
```

Browser plugin/browser skill was not available; regular Playwright used an existing installed Chromium. No browser download or mock response was needed. The script supports the public URL for the final fresh-session hosted test. Source hashes are in the JSON; current local server reported `working-tree`, so this is not evidence for a particular committed or deployed revision.

Remaining scope: public-host browser verification, real-device Safari/Firefox and assistive-technology testing were not performed here. Axe passing does not establish complete accessibility conformance. Product typography intentionally uses compact metadata; a future larger-data pilot should test readability with actual festival staff.

## First public-host attempt

The initial public deployment at `https://crosscue.tbud.workers.dev` rendered the application and passed the initial and dialog checks, but its first real `/api/analyze` returnedHTTP502. The visible error explicitly said: “Qloo could not be reached. No substitute evidence was used.” Evidence is retained in `browser-public-provider-failure.json` and `screenshots/public-failure-0-0.png`. No live hosted journey pass is claimed for that attempt. A revised deployment must repeat the full browser script.

## Expanded local coverage

`browser-local-expanded.json` passes54 assertions and11 axe states. It adds an actual mobile JSON download and independent validation of all8 unchanged placements plus Allow/Defer records. A third fresh context changes its own server version through a second legitimate request, then the stale visible UI receives a realHTTP409. The error is visible, the rejected request leaves state untouched, and Refresh workspace recovers to the current state and completes a valid zero-question analysis. The intentional409 and corresponding browser console line are recorded separately from unexpected failures. Initial-versus-final placement comparison normalizes by session ID because the exact solver returns canonical order.

## Successful public deployment

After fixing unsupported `redirect: error` behavior in the Workers runtime, the complete public journey passed at `https://crosscue.tbud.workers.dev` on source revision `aca964bf85ee718c9b5676a209e8cda99389c660`. `browser-public.json` records54 assertions and11 axe states passing in Chromium156.0.8078.4, using fresh desktop/mobile browser contexts. The first hosted analysis acquired live Qloo provenance at2026-10-30T10:35:56.280Z, with8 identity searches and8 directional Insights queries. Later contexts reused the timestamped shared cache.

Both `browser-public-export.json` (Protect repair) and `browser-public-mobile-export.json` (Allow/Defer) were actual UI downloads and independently validated. One intentionalHTTP409 verified stale-state rejection and recovery; there were zero unexpected console/page errors or failed HTTP responses. The source revision observed before analysis and after applying matched. Public screenshots are recorded in the JSON. Initial failed deployments remain separate evidence and are superseded by this successful full journey, not erased.

Full-page screenshots are captured after scrolling to the page top. This avoids Chromium capturing a fixed, translated offscreen skip link at a document-relative offset. Direct DOM inspection verified that the skip link was unfocused and outside the viewport; this was a capture artifact, not a product layout defect. The hosted journey passed again with the corrected capture method and the same provider-cache timestamp and deployed revision. No visual design or application source changed during this final capture pass.
