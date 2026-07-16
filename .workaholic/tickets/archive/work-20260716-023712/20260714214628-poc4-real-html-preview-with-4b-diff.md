---
created_at: 2026-07-14T21:46:28+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash:
category: Removed
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Show the agent's edit as a watchable diff ON the real rendered HTML (PoC 4 × PoC 4b synthesis)

## DISMISSED (2026-07-16) — by the developer, unjudged

Closed without a verdict, on the developer's call ("dismiss 4c, moving on"). The
`poc4c` record was **removed from the portal entirely** rather than concluded, so the
fleet is back to seven PoCs and the 5184–5190 block invariant is restored in
`Poc.spec.ts` (it had been widened to 5198 solely for 4c).

**What this does NOT say.** The question was never answered — it was abandoned, not
disproven. 4c reached "built and mechanically proven": `/docs/` served 26KB of genuine
plggpress render, and a headless browser drove a span replacement that changed the live
page in place, no reload, zero page errors. What never happened is the only thing that
could have settled it: *the developer's live judgment over voice, which IS the verdict*.
Two gates stood in the way to the end — the cloudflared route for
`plgg-poc4c.qmu.dev` → :5198 was never applied, and the Realtime/voice path was never
driven end to end.

So the open question stands, unanswered and now unowned:

> Can the granular, animated in-place edit survive contact with the REAL rendered site,
> rather than a purpose-built preview surface?

If it is ever asked again, the assets are intact and the research is done: the mapper is
text-run-local by design, its known gaps are typed refusals surfaced on the page (a span
crossing an inline element boundary maps to nothing; markup-only edits animate nothing),
and an unmappable edit RELEASES the reload so it degrades to PoC 4's proven behaviour.
That is the expensive part, and it survives this dismissal.

**Left behind, deliberately:** `packages/plgg-poc4c-livesite` still exists and still
builds — the developer's choice removed the portal RECORD, not the package. It is now
orphaned: nothing links it, `build.sh` and `check-all` still carry it, and it still
serves on :5198. Worth a follow-up decision to delete it or keep it as a reference
artifact; it is cruft either way until someone chooses.

## Policies

- `workaholic:design` / `policies/interaction-design-standard.md` — the entire ticket is
  an interaction claim ("I can watch the AI edit the real site"), and the confidence
  signal is a felt-experience judgment, not a mechanical assertion.
- `workaholic:design` / `policies/modeless-design.md` — the animated in-place patch must
  not put the page into an "editing mode"; the session stays live and unbroken while the
  span changes underneath it.
- `workaholic:design` / `policies/self-explanatory-ui.md` — an unmappable edit must SAY
  why (the typed refusals already surfaced on the page), never fail silently or leave a
  stale page.
- `workaholic:design` / `policies/sacrificial-architecture.md` — this is a confidence
  PoC, deliberately disposable; the durable assets are 4b's pure diff core and the
  plgg-view animation seam it reuses, not this shell.
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/
  `ts-ignore`; Prettier printWidth:50.
- `workaholic:operation` / `policies/containerization.md` — the PoC fleet runs as
  rootless podman containers on allocated ports; 5198 and its cloudflared ingress follow
  that fleet's conventions.

## Overview

**Developer idea, captured live on 2026-07-14 while judging PoC 4** (verbatim):

> "I saw the page was updated from web development to web plus AI development,
> but it's not like the diff I saw in the other PR for v4b. I hope we can have an
> experience where we can actually see the HTML, but when it is edited, it should
> show the diff like v4b shows."

The two PoCs each proved one half and neither has both:

- **PoC 4 (`proven`, mechanics)** serves the **real rendered site** — the actual
  plggpress dev server with real hot reload, real documents, real HTML — but an
  edit appears as a **page reload**: the text is simply different afterwards.
  Nothing is watchable; you see the *result*, never the *change*.
- **PoC 4b (`proven`, experience)** makes the change **watchable** — a granular
  `{find,replace}` op patched in place on a live preview, the edited span erasing
  and the new text writing in with a highlight, no reload, session unbroken —
  and live judging concluded the **micro-animation mode wins** over the
  before/after diff ("Animation mode wins — co-editing feels real"). But it does
  this on a **simplified preview surface**, not the real rendered site.

This ticket is the **synthesis**: the real HTML of PoC 4, with the watchable
in-place change of PoC 4b. That combination — "it's the actual site, and I can
watch the AI edit it" — is the experience the developer is asking for, and
neither shipped PoC delivers it.

## Open question this PoC/feature answers

