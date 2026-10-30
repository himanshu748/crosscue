# CrossCue — submitted Devpost content

**Title:** CrossCue
**Tagline:** Ask fewer audience questions. Make smarter festival schedules.

The description below reflects tested application revision `aca964bf85ee718c9b5676a209e8cda99389c660`. [Try the public application](https://crosscue.tbud.workers.dev) or [inspect the public MIT-licensed source](https://github.com/himanshu748/crosscue). Submitted to Qloo on October 30, 2026 at11:23:56UTC; the provider receipt and independent readback are in `evidence/devpost-submitted.json`. The signed-in Cloudflare dashboard confirms Workers Free and D1 usage within its hard limits; no upgrade or billing change was made.

## Project description

## Inspiration

Putting Björk and Moonlight in the same time slot is easy. Deciding whether separating them is worth moving three sessions is harder.

A mixed music-and-film festival gives an organizer plenty of decisions already. Rooms, timings and artist availability set the boundaries. Cultural connections add another question: which sessions might deserve separate moments in the programme?

I built CrossCue to make that decision easier. It brings together Qloo's cultural intelligence and the practical cost of changing a timetable, then asks the organizer only when their answer would change the result.

## What it does

CrossCue is a scheduling decision tool for festival organizers. It finds music–film relationships through Qloo, compares two possible decisions, and shows what each would mean for the programme.

The demo uses **Fieldnotes Festival, a fictional event** with eight sessions, four music showcases, four film blocks and two rooms. Its bookings, timetable and operational constraints are invented for the demonstration. **The artists, films and Qloo API evidence are real.** These are hypothetical bookings, not an announcement of performances or screenings.

In the demo, the Björk showcase overlaps with Moonlight. Qloo ranks Moonlight first among the four films for Björk, and Björk second among the four artists for Moonlight. That makes the pair worth investigating. The organizer then sees a concrete choice:

- **Protect:** separate the sessions. Three music showcases move by 90 minutes each to keep room-turnover rules valid.
- **Allow:** permit the overlap. The current timetable stays in place.

The organizer can also Defer. Nothing moves until they review the preview and explicitly approve it. The saved programme explains each change and can be exported.

CrossCue asks at most two questions in a run. If protecting a pair is impossible, or both decisions lead to the same best schedule, it skips that question. After the main repair, there is no useful question left to ask.

## How I built it

The interface is a React and TypeScript festival operations desk, with two room lanes, cultural evidence, side-by-side decisions and a schedule preview. A Cloudflare Worker handles Qloo requests and keeps the API key on the server. D1 stores each visitor's programme separately.

Qloo resolves the real artists and films, then ranks each session's opposite-domain shortlist in both directions. Each ranking keeps its query context; it is not a prediction of attendee overlap.

The scheduling engine checks all 256 assignments in the demo's allowed placement domain. It first satisfies the hard constraints, then minimizes moved sessions, then time displacement. A separate validator checks the result before the approved schedule is saved. Three typed, read-only tools let an external agent inspect the programme, compare a pair and explain approved changes. The live workflow uses deterministic orchestration with organizer approval; it has no internal LLM.

## Challenges I ran into

The hardest design problem was deciding when to interrupt the organizer. A strong cultural relationship can still produce a useless question if separating the sessions changes nothing. Testing both schedules before asking became the central mechanism.

Keeping the repair small was another challenge. Moving one showcase can force its neighbours to move because of room-turnover constraints. The preview needed to show that whole cascade before the organizer committed to it.

## Accomplishments I'm proud of

The full journey works in the public demo: load the programme, investigate a Qloo-supported pair, compare the choices, approve a repair and download the result. A locked timetable also produces a useful answer: no feasible question to ask.

In the controlled demo comparison, Qloo selection needed one question; metadata-only and blind LLM selection needed two each. The LLM arm moved fewer sessions and left one further actionable pair after its question budget, so the tradeoff matters. The [reproducible comparison](https://github.com/himanshu748/crosscue#controlled-comparison) includes those results and the limits of this single fictional programme.

## What I learned

Cultural evidence becomes useful to an organizer when it comes with the cost of acting on it. Showing the two outcomes made the question clearer than a recommendation alone.

## What's next for CrossCue

The next step is to test the questions with an organizer using a real programme: which relationships matter to them, and which repairs are worth the disruption? That feedback should guide larger scheduling domains and programme imports. Attendee satisfaction and attendance gains still need real-world validation.

## Required Devpost answers

Current form inspected through Devpost on October 30, 2026. [Official event and requirements](https://qloo.devpost.com/).

| Field ID | Field | Answer |
|---|---|---|
| 28597 | When did you begin your project? | October 28, 2026. Planning began then; this CrossCue implementation began October 30, 2026. |
| 28598 | The public URL to your project | https://crosscue.tbud.workers.dev |
| 28599 | Link to your PUBLIC code repo | https://github.com/himanshu748/crosscue |
| 28701 | Existing project improvements (optional) | New CrossCue implementation. Earlier Second Feature was inspected for Qloo adapter patterns and preserved. Added festival consequence testing, exact repair, isolated approval, contextual evidence and reproducible comparison. |

Suggested built-with tags: Qloo, TypeScript, React, Cloudflare Workers, Cloudflare D1, SQLite.

No video is required. Use real screenshots of the question, Protect preview, approved changes and mobile view; each should correspond to the tested release. The public repository includes the MIT license and setup instructions. Hosting, repository visibility and submission each have separate provider evidence; the creator explicitly confirmed eligibility and rule agreement.

## Release metadata

- Project start: October 28, 2026, confirmed by the creator.
- Tested application commit: `aca964bf85ee718c9b5676a209e8cda99389c660`.
- Deployed application commit: `aca964bf85ee718c9b5676a209e8cda99389c660`; observed from the public API in the browser and external tool-client proofs.
- Public demo: https://crosscue.tbud.workers.dev
- Public MIT repository: https://github.com/himanshu748/crosscue
- Public proof: `evidence/browser-public.json`, `evidence/tool-client-public.json`, `evidence/hosted-security-review.json`.
- Hosting allowance: Workers Free and available D1 capacity verified in the authenticated dashboard on October 30 at 11:19 UTC; see `evidence/hosting-allowance.json`. No paid upgrade or billing change was made.
- Submission status: **Submitted** to Qloo at `2026-10-30T11:23:56.572Z`, confirmed by submit response and separate project readback. Public project: https://devpost.com/software/crosscue (project1518014, submission1272444). All required custom-field answers and the optional existing-project disclosure were accepted. Four actual gallery screenshots and a thumbnail remain attached. See `evidence/devpost-submitted.json`.
