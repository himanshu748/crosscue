# Skeptical judge review — provisional release assessment

Reviewer D context, October 30, 2026. This assessment inspected the implementation, recorded Qloo evidence, scheduling proof, product screenshot, original benchmark protocol and a newly executed benchmark/ablation. It did not personally exercise the public browser release. It is not an official judge score or a prediction of prize placement.

Current [Devpost criteria](https://qloo.devpost.com/) were retrieved through the official connector on October 30, 2026: four categories, each out of five. The official build requirement permits an application that functions as an agentic tool. CrossCue has no internal LLM; its claim must remain an agent-callable deterministic workflow. Final deployment and browser-review results can strengthen this assessment but cannot establish real-world impact alone.

| Criterion | Score | Concrete justification | Most useful remaining improvement |
|---|---:|---|---|
| Technological Implementation | 4/5 | Real Qloo identities, both directional fixed-shortlist queries, explicit contextual provenance, an exact finite-domain solver, separate validator and versioned approval constitute substantial integration. The source has a typed read-only tool interface. Recorded live evidence and the benchmark support the mechanism. Hosted operation and an actual external tool-client journey were not established in this review. | Exercise the exact deployed revision from a fresh public session, including actual typed-tool calls, approval, reload, export and failure behavior; retain the trace. |
| Design | 4/5 | The product screenshot makes the timetable, candidate overlap, Qloo ranks and Protect/Allow costs legible in one operations screen. It avoids a chat-first interface. A three-session cascade is surfaced before approval. This review has no independent mobile/keyboard/reduced-motion result yet. | Complete real desktop/mobile and keyboard journeys, fix any blocked interaction, and keep the next action visible at the first decision. |
| Potential Impact | 3/5 | The audience is specific: organizers programming mixed music/film events before attendee preferences are known. One controlled festival demonstrates reduced question count and a valid repair. No organizer interview or attendee outcome evidence establishes demand, cultural relevance or benefit. The narrow placement options limit generalization. | Obtain one genuine organizer evaluation if access and time permit. Otherwise retain the honest scope and make the cost/benefit decision and export immediately useful in the demo. Do not substitute invented testimonials or satisfaction metrics. |
| Quality of the Idea | 4/5 | Consequence filtering turns cultural evidence into a consequential organizer decision. The ablation is persuasive: the first two Qloo-ranked pairs yield identical branch schedules, while the filtered workflow asks one useful question. Preference-aware event scheduling has prior art, so originality belongs to this integrated decision workflow rather than scheduling itself. | Show the discarded pairs and their identical outcomes beside the accepted question; connect the ablation directly to the demo so judges can observe the distinction. |

**Provisional total: 15/20.** No category receives a perfect score. The largest deadline-critical issue is public proof, followed by completion of accessibility and tool-client verification. The largest enduring weakness is absent organizer validation, which cannot be solved by more UI features or a stronger claim.

## Adversarial interpretation of the comparison

The main A/B/C results are reproducible by `npm run benchmark` from captured real evidence and the preserved blind ordering. This reviewer executed that command successfully. Qloo: one question, three sessions moved, 270 minutes. Metadata: two questions, three sessions, 270 minutes. Blind LLM: two questions, two sessions, 180 minutes. All reported repairs independently validate.

The metadata selector has 15 zero-score ties among 16 pairs. Do not advertise its result as representative of all metadata methods. The blind LLM outcome has less disruption; one further actionable pair remains after its two-question cap. It would be misleading to collapse these tradeoffs into “Qloo is better” without a declared utility function or external relevance labels. All three arms share consequence filtering and the same optimizer, so their scheduling validity is not evidence that a cultural source is correct.

The added secondary ablation changes only whether the Qloo-ranked pair must pass consequence filtering before consuming a question. The first two pairs are Kendrick Lamar / Moonlight and Radiohead / Blade Runner; both branches are feasible and identical. The ablated workflow asks two inconsequential questions. The filtered workflow asks one consequential Björk / Moonlight question. This is evidence for the consequence gate within this programme, not evidence of audience benefit or universal cultural superiority.

## Agentic fit

The official requirement allows a project that “functions as an agentic tool.” CrossCue's typed tool endpoint can meet that route without adding an internal LLM, provided it is actually demonstrated. Its read-only tools include current cultural evidence and exact branch tests; explicit organizer approval remains the only path to applying a schedule. Present this honestly as an agent-callable scheduling decision tool and bounded workflow. Calling it an autonomous reasoning agent or claiming a live LLM plans the schedule would overstate the implementation.

An actual client invoking the tool registry, reading real Qloo evidence and comparing the selected pair would make the claim much more defensible. A schema listing alone is insufficient proof. No new paid model call is necessary to demonstrate the tool protocol.

## Release review boundary

No critical mathematical or cultural-evidence defect was reproduced by this benchmark-focused review. This is not a security, accessibility or hosted-operations sign-off. Integrate reviewers A/B/C/E and the final public journey before changing readiness. Record a final dated addendum against the deployed commit; leave scores below five where evidence remains absent.