**Can the granular, animated in-place edit survive contact with the REAL rendered
site — a full plggpress-rendered document with its own markup, styling and hot
reload — rather than a purpose-built preview surface?**

Confidence signal: asking the assistant to change the open document animates the
edited span in place **on the real rendered page**, with no full-page reload, the
Realtime session unbroken, and the file on disk correct afterwards.

## Design notes / prior art to reuse

- **PoC 4b's pure core is the asset**: the applier / span-locator / diff-builder
  are proven offline at 100% coverage and are driven by one pure diff; the two
  visualization modes are a thin seam over it. Reuse that core — do not re-derive
  a diff.
- **The animation seam is plgg-view's** `transition` / `slideIn` / `fadeOut` +
  `key` (keyed reconciliation re-trigger). It is isolated by design, which is why
  4b could compare two modes over one diff.
- **The hard part is span location in rendered HTML.** 4b patched a surface it
  controlled; here the target is markdown → plggpress-rendered HTML, so mapping a
  markdown `{find,replace}` onto the corresponding rendered DOM span is the real
  research question (the edited markdown span may render across elements, or be
  transformed by the renderer). Expect this to be where the PoC actually lives.
- **The reload path is the competing mechanism.** PoC 4's hot reload will happily
  reload the page out from under a patch; the two must be reconciled (patch first
  and suppress/absorb the reload, or let the reload settle and animate after).
  PoC 4b retired the iframe for exactly this class of reason.
- `REVEAL_MS` in `packages/plgg-poc4b-coedit/src/effects.ts` is the timing knob;
  it was tuned during 4b's live judging.

## Key Files

- `packages/plgg-poc4b-coedit/src/` — the granular edit core + the animation
  effects to reuse (`effects.ts`, the applier/span-locator/diff-builder).
- `packages/plgg-poc4-edit/src/app.ts`, `view.ts`, `entrypoints/serve.ts` — the
  real-HTML shell: the `/docs/*` proxy onto the internal plggpress dev server,
  `GET /api/doc` (raw bytes) and `POST /api/edit` (the guarded write seam).
- `packages/plgg-poc4-edit/src/agent.ts` — the tool/instruction surface; PoC 4
  writes whole files (`edit_file`) while 4b writes granular `{find,replace}` ops.
  The granular op is the enabling change and is likely required here too.
- `packages/plgg-poc-portal/src/pocs.ts` — if this becomes a **new PoC** record
  rather than an extension of PoC 4, it needs an entry (question, confidence
  signal, hostname, port) and a reserved `*.qmu.dev` hostname + cloudflared route.

## STATUS (2026-07-16, night `/drive`): still BLOCKED on the two developer-owned gates — re-verified, not assumed

A night `/drive` reached this ticket again and did not write code. **Not a size or
complexity skip** — the build is done; what remains is not implementable by an agent.
Both gates re-checked tonight rather than taken from the note below:

- **Serving:** `http://localhost:5198/` answers **200**. The build stands.
- **Cloudflared route: still absent.** `~/.cloudflared/config.yml` contains no entry for
  `5198` or `poc4c`. Applying it is developer-owned, as every previous PoC route was. So
  4c remains judgeable only at `localhost`.
- **The verdict itself is the developer's live voice judgment**, and *that judgment IS
  the verdict* (this ticket's own framing, and PoC 4's precedent). No agent can supply it.

Nothing else in the queue depends on this. It is waiting on a person, not on work.

## STATUS (2026-07-15): BUILT and SERVING — awaiting the developer's live judgment

