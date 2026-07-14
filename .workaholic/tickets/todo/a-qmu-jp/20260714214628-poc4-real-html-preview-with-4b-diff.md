---
created_at: 2026-07-14T21:46:28+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash:
category: Added
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Show the agent's edit as a watchable diff ON the real rendered HTML (PoC 4 × PoC 4b synthesis)

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

## BLOCKED (2026-07-15): the PoC fleet's port block is EXHAUSTED

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
