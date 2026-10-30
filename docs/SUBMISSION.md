# CrossCue — submitted Devpost content

**Title:** CrossCue
**Tagline:** Ask fewer audience questions. Make smarter festival schedules.

The description below reflects tested application revision `aca964bf85ee718c9b5676a209e8cda99389c660`. [Try the public application](https://crosscue.tbud.workers.dev) or [inspect the public MIT-licensed source](https://github.com/himanshu748/crosscue). Submitted to Qloo on October 30, 2026 at11:23:56UTC; the provider receipt and independent readback are in `evidence/devpost-submitted.json`. The signed-in Cloudflare dashboard confirms Workers Free and D1 usage within its hard limits; no upgrade or billing change was made.

## Project description

## Inspiration

Putting Björk and Moonlight in the same time slot is easy. Deciding whether separating them is worth moving three sessions is harder.

A mixed music-and-film festival gives an organizer plenty of decisions already. Rooms, timings and artist availability set the boundaries. Cultural connections add another question: which sessions might deserve separate moments in the programme?

I built CrossCue around Qloo's ability to connect music and film through cultural taste. Those relationships give the organizer a reason to investigate an overlap. CrossCue makes the cost of acting on that insight clear before asking for a decision.

## What it does

Qloo is the cultural intelligence at the heart of CrossCue. Its directional rankings determine which music–film pairs qualify for investigation and the order CrossCue considers them. The organizer sees a question when that Qloo-supported relationship leads to two feasible, different scheduling outcomes.

The demo uses **Fieldnotes Festival, a fictional event** with eight sessions, four music showcases, four film blocks and two rooms. Its bookings, timetable and operational constraints are invented for the demonstration. **The artists, films and Qloo API evidence are real.** These are hypothetical bookings, not an announcement of performances or screenings.

In the demo, the Björk showcase overlaps with Moonlight. Qloo ranks Moonlight first among the four films for Björk, and Björk second among the four artists for Moonlight. That makes the pair worth investigating. The organizer then sees a concrete choice:

- **Protect:** separate the sessions. Three music showcases move by 90 minutes each to keep room-turnover rules valid.
- **Allow:** permit the overlap. The current timetable stays in place.

The organizer can also Defer. Nothing moves until they review the preview and explicitly approve it. The saved programme explains each change and can be exported.

CrossCue asks at most two questions in a run. If protecting a pair is impossible, or both decisions lead to the same best schedule, it skips that question. After the main repair, there is no useful question left to ask.

## How I built it

Qloo drives entity resolution and cultural candidate selection. The server resolves the artists and films, requests artist-to-film and film-to-artist rankings within the programme's shortlists, and uses those returned ranks to choose which pairs to test. The Björk/Moonlight question comes from that live evidence. Each rank retains its query context; it is not an attendee-overlap probability.

The React and TypeScript interface turns that evidence into a festival operations desk: two room lanes, side-by-side decisions and a schedule preview. A Cloudflare Worker keeps Qloo requests and credentials on the server. D1 stores each visitor's programme separately.

The scheduling engine checks all 256 assignments in the demo's allowed placement domain. It first satisfies the hard constraints, then minimizes moved sessions, then time displacement. A separate validator checks the result before the approved schedule is saved. Three typed, read-only tools let an external agent inspect the programme, compare a pair and explain approved changes. The live workflow uses deterministic orchestration with organizer approval; it has no internal LLM.

## Challenges I ran into

The hardest design problem was turning a Qloo-supported relationship into a useful organizer decision. The workflow needed to show two valid choices and make their scheduling consequences visible. Testing both schedules before asking became the central mechanism.

Keeping the repair small was another challenge. Moving one showcase can force its neighbours to move because of room-turnover constraints. The preview needed to show that whole cascade before the organizer committed to it.

## Accomplishments I'm proud of

The full journey works in the public demo: load the programme, investigate a Qloo-supported pair, compare the choices, approve a repair and download the result. A locked timetable also produces a useful answer: no feasible question to ask.

In the controlled demo, the Qloo-assisted flow finished with one consequential question; metadata-only and blind LLM selection each used both available questions. All three ran with the same timetable, constraints, solver and simulated organizer policy. This measures question effort in one programme. The [full comparison](https://github.com/himanshu748/crosscue#controlled-comparison) reports schedule disruption and the baseline limitations alongside it; cultural relevance and attendee benefit need organizer validation.

## What I learned

Qloo gave this workflow its cultural starting point: a relationship across music and film that the timetable alone cannot supply. Connecting that evidence to two concrete schedules made it possible to ask the organizer a focused question.

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