The port blocker below was resolved by the developer ("for C, we just allocate a
different port number to the container. That is totally okay"), and the PoC is
built: `packages/plgg-poc4c-livesite` on host **5198**, record `poc4c` at
`status: "building"` (`7db57cf6`).

**What is proven mechanically** — `/docs/` serves 26KB of genuine plggpress render
with the patch client injected and zero surviving `location.reload`; driven in a
real headless browser, a postMessage'd span replacement changed the live page's h1
IN PLACE with no reload (`Web development as one typed pipeline` →
`Web development as one TYPED PIPELINE!!`, client replied `{applied, spans:1}`,
zero page errors). 86 specs green, fresh `check-all` EXIT 0.

**What is NOT** — the confidence signal's actual question: whether it FEELS like
co-editing on the real site. That is the developer's live judgment, over voice,
and it IS the verdict. Two things stand between here and that session:

1. **The cloudflared route for `plgg-poc4c.qmu.dev` → :5198 is developer-applied**
   (the package README carries the exact `~/.cloudflared/config.yml` lines). Until
   then it is judgeable only at `http://localhost:5198/`.
2. **The Realtime/voice path is unexercised end-to-end** — the key mints (200) but
   no session has been driven, so the first live judging round may surface a bug
   there, exactly as PoC 4's first round did.

Known gaps, all typed refusals surfaced on the page with reasons (not silent):
a span crossing an inline element boundary (`the **cat** sat` edited as `cat sat`)
is three text runs and maps to none — the mapper is text-run-local by design;
markup-only edits (link target, emphasis added, heading level) have identical
rendered words and animate nothing. An unmappable edit RELEASES the reload, so it
degrades to PoC 4's proven behaviour rather than a stale page.

## RESOLVED — the port blocker (kept for the record)

A night `/drive` reached this ticket and stopped before writing code, because a
new PoC record cannot be allocated without a developer decision. Measured, not
assumed:

- **All seven reserved ports are taken.** `pocs.ts` documents `5183–5190` as the
  fleet's block (5183 = the portal), and `Poc.spec.ts` pins BOTH
  `p.port >= 5184 && p.port <= 5190` and `POCS.length === 7`. The seven PoCs hold
  5184–5190 with no gap.
- **The neighbouring range is genuinely occupied.** `pocs.ts` claims 5191–5196
  belong to other qmu.dev workloads; probed, **5191, 5192, 5193, 5194, 5195 and
  5196 all answer 200** — live services, not a stale comment.
- So an eighth PoC needs either a widened/relocated block (changing the invariant
  and the documented rationale), a retired PoC's slot, or a decision to extend past
  5197 (`~/.cloudflared/config.yml` already maps up to 5197).

**Two further developer-owned gates** stand between this ticket and "done":

- **The cloudflared ingress route** for a new `plgg-poc4c.qmu.dev` (or equivalent)
  is applied by the developer — every previous PoC route was developer-approved.
- **The record's shape** — new `poc4c` vs re-opening the now-`proven` PoC 4 — is
  explicitly left to the developer below, and it decides the whole ticket.

None of these is a size problem; they are allocations and calls only the developer
makes. Everything else is ready: PoC 4 is `proven` (`be398d2e`), PoC 4b is `proven`
with the animation mode chosen, and 4b's diff core + animation seam are the assets
to reuse. **Answer the three questions above and this becomes a straight build.**

## Quality Gate

The mechanical half is **already met** (see STATUS); the deciding half is not, and cannot
be met by an agent.

**Mechanical (met, `7db57cf6`):**
- `/docs/` serves genuine plggpress-rendered HTML with the patch client injected and zero
  surviving `location.reload`.
- Driven in a real headless browser, a span replacement changes the live page IN PLACE —
  no reload, client replies `{applied, spans:1}`, zero page errors.
- An unmappable edit RELEASES the reload, degrading to PoC 4's proven behaviour rather
  than a stale page; refusals are typed and surfaced with reasons.
- Specs green; fresh `check-all` EXIT 0.
- **Does not regress PoC 4's proven verdict** — edit lands, hot reload works, session
  survives.

**The verdict (NOT met — developer-owned):**
- **The confidence signal is the developer's live judgment over voice**: asking the
  assistant to change the open document animates the edited span in place on the real
  rendered page, session unbroken, file correct on disk — and it *feels* like co-editing
  the real site. **That judgment IS the verdict**; there is no automated substitute.
- Prerequisite: the cloudflared route for `plgg-poc4c.qmu.dev` → :5198 is
  **developer-applied** (exact config lines are in the package README).
- The Realtime/voice path is unexercised end-to-end; the first live round may surface a
  bug there, as PoC 4's first round did.

## Considerations

- **Decide the shape first: new PoC record vs. evolving PoC 4.** PoC 4 is now
  `proven` and its verdict is recorded; re-opening it would muddy a concluded
  record. A **new** record (e.g. `poc4c`) with its own question is the cleaner
  fit with the portal's one-question-per-PoC invariant, but that is the
  developer's call at ticket-drive time.
- **Do not regress PoC 4's proven mechanics** — the edit-lands + hot-reload +
  session-survives signal is now a recorded verdict; whatever reconciles the
  patch with the reload must keep it true.
- **The animation already won its comparison** (4b's verdict) — this is not a
  re-run of animation-vs-diff. Carry the animation mode forward; the open
  question is whether it survives on the real rendered surface.
- Scope guard: this is a confidence PoC, not a product feature — the bar is the
  developer's live judgment that "it's the real site and I can watch it change",
  not a general-purpose DOM patcher.
