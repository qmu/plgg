---
created_at: 2026-07-13T18:37:00+09:00
author: a@qmu.jp
type: bugfix
layer: [UX, Domain]
effort: 1h
commit_hash: f8d3e832
category: Changed
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Resume PoC 4: two bugs found in live judging (language lock-in + edit corrupts the file)

## Overview

**Carry origin:** live judging of PoC 4 on 2026-07-13 (branch
`work-20260712-174248`, worktree `.worktrees/poc4-edit`, served at
`plgg-poc4.qmu.dev`). Two bugs surfaced; both trace to changes/design in
THIS PoC, both diagnosed but NOT yet fixed. Resume here.

### Bug 1 — the assistant refuses to switch language on request

Commit `3d334eaf` set `instructionsOf` to: *"Speak in the language the
open document is written in — this corpus is English — even when the
writer addresses you in another language."* That "even when …another
language" clause is too rigid: when the writer explicitly says
「日本語で喋って」 the assistant still answers in English. The intent was a
DEFAULT (lean to the document's language), not a hard lock that overrides
an explicit request.

**Fix direction:** soften the instruction — default to the document's
language, but honor an explicit, in-conversation request to switch
languages. Keep it one clear sentence; re-pin in `agent.spec.ts`.

### Bug 2 — editing corrupts the file (heading-path text written to disk)

Root cause is a design carry-over from PoC 3. The "open document" text fed
to the model is built by `docTextOf` (agent.ts) as a LOSSY reconstruction
from search chunks:

```
`## ${chunk.headingPath}\n${chunk.text}`
```

In PoC 3 that text was read-only grounding, so lossiness was harmless. In
PoC 4 the model EDITS the open document and writes it back — so it
faithfully rewrites the file using the heading-PATH strings as literal
markdown headings. Measured on disk after a session:

- pristine `packages/guide/index.md`: `# Web development as one typed pipeline` … `## Option, not null`
- corrupted `content/index.md`: `## index.md > index.md > Web development index as one typed pipeline` … `## index.md > index.md > … > Option, not null`

The `index.md > index.md > …` text the developer quoted in the iframe is
exactly this corruption. The assistant's "couldn't read it well" is it
reacting to the unnatural reconstruction / already-corrupted file.

**Fix direction:** feed the EDITING model the RAW markdown from disk, not
the chunk reconstruction. The shell server already has the content root;
add a read seam (e.g. `GET /api/doc?path=<rel>` guarded by the same
`resolveEditPath`-style check) that returns the raw file, and have the app
put THAT into `instructionsOf` for the open document (keep `docTextOf`
only for any non-editable grounding, or retire it). Edits must round-trip:
open → edit → the written file is clean markdown, byte-faithful except the
intended change.

## Policies

- `workaholic:design` / `self-explanatory-ui` — Bug 1: the assistant must
  respond to an explicit user instruction (language) predictably; a silent
  refusal is a design failure.
- `workaholic:implementation` / `domain-layer-separation` +
  `coding-standards` — Bug 2: the raw-file read is an fs/entrypoint seam
  (server), decoded `unknown`-inward; the doc-context assembly stays pure;
  no `as`/`any`.
- `workaholic:design` / `defense-in-depth` — the new read seam reuses the
  SAME path guard as `/api/edit` (relative, no traversal, `.md`), closed
  by default; a read must not become a content-root escape either.

## Key Files

- `packages/plgg-poc4-edit/src/agent.ts` — `instructionsOf` (Bug 1 line),
  `docTextOf` (Bug 2 lossy reconstruction), `openDocText` consumer
- `packages/plgg-poc4-edit/src/app.ts` — `openDocText` builds the model's
  open-document context; must switch to the raw-file source (new effect)
- `packages/plgg-poc4-edit/src/entrypoints/serve.ts` — add the guarded raw
  read seam (`GET /api/doc?path=`); reuse `resolveEditPath` + realpath
  containment already there for `/api/edit`
- `packages/plgg-poc4-edit/src/agent.spec.ts` — re-pin the language line;
  add a round-trip spec proving an edit writes clean markdown (not
  headingPath text)
- `packages/plgg-poc4-edit/content/` — currently CORRUPTED from judging;
  `npm run reset-content` restores it (do this first when resuming)

## Implementation Steps

1. `npm run reset-content` to restore the pristine corpus copy before
   anything else.
2. Bug 1: rewrite the `instructionsOf` language sentence to a default +
   explicit-override rule; update the `agent.spec.ts` pin.
3. Bug 2: add `GET /api/doc?path=<rel>` to `serve.ts` (guarded, raw file
   bytes); in `app.ts` fetch the raw markdown for the open document and
   feed it to `instructionsOf`; stop using `docTextOf` for the editable
   open document.
4. Add a reducer/round-trip spec: given a raw open doc, an `edit_file`
   whole-file replacement writes exactly that content (no heading-path
   mangling); the served index refreshes.
5. Rebuild the bundle; the running container serves it no-store on the
   next refresh. Re-judge live: 「日本語で喋って」→ Japanese; ask to fix a
   line → the file stays clean markdown and only the intended line changes.

## Quality Gate

**Acceptance criteria:**

- Bug 1: with the document in English, an explicit 「日本語で話して」 (or any
  language request) makes the assistant switch; absent a request it
  defaults to the document's language. Instruction pinned in a spec.
- Bug 2: after an agent `edit_file` on `index.md`, the written
  `content/index.md` is clean markdown (`# …`, `## Option, not null`),
  NOT `## index.md > index.md > …`. A headless/offline spec asserts an
  edit round-trips faithfully.
- The new `GET /api/doc` rejects traversal/absolute/non-`.md` exactly as
  `/api/edit` does (reuse the guard; assert in a spec).

**Verification method:**

- Offline: `scripts/test-plgg-poc4-edit.sh` green including the new
  language pin, the edit round-trip spec, and the read-seam guard spec.
- Live (developer, `plgg-poc4.qmu.dev`): the two judging scenarios above
  pass — language switch honored, edited page stays clean and reloads, the
  session survives.

**Gate (before approval):**

- Offline suite green; `content/` reset clean; working tree free of the
  container's lockfile churn. Live re-judging is the developer's call at
  the approval gate.

## Considerations

- Keep the iframe-isolation and edit-seam architecture as-is — these are
  content-context and instruction fixes, not an architecture change.
- Bug 2 is the load-bearing correctness fix: an editing agent must always
  see the real bytes it will overwrite. If any grounding path still needs
  the chunk view, keep it clearly separate from the editable open-document
  text so the two never get confused again.
- The container rewrites `packages/plgg-poc1-search/package-lock.json`
  (libc churn) on start — `git restore` it before committing (standing
  concern from PR #67's story §6).
