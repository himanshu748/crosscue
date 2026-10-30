# Frozen comparison protocol

Frozen 2026-10-30 before metric execution. The fictional programme was created before seeing live Qloo rankings; it was not rearranged to improve the comparison. See src/core/programme.ts. All selectors share that baseline, hard constraints, exact optimizer, consequence filter, maximum two presented questions and **always Protect** simulated organizer policy. All arms stop when no actionable candidate remains. This policy is an experimental control, not a human preference claim.

A: observed Qloo ranks; require both directional results and top-two in at least one four-target query; sort by worst directional rank then best rank then pair ID. No raw affinity averaging. Captured authenticated evidence in evidence/qloo-live.json.

B: metadata-only deterministic Jaccard similarity of lowercased genre/theme word tokens; punctuation is a separator, tokens deduplicated. Ties by canonical pair ID. Metadata was authored in the same isolated blind model context as C, without Qloo or schedule access; the selector itself uses only these tags. This is limited metadata, not a tuned production baseline. Report zero-similarity candidates honestly. No Qloo-derived data enters B.

C: actual single isolated Codex LLM inference (fork_turns=none), general pretrained cultural knowledge and entity names/year only. No tools, files, web, Qloo, scheduling information or scores supplied. All 16 pairs returned. The parent copied the pair order unchanged; reasons shortened editorially for readability. Exact model identifier and inference latency were not exposed and are not invented. This baseline is an observed generation replay, not a new provider call every execution.

Blind prompt: rank all 16 pairs for whether an organizer should investigate avoiding overlap; hypotheses only; no measured overlap claims. Names supplied: Radiohead, Björk, Kendrick Lamar, Daft Punk; Spirited Away (2001), Moonlight (2016), Whiplash (2014), Blade Runner (1982). Also return 3–5 descriptive genre/theme metadata tags per entity. No timetable supplied.

Metrics: questions presented, distinct feasible branch outcomes, valid applied repairs, distinct sessions moved from initial baseline, total final displacement from initial baseline, cumulative repair movements, replay runtime, preparation calls. Local replay runtime excludes provider acquisition and therefore cannot show end-to-end provider latency superiority. Qloo preparation used 16 successful calls; failed development calls separately recorded. C used one actual model inference; B/C do not call Qloo. Every arm uses the same solver and independent validator; never pretend scheduling validity alone validates cultural selection.

Scope: one synthetic festival, one organizer policy, one LLM trial. No attendee labels, attendance, revenue or satisfaction outcomes. Ties and tradeoffs are results, not failures. Additional policies are sensitivity checks, never replace the primary frozen result.

## Secondary consequence-filter ablation

Added after the primary protocol was frozen; it does not replace or tune the A/B/C comparison. Use the same Qloo ordering, programme, solver, independent validator, two-question cap and always-Protect policy. The ablated workflow asks the first two ranked pairs without excluding inconsequential pairs. Each Protect outcome is still solved and independently validated before applying; infeasible protection would be recorded without applying it. Compare this with the existing filtered Qloo arm.

Observed result: Kendrick Lamar / Moonlight and Radiohead / Blade Runner each have the same optimal schedule under Protect and Allow. The unfiltered workflow spends both questions on these pairs, applies two valid zero-change decisions and moves no sessions. The filtered workflow skips them, asks one actionable Björk / Moonlight question and, under the simulated Protect policy, moves three sessions by 270 minutes in total. This isolates the value of the consequence gate; it is not evidence that Qloo outperforms another cultural source or that more movement improves an event.

## Interpretation constraints

The metadata selector has **15 of 16 zero-similarity ties**. Its second question is substantially determined by canonical tie-breaking, so this weak baseline cannot establish a general advantage over metadata methods. The blind LLM arm uses fewer final moves (two versus three) and less displacement (180 versus 270 minutes); report this favorable result for the LLM arm. After its two-question budget, one operationally actionable pair remains across all 16 pairs. Qloo and metadata have none. Residual actionability describes feasible schedule consequences, not the cultural truth or necessity of a protection. No single scalar combines these tradeoffs into a claimed winner.

`npm run benchmark` regenerates all reported metrics from the committed captured Qloo evidence and unchanged blind ordering. It performs no upstream API or model calls. The evidence JSON includes the blind-input and programme hashes, per-question branch objectives, final placements, all metadata similarity scores, residual pairs and the ablation. Replay runtime varies by machine and excludes the original provider acquisition.
