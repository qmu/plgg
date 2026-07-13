---
created_at: 2026-07-13T19:36:14+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# PoC 4b: live co-editing preview — the change happens ON the preview (micro-animation + before/after diff, compared)

## Overview

PoC 4 proved the MECHANICS (an agent edit lands on disk, the page
refreshes, the Realtime session survives) — but that was never the real
question; the developer expected it. **The confidence signal this PoC
answers is the co-editing EXPERIENCE**: does it feel like standing at the
same whiteboard, the AI present in the room, erasing and adding text in
place — not "the AI rewrites the file offscreen and the poster is
swapped."

The current build cannot deliver that feel, structurally, for two
reasons, and PoC 4b changes both:

1. **Whole-file replacement → GRANULAR edits.** PoC 4's
   `edit_file(path, whole_content)` regenerates the entire document, so no
   change is localized or watchable. PoC 4b's edit tool emits granular
   operations (replace/insert/delete on a specific span), so a change is a
   small, addressable delta.
2. **Reloading iframe → a LIVE, PATCHABLE preview.** PoC 4's doc pane is a
   plggpress-rendered iframe that `location.reload()`s — the shared
   surface vanishes and redraws (the single most anti-whiteboard thing
   possible). PoC 4b's preview is a surface the SHELL renders and mutates
   in place; the changed region updates without any full reload.

