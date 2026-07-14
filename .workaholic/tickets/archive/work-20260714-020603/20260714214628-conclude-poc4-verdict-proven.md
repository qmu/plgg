---
created_at: 2026-07-14T21:46:28+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX]
effort: 0.5h
commit_hash: be398d2e
category: Changed
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Conclude PoC 4: flip the `poc4` record to `proven` with the live-judged verdict

## Overview

PoC 4 ("Agent file edits with live hot reload") was **live-judged by the
developer on 2026-07-14** against the FIXED build at `plgg-poc4.qmu.dev`, and
its confidence signal was met. Its `pocs.ts` record is still `status: "building"`
with `verdict: none()` — this ticket records the measured outcome and concludes
it, exactly as PoC 2 / PoC 3 / PoC 4b were concluded.

This is a **record-only change**: the `poc4` entry in `pocs.ts` (status +
verdict). No PoC 4 package code changes — the mechanics are proven as they
stand.

**PoC 4 owns the MECHANICS question; PoC 4b owns the EXPERIENCE question** (the
standing decision). Concluding PoC 4 does not touch the `poc4b` record, which is
already `proven`.

## The measured outcome (what was actually observed)

Judged live by the developer at `https://plgg-poc4.qmu.dev/` on the recreated
container serving HEAD (which includes fix `9171cf60`):

- **An agent-initiated edit landed on disk and the page hot-reloaded.** The
  developer asked the assistant to change the open document and saw the guide
  index update from "Web development as one typed pipeline" to a "Web + AI
  development" phrasing in the rendered page.
- **The same Realtime session kept talking uninterrupted across the reload**
  (developer-confirmed).
- **The language lock-in fix holds.** The assistant conversed with the developer
  **in Japanese** while the open document was **English**, and the edit it wrote
  **stayed in English** — i.e. default-to-document-language for edits WITH the
  explicit/implicit conversational switch honored, which is exactly the behavior
  fix `9171cf60` aimed at. The old bug was a flat refusal to switch; that is
  gone. The developer judged this acceptable ("which is fine").
- **The edit round-tripped cleanly.** The developer observed the rendered page
  update correctly with no corruption reported; separately, `GET /api/doc?path=`
  was probe-verified this session to return raw markdown opening with a clean
  `# Web development as one typed pipeline` and zero `index.md>index.md`
  reconstruction artifacts, and to reject traversal (`../../etc/passwd`) with
  400. The mint (`POST /api/session`) returned 200 and the `/docs/` proxy 200.

That is `poc4`'s `confidenceSignal` — "An agent-initiated edit lands on disk, the
edited page hot-reloads, and the same realtime session continues the conversation
uninterrupted" — met word for word. → **`proven`**.

## The one open gap (NOT a miss against PoC 4's bar)

The developer noted PoC 4 surfaces an edit only as a **reloaded page**, not as
the visible **diff** PoC 4b makes watchable: *"I hope we can have an experience
where we can actually see the HTML, but when it is edited, it should show the
diff like v4b shows."*

This is an **experience** wish, and PoC 4's question is explicitly the mechanics
one — the "micro-animation vs before/after diff" question is PoC 4b's, already
concluded. So it does **not** hold back PoC 4's verdict; it is carried to its own
ticket (`20260714214628-poc4-real-html-preview-with-4b-diff.md` — the synthesis
of PoC 4's real-HTML hot-reload and PoC 4b's watchable in-place diff). The verdict
text should mention the gap as carried, the way a concluding verdict records what
it leaves open.

## Policies

- `workaholic:implementation` / `objective-documentation` — the verdict records
  the MEASURED live-judging outcome (what the developer observed), not
  aspiration. Do not upgrade the wording beyond what is listed above.
- `workaholic:design` / (portal invariant) — a concluding status MUST carry a
  verdict; keep `pocConsistent` green.

## Key Files

- `packages/plgg-poc-portal/src/pocs.ts` — the `poc4` record (~line 65): flip
  `status: "building"` → `"proven"` and `verdict: none()` → `some(...)` with the
  measured verdict text. Model the prose on the neighbouring `poc4b` verdict
  (measured, specific, names what was observed and what it leaves open).
- `packages/plgg-poc-portal/src/Poc.ts` — `isConcluded` / `pocConsistent`: a
  concluded status must carry a verdict (the invariant this change must satisfy).
- `packages/plgg-poc-portal/src/Poc.spec.ts`, `view.spec.ts` — must stay green.

## Implementation Steps

1. Edit the `poc4` record in `pocs.ts`: `status: "proven"`, `verdict: some(...)`
   carrying the measured outcome above (edit landed + hot-reloaded + session
   survived; both live-judging fixes hold — language default/switch and the clean
   raw-bytes round-trip; the diff-experience gap carried to its own ticket).
2. Run the portal specs (`Poc.spec.ts`, `view.spec.ts`) — green, `pocConsistent`
   satisfied, coverage >90%.
3. `scripts/tsc-plgg.sh` clean; Prettier (printWidth 50).
4. Fresh `scripts/check-all.sh` EXIT 0.

## Quality Gate

- The `poc4` record reads `proven` with a verdict that states only what was
  measured; `pocConsistent` and the portal specs green; fresh `check-all` EXIT 0.
- No `as` / `any` / `ts-ignore`.
- The `poc4b` record is untouched.

## Considerations

- **Do not re-verify the offline mechanics** — they are green and the standing
  guidance is not to redo them.
- **Do not overclaim.** The developer did not inspect the raw markdown bytes by
  hand after the edit; "no corruption reported, and the raw-read seam was
  probe-verified clean" is the honest ceiling. Say that, not "byte-verified".
- The live `poc4-edit` container (host 5187) was force-recreated this session and
  is serving HEAD; other containers (guide 5181, poc4b 5190) were left running.
