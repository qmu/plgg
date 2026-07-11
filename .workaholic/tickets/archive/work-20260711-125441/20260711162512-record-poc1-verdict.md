---
created_at: 2026-07-11T16:25:12+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash: f0e14ef9
category: Changed
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Record the PoC 1 verdict: mark poc1 "proven" in the portal data

## Overview

**Ticket A** of the three follow-ups carried in the resumption ticket
`20260711131543-resume-poc-fleet-ci-fix-and-next-tickets.md` (developer +
agent agreed this session; do not relitigate). PoC 1 (browser search core —
indexed full-text/BM25 vs vector-DB RAG) has been measured; the verdict is
settled but not yet recorded in the portal's source of truth.

`packages/plgg-poc-portal/src/pocs.ts` is the portal's single source of truth
and the durable record the mission reads its acceptance from. Each concluding
PoC ticket edits exactly its own entry (status + verdict); nothing else in the
portal changes. This ticket edits **only** the `poc1` entry: `status:
"building"` → `status: "proven"`, and `verdict: none()` → `verdict:
some(<agreed text>)`.

The data invariant `pocConsistent` (in `Poc.ts`) pins that a concluded PoC
carries a verdict (`isConcluded(status) ? isSome(verdict) : isNone(verdict)`).
`"proven"` is concluded, so the verdict MUST become `some(...)` in the same
edit — otherwise the portal's own smoke spec fails. This is what makes the
change safe: the type/data invariant catches a half-done edit.

## Agreed verdict text (verbatim — do not paraphrase)

> Proven — indexed full-text search. BM25 quality is comparable to vector RAG
> on the real guide corpus at ~1/5 the payload (fts.json 252 KB vs
> embeddings.json 1.4 MB) and none of the model tax; the vector arm's
> from-scratch cost is dominated by the un-scratchable embedding model (~25 MB
> CDN runtime + WASM init on every cold visit), which fails the plggpress
> vision's affordability bar. Re-evaluate only if PoC 2's agent grounding shows
> a concrete quality gap. Known cost on the FTS path: the from-scratch
> tokenizer is English-only ([a-z0-9]+ runs) — CJK corpora need
> n-gram/segmenter tokenization (Ticket B).

## Key Files

- `packages/plgg-poc-portal/src/pocs.ts` — the `poc1` entry (only edit). Add
  `some` to the existing `import { none } from "plgg"` (→ `import { none, some
  } from "plgg"`), flip `status`, set `verdict`.
- `packages/plgg-poc-portal/src/Poc.ts` — read-only reference for the invariant
  (`pocConsistent`, `isConcluded`, `PocStatus`, `verdictText`). No change.
- `packages/plgg-poc-portal/src/pocs.test.ts` (or the existing smoke spec that
  asserts `pocConsistent` over `POCS`) — confirm it still passes; extend only
  if a poc1-specific assertion is warranted (see Quality Gate).

## Policies

- `workaholic:implementation` / `coding-standards` — house style: `Option`
  via `some`/`none` (never null), no `as`/`any`/`ts-ignore`; Prettier
  printWidth 50.
- `workaholic:design` — the portal renders an honest status; a "proven" claim
  must carry the measured verdict text (no blank/aspirational verdicts).

## Implementation Steps

1. In `pocs.ts`, extend the plgg import to include `some`.
2. In the `poc1` entry: set `status: "proven"` and `verdict: some("<agreed
   text above>")`. Keep the verbatim wording; mind Prettier printWidth 50
   (the string will wrap across many lines — that is expected, do not
   hand-pack).
3. Leave every other PoC entry untouched.
4. Run the portal smoke suite; confirm `pocConsistent` holds for the whole
   `POCS` array and the portal still renders (poc1 now `isLinkable` was already
   true; `verdictText` now returns the verdict instead of "Not yet run").

## Quality Gate

**Acceptance criteria:**
- `pocs.ts` `poc1`: `status: "proven"` and `verdict: some(...)` with the
  agreed text verbatim; no other entry changed; `some` imported from `plgg`.
- `pocConsistent(poc1)` is `true` (the smoke spec over `POCS` stays green).
- `tsc --noEmit && plgg-test src` passes in `packages/plgg-poc-portal` with
  coverage at/above the package's bar (portal is exempt-reported per the
  mission gate, but the smoke specs must pass).
- No `as` / `any` / `ts-ignore` introduced.

**Verification method:**
- `./scripts/test-plgg-poc-portal.sh` green (typecheck + smoke specs).
- Optional visual: the running portal (`plgg-poc.qmu.dev` / local :5183) shows
  poc1 as "Proven" with the verdict text after `npm run build` + container
  refresh — NOT required for archive (data+smoke proof is authoritative), and
  the container refresh must not tear down a preview the developer is reading.

**Gate:** `test-plgg-poc-portal` green before approval; data-only change (no
type or control-flow change).

## Considerations

- **Data-only, single-entry.** The blast radius is one object literal; the
  invariant makes a wrong-shaped edit a test/type failure, not a silent bug.
- **Does not require the container rebuild to archive.** The source-of-truth is
  `pocs.ts`; rendering it live is a separate, optional refresh. Per the
  resumption ticket, do not disturb a live preview to rebuild.
- **Mission linkage:** rolling this ticket ticks the mission's "PoC 1 measured"
  acceptance substance (the verdict text is what was missing).
- **Next:** Ticket B (PoC 1 CJK tokenizer, measured + JA explainer) and Ticket
  C (PoC 2 reader-side agent) follow, per the resumption ticket's Decisions.
