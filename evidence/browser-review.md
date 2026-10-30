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