On that preview, the AI's edit is VISUALIZED, and the PoC prototypes **two
modes, toggleable and judged side by side** (developer decision
2026-07-13, matching the mission's compare-variants ethos):

- **Micro-animation** — the old span visibly erases/fades out and the new
  text writes in with a highlight. The "watch the hand move, it's
  happening now" co-presence feel.
- **Before-and-after diff** — the changed span shown inline as old
  (struck) vs new (highlighted). The "here is what I changed, confirm it"
  review/trust feel.

These are DIFFERENT experiences; the deliverable is the developer's
judgment of which one (or both) makes co-editing feel real.

**New fleet entry** (developer decision 2026-07-13): PoC 4 stays `proven —
mechanics`; PoC 4b is its own portal entry (`poc4b`, port **5190**,
`plgg-poc4b.qmu.dev`) for the EXPERIENCE question, keeping the durable
question→proof→integration map honest.

## Confidence signal (what counts as proven)

Speaking or typing to the assistant to change the open document makes the
change appear ON the preview surface, in place, legibly — the edited span
animates (erase→write) and/or shows an old-vs-new diff — with NO
full-page reload, while the same Realtime session keeps talking. The
developer judges, on a real corpus page, whether either mode delivers the
"same whiteboard" feel, and which. Recorded as the poc4b verdict.

## Policies

- `workaholic:design` / `self-explanatory-ui` — the change visualization
  IS the feedback: the user must see WHAT changed and that it succeeded
  without reading the file. Design all states: mid-animation, applied,
  diff-shown, edit refused, mode toggle.
- `workaholic:implementation` / `domain-layer-separation` +
  `coding-standards` — the edit-operation model, the span locator, and the
  diff computation are PURE total functions tested offline; DOM animation
  and `fs`/WebRTC live only in `vendors/`+`entrypoints/`. No
  `as`/`any`/`ts-ignore`; unknown validated inward at the tool + `/api`
  boundaries.
- `workaholic:implementation` / `test` — >90% on the pure core: the
  operation applier (text in → text out), the span locator (ambiguous /
  absent `find` rejected as typed errors), the diff builder.
- `workaholic:design` / `defense-in-depth` — the write seam keeps PoC 4's
  layered guard (`resolveEditPath` + realpath containment, `.md` only); a
  granular op must not become a content-root escape or an unbounded write.
- `workaholic:design` / `vendor-neutrality` — OpenAI Realtime stays behind
  the plgg-kit mint + `vendors/realtime.ts` seam; zero new runtime deps
  (reuse plgg-md/plgg-view for client rendering if they fit).

## Key Files

- `packages/plgg-poc4-edit/` — the SCAFFOLD PoC 4b forks: the Realtime
  agent loop, the mint seam, the `/api/edit` write path, the `/api/doc`
  raw-read seam, and the TEA shell. 4b is a NEW package
  `packages/plgg-poc4b-coedit` on this shape (poc3/poc4 scaffold gotchas
  per memory).
- `packages/plgg-poc4-edit/src/agent.ts` — `EDIT_TOOL` (whole-file) is
  replaced by a granular-operation tool; `eventOf` decodes it
- `packages/plgg-poc4-edit/src/entrypoints/serve.ts` — `/api/edit` becomes
  an op-applier (apply the granular op to the file atomically); keep the
  guard + index refresh; `/api/doc` stays
- `packages/plgg-poc4-edit/src/view.ts` — the iframe `docPane` is REPLACED
  by the live rendered preview the shell controls
- `packages/plgg-md/` — candidate for client-side markdown→view rendering
  (reuse rather than a new dep)
- `packages/plgg-view/` — the preview render tree + any animation seam
- `packages/plgg-poc-portal/src/pocs.ts` — add the `poc4b` entry (port
  5190, `plgg-poc4b.qmu.dev`); keep `pocConsistent` green
  (`building` → verdict later)
- `packages/plgg-poc-portal/README.md`, root `README.md`,
  `workloads/poc4b-coedit/`, `scripts/test-plgg-poc4b-coedit.sh`,
  `scripts/check-all.sh`, `scripts/npm-install.sh` — fleet wiring

## Related History

- `20260712152250-poc4-agent-file-edits-hot-reload.md` (archive) — the
  proven mechanics 4b builds on; the iframe-isolation decision is what 4b
  now supersedes for the doc pane.
- `20260713183700-resume-poc4-two-live-judging-bugs.md` (archive) — the
  `/api/doc` raw-read seam and the retirement of `docTextOf`; 4b keeps
  feeding the model raw text.
- `20260711035317-plggpress-poc-portal-and-plan.md` (archive) — the fleet
  plan / portal contract 4b extends with a new entry.

## Implementation Steps

1. **Scaffold `packages/plgg-poc4b-coedit`** on the poc4 shape (deps: plgg,
   plgg-kit, plgg-view, plgg-poc1-search, plggpress or plgg-md as needed;
   devDeps: plgg-bundle, plgg-test, typescript; no `type:module` deviation
   — copy poc4's package.json shape). Add the `poc4b` portal entry
   (`building`, port 5190, `plgg-poc4b.qmu.dev`).
2. **Granular edit model** (`src/edit.ts` + spec, the pure core): an
   operation type (start with a list of `{ find, replace }` span
   replacements; `find` must match exactly once — ambiguous/absent is a
   typed error), a pure applier `applyEdits(text, ops) →
   Result<newText, EditError>`, and a pure diff builder producing the
   change spans the preview animates/compares. Exhaustive spec.
3. **New edit tool + event decode** (`agent.ts`): replace `edit_file` with
   `edit_doc(path, edits)`; instruct the model to make the SMALLEST edit
   that satisfies the request (one span where possible) and to narrate
   what it is changing.
4. **Server op-applier** (`serve.ts`): `/api/edit` validates the ops
   inward, `resolveEditPath` + realpath guard, applies via the pure
   `applyEdits`, atomic temp+rename, index refresh. Returns the applied
   diff spans so the client renders identically to disk.
5. **Live preview surface** (`view.ts`/new module): RETIRE the reloading
   iframe for the doc pane; render the open document's markdown in a pane
   the shell controls (reuse plgg-md→plgg-view if it fits; prose-focused —
   full plggpress theming is out of scope, the point is the change). On an
   applied edit, patch ONLY the changed region.
6. **Two visualization modes + toggle**: (a) micro-animation (old span
   fade/strike out, new text write-in + highlight); (b) before-and-after
   diff (inline old-struck / new-highlighted). A visible toggle; both must
   read clearly. Animation lives behind a `vendors/`-style seam; the
   decision of WHAT changed is the pure diff from step 2.
7. **Fleet wiring**: `workloads/poc4b-coedit/` (guide-style two-process or
   poc4-style, host 5190→container), `scripts/test-plgg-poc4b-coedit.sh`,
   check-all + npm-install registration, READMEs (+ the developer-applied
   cloudflared line `plgg-poc4b.qmu.dev → :5190`), portal README port map.
8. **Verify offline** (tsc, plgg-test >90% on the pure core: applier, span
   locator, diff builder, reducer), serve via `scripts/serve-poc.sh
   poc4b-coedit`, smoke the seams headless (`/api/doc`, `/api/edit` op
   round-trip returns diff spans, index refresh), then hand to the
   developer for live judging of the two modes. Verdict is a follow-up
   concluding ticket (as PoC 2/3/4).

## Quality Gate

**Acceptance criteria:**

- The edit tool is granular: an `edit_doc` op with a `find` that is absent
  or matches more than once is a typed error (spec-asserted); a valid op
  applied to the file changes only that span (`applyEdits` spec:
  text-in → text-out, no whole-file rewrite).
- The preview updates IN PLACE on an edit — no full-page reload occurs
  (assertable: the doc pane's container is not re-created / no navigation).
- Both visualization modes render the SAME change legibly and are
  toggleable; each is driven by the pure diff, not a re-render heuristic.
- `/api/edit` applies the op atomically inside the content root only
  (PoC 4's guard preserved) and returns the diff the client renders, so
  preview and disk agree.
- The Realtime session stays live across an edit (no re-mint), voice and
  text both drive edits.

**Verification method:**

- Offline: `./scripts/test-plgg-poc4b-coedit.sh` (tsc + plgg-test >90% on
  the pure core) and a fresh `./scripts/check-all.sh`.
- Headless smoke from the container: `/api/doc` raw read, an `/api/edit`
  op round-trip that changes one span and returns its diff, index refresh,
  guard rejections (traversal/absent-find/ambiguous-find).
- Live (developer at `plgg-poc4b.qmu.dev`): ask the assistant to change a
  line; the changed span animates and/or diffs ON the preview with no
  reload, both modes compared, session uninterrupted — judged for the
  "same whiteboard" feel.

**Gate (before approval):**

- Offline suite + check-all green; headless smoke green through the
  container; working tree clean (restore the poc1 lockfile churn). The
  live-feel verdict is the developer's call at the approval gate (or a
  concluding verdict ticket, as PoC 4 did).

## Considerations

- **Drive on a fresh branch off main AFTER PoC 4 (PR #67) merges** — 4b
  forks poc4's package as its scaffold, so poc4 must be on main first.
  This ticket travels to main with PR #67; drive it from a new
  main-based branch.
- **Losing plggpress theming is an accepted PoC trade-off** — the iframe
  gave the real themed page; the live preview is prose-focused. The
  question is the change animation, not the chrome. If the developer wants
  themed rendering later, that is a follow-up, not this PoC.
- **Smallest-edit prompting is load-bearing** — if the model still emits a
  near-whole-file replacement, there is nothing small to animate; the
  instruction and the tool shape must push it toward minimal spans, and a
  giant single-span replace should degrade gracefully (still diffable, but
  note it in the verdict).
- **Ambiguous `find`** is the main correctness risk of a find/replace op
  model; reject it as a typed error and let the model retry with more
  context (mirrors search_docs's "try again" loop).
- **Animation is a seam, not logic** — keep WHAT changed (pure diff) apart
  from HOW it animates (DOM/CSS), so the pure core stays testable and the
  two modes share one source of truth.
- Cross-package source reuse (poc1 FTS, plgg-md render) uses the
  relative-import seam exactly as poc4's `src/poc1.ts` (memory: new
  package scaffold gotchas).
