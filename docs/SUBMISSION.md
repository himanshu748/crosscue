# CrossCue — Devpost preparation

**Title:** CrossCue
**Tagline:** Ask fewer audience questions. Make smarter festival schedules.

The description below reflects the implementation and recorded results. Release links and final verification metadata must be filled from the tested public release before pasting. This file is preparation, not a submission receipt.

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

Recorded evidence covers authenticated Qloo resolution and both directional ranking queries, exact optimization, an independent scheduling oracle, versioned approval, provider-failure handling and a reproducible comparison. The repository's single 60-check ledger distinguishes implementation, exercised acceptance and public-release verification; it is the source of truth for the final tested revision and any remaining limitations.

CrossCue does not claim measured gains in attendance, revenue or satisfaction. The next useful validation is an organizer evaluating the relevance and cost of these questions with an actual programme, followed by a consent-based attendee study. A larger solver domain and operational integrations should follow that evidence. The current product demonstrates the decision mechanism clearly, without hiding uncertainty behind a chatbot.

## Required Devpost answers

Current form inspected through Devpost on October 30, 2026. [Official event and requirements](https://qloo.devpost.com/).

| Field ID | Field | Answer |
|---|---|---|
| 28597 | When did you begin your project? | October 28, 2026. Planning began then; this CrossCue implementation began October 30, 2026. |
| 28598 | The public URL to your project | PENDING — insert the verified public application URL. |
| 28599 | Link to your PUBLIC code repo | PENDING — insert the verified public repository URL. |
| 28701 | Existing project improvements (optional) | CrossCue is a separate new implementation for this hackathon. An earlier related project, Second Feature, was inspected for Qloo adapter patterns and preserved. CrossCue adds cross-domain festival consequence testing, exact finite-domain repair, isolated organizer approval, contextual evidence inspection and reproducible comparison. |

Suggested built-with tags: Qloo, TypeScript, React, Cloudflare Workers, Cloudflare D1, SQLite.

No video is required. Use real screenshots of the question, Protect preview, approved changes and mobile view; each should correspond to the tested release. The public repository includes the MIT license and setup instructions. Do not use this preparation document as evidence that hosting, repository visibility, eligibility agreement or final submission has occurred.

## Release metadata

- Project start: October 28, 2026, confirmed by the creator.
- Tested commit: pending final release verification.
- Deployed commit: pending public release verification.
- Public demo/repository: pending verification.
- Submission status: prepared locally; no submission performed by this document.
