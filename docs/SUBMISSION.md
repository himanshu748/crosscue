# CrossCue — Devpost preparation

**Title:** CrossCue
**Tagline:** Ask fewer audience questions. Make smarter festival schedules.

The description below reflects tested application revision `aca964bf85ee718c9b5676a209e8cda99389c660`. [Try the public application](https://crosscue.tbud.workers.dev) or [inspect the public MIT-licensed source](https://github.com/himanshu748/crosscue). This file is preparation, not a submission receipt. The hosting-allowance verification gate remains open; do not equate a functional release with every acceptance gate being satisfied.

## Project description

### A valid timetable can still ask the wrong question

A festival organizer can satisfy every room and timing constraint and still wonder whether two sessions deserve separate moments. Music and film sit in different catalogues; an operational scheduler does not tell the organizer which cross-domain relationships are worth investigating. Asking about every possible pair creates another planning task.

CrossCue turns cultural evidence into a bounded decision: **is protecting this particular pair worth the changes it would require?**

### Culture informs. You decide.

CrossCue loads Fieldnotes Festival, an explicitly fictional programme with four music showcases, four film blocks and two rooms. It resolves eight real artists and films through Qloo, then requests directional affinity rankings within the festival's fixed shortlists. Every ranking retains its signal, candidates, retrieval time and provenance. A rank is contextual evidence, never an audience-overlap probability.

The agent workflow tests two decisions against exactly the same current timetable:

- **Protect:** the selected music and film sessions may not overlap.
- **Allow:** overlap remains permitted; it is never forced.

Both schedules must be feasible, and their optimal placements must differ, before the organizer sees a question. At most two questions are presented in a run. The organizer can Protect, Allow or Defer, inspect the preview, and explicitly approve before anything moves. CrossCue explains the actual changes and exports the independently validated schedule, decisions and evidence.

### The demo's consequential moment

In the captured live example, Moonlight ranks first among four films for Björk; Björk ranks second among four music acts for Moonlight. CrossCue does not turn those ranks into a mandate. It asks whether preventing their 60-minute overlap is worth moving three music showcases by 90 minutes each. Allow preserves the current timetable. Protect makes a precise, valid repair. The room-turnover constraints explain the cascade.

Higher-priority Qloo pairs are deliberately skipped when their Protect and Allow schedules are identical. After the main repair, no useful further question remains. A fully locked timetable demonstrates a second successful outcome: zero questions, with an explanation rather than an invented recommendation.

### What makes it Qloo-powered

Qloo determines the culturally supported candidate set and its ordering; the scheduler determines whether a decision has consequences. Replacing the Qloo evidence changes which question is asked first. CrossCue's distinctive mechanism is the complete chain: **real cultural evidence → consequence testing → a limited human question → verified approval → minimum-change repair**.

The implementation is an agent-callable tool and bounded deterministic workflow, with no internal LLM. A typed read-only tool interface exposes programme/evidence reading, pair consequence testing and approved-change explanations. An external model can interpret those results; it cannot assign sessions or apply changes. This deliberately keeps cultural interpretation separate from scheduling authority.

### Built for inspectable decisions

The React/TypeScript operations interface uses two time-positioned room lanes, a contextual evidence inspector, branch comparison, before/after preview and decision history. A server-only Qloo adapter validates identities, entity categories, response schemas and fixed-shortlist membership. Missing or failed provider results remain explicit; there is no synthetic live fallback.

The deterministic solver exhaustively evaluates the declared finite placement domain: 256 assignments in the default programme. It satisfies hard constraints, minimizes moved sessions, then total start-time displacement, then applies canonical tie-breaking. “Minimum” means minimum within that declared domain. A separate validator checks the final placement. Versioned, isolated visitor state and atomic writes prevent stale approvals or one visitor's decisions from changing another visitor's programme.

### What the comparison actually shows

The reproducible experiment gives Qloo, a metadata selector and a blind LLM selector the same festival, constraints, engine, two-question budget and simulated always-Protect policy.

| Selection method | Questions | Valid repairs | Sessions moved | Final displacement |
|---|---:|---:|---:|---:|
| Qloo-assisted | 1 | 1 | 3 | 270 min |
| Metadata-only | 2 | 2 | 3 | 270 min |
| Blind LLM-only | 2 | 2 | 2 | 180 min |

Qloo uses fewer questions in this example. The LLM arm moves fewer sessions and leaves one further operationally actionable pair after its question budget. The metadata baseline is deliberately disclosed as limited: 15 of 16 pairs tie at zero token similarity. This is one synthetic festival and one blind model generation, not a claim that Qloo universally wins.

A separate mechanism ablation asks the top two Qloo-ranked pairs without consequence filtering. Both questions are inconsequential: each branch returns the same schedule. CrossCue's filter instead spends one question on a real choice. That result demonstrates why cultural ranking alone is insufficient for this workflow.

### Verification and the next useful step

The public release was exercised in fresh desktop and mobile browser contexts. The journey passed 54 assertions, including nonmutating preview, explicit Protect and Allow approval, Defer, reload, stale-version recovery, the two-question cap, zero-question stopping and actual downloaded exports checked by the independent validator. Eleven exercised states had no automated axe WCAG A/AA violations. A real external client invoked all three read-only tools using captured live Qloo evidence; no model was used or implied in that protocol test.

Recorded verification also includes 42 passing unit/API tests, a separate exhaustive oracle over 250 generated finite domains, six ledger-verifier control tests and actual hosted state-isolation, atomic-write and rate-limit checks. Fresh hosted Qloo evidence was captured on October 30, 2026 at 10:35:56 UTC. The repository's single 60-check ledger distinguishes implementation, exercised acceptance and public-release verification; it is the source of truth for remaining limitations. In particular, account billing visibility did not establish the remaining free/included hosting allowance, so that gate is not claimed verified.

CrossCue does not claim measured gains in attendance, revenue or satisfaction. The next useful validation is an organizer evaluating the relevance and cost of these questions with an actual programme, followed by a consent-based attendee study. A larger solver domain and operational integrations should follow that evidence. The current product demonstrates the decision mechanism clearly, without hiding uncertainty behind a chatbot.

## Required Devpost answers

Current form inspected through Devpost on October 30, 2026. [Official event and requirements](https://qloo.devpost.com/).

| Field ID | Field | Answer |
|---|---|---|
| 28597 | When did you begin your project? | October 28, 2026. Planning began then; this CrossCue implementation began October 30, 2026. |
| 28598 | The public URL to your project | https://crosscue.tbud.workers.dev |
| 28599 | Link to your PUBLIC code repo | https://github.com/himanshu748/crosscue |
| 28701 | Existing project improvements (optional) | CrossCue is a separate new implementation for this hackathon. An earlier related project, Second Feature, was inspected for Qloo adapter patterns and preserved. CrossCue adds cross-domain festival consequence testing, exact finite-domain repair, isolated organizer approval, contextual evidence inspection and reproducible comparison. |

Suggested built-with tags: Qloo, TypeScript, React, Cloudflare Workers, Cloudflare D1, SQLite.

No video is required. Use real screenshots of the question, Protect preview, approved changes and mobile view; each should correspond to the tested release. The public repository includes the MIT license and setup instructions. Do not use this preparation document as evidence that hosting, repository visibility, eligibility agreement or final submission has occurred.

## Release metadata

- Project start: October 28, 2026, confirmed by the creator.
- Tested application commit: `aca964bf85ee718c9b5676a209e8cda99389c660`.
- Deployed application commit: `aca964bf85ee718c9b5676a209e8cda99389c660`; observed from the public API in the browser and external tool-client proofs.
- Public demo: https://crosscue.tbud.workers.dev
- Public MIT repository: https://github.com/himanshu748/crosscue
- Public proof: `evidence/browser-public.json`, `evidence/tool-client-public.json`, `evidence/hosted-security-review.json`.
- Remaining mandatory gate: CC-043, independent verification of the existing free/included hosting allowance. No paid upgrade or overage authorization is inferred.
- Submission status: Devpost project and Qloo submission draft created and read back; not submitted. Draft: https://devpost.com/software/crosscue (project1518014, submission1272444). Four real gallery screenshots and a thumbnail uploaded; all media URLs returned HTTP200. Required custom-field answers remain prepared below for the final submit operation; no eligibility/rule attestation was made.
