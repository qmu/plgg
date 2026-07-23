---
created_at: 2026-07-14T02:20:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Config]
effort: 4h
commit_hash: 449c794e
category: Added
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# PoC 6: non-tree file classification — tag/link multi-dimensional search UX an agent can drive

## Overview

Sixth and final build PoC of mission `plggpress-technical-confidence-poc-portal`
(the seventh of eight acceptance boxes; the `poc6` record already exists in the
portal data as `planned`). It answers the mission's **non-tree classification**
technical question, verbatim from `packages/plgg-poc-portal/src/pocs.ts`:

> **Question:** Does tag/link-based grouping over the tree-shaped file system
> yield a multi-dimensional search UX that both humans and browser agents can
> operate?
>
> **Confidence signal:** Prototype variants of tag/link navigation over one
> corpus are comparable side-by-side, and an agent can drive each variant's
> search deterministically.

The filesystem is a **tree**, but knowledge is **multi-dimensional** — a page
belongs to several tags and links to several others. PoC 6 prototypes **several
navigation variants** over one real corpus (the same guide subset the fleet
uses), grouped by front-matter **tags** and **links** rather than by directory,
and — critically — makes each variant **deterministically drivable by a browser
agent's tool calls**, so the same corpus is reachable by a human clicking and by
the agent searching. This is the "non-tree classification" open question the
mission's `## Scope` lists: needing several prototypes for the multi-dimensional
search UX and its agent manipulatability.

**Variants to compare side-by-side** (at least two; sacrificial prototypes, not
a production picker): candidates are **tag-facet filtering** (AND/OR across
multiple tag dimensions), a **link/backlink graph** view (follow front-matter
links and their inverses), and a **multi-dimensional filter** combining tag +
link + text. The confidence signal is that these are **comparable side-by-side**
on one page so the developer can judge which UX reads best, and that an agent can
drive **each** variant's search from typed commands.

**Overnight scope (decided at ticket time).** Built by an unattended `/drive`,
no human at a microphone. So:

- Each variant's search MUST be exercisable by **typed** agent commands —
  "show pages tagged `async` AND `composition`", "follow backlinks of
  `result.md`", "filter tag `option` + text 'caster'" — deterministic tool calls
  a morning judge and a headless smoke can replay. Live voice over the Realtime
  API is a **bonus** where `OPENAI_API_KEY` exists (the poc4b "voice or typed"
  shape).
- `/drive` builds the package to **offline-green** (strict `tsc --noEmit`, zero
  `as`/`any`/`ts-ignore`, plus a `plgg-test` smoke suite over the pure
  classification/search core) **and serves it live** at `plgg-poc6.qmu.dev`,
  then **stops**. It leaves the `poc6` record `status: "building"`,
  `verdict: none()`. The morning live-judgment is a **separate concluding-verdict
  ticket** — do NOT self-judge or flip the verdict from headless evidence.

## Policies

The implementing session MUST read each linked policy hard copy before writing
code and keep every change defensible against its Goal (目標), Responsibility
(責務), and Practices (実践).

- `workaholic:planning` / `policies/proactive-poc.md` — minimum build-out for ONE
  question, built to discard; the variants are throwaway prototypes, not a
  production navigation system.
- `workaholic:planning` / `policies/ux-research-prototype.md` — the served page
  IS the comparison surface; "comparable side-by-side" is the whole point —
  design it so a human can judge the variants against each other.
- `workaholic:design` / `policies/modeless-design.md` — the active variant and
  the current facet/filter selection live in the **URL** (deep-linkable,
  no hidden mode); this is also what makes an agent's search deterministic.
- `workaholic:design` / `policies/self-explanatory-ui.md` — design the four
  states (loading / empty-result / error / results); an empty facet result is an
  honest "no pages match", not a blank.
- `workaholic:implementation` / `policies/coding-standards.md` — house
  type-driven style (Option/Result, exhaustive `match`, no escape hatches,
  printWidth 50); the variant set is a closed union rendered exhaustively.
- `workaholic:implementation` / `policies/directory-structure.md` — new
  one-directory package under `packages/`; workload compose under `workloads/`;
  node built-ins confined to `src/entrypoints/`.
- `workaholic:implementation` / `policies/command-scripts.md` — no bespoke serve
  script; `scripts/serve-poc.sh poc6-classify` is the only runner.
- `workaholic:operation` / `policies/ci-cd.md` — wire into the consolidated local
  gates so `check-all` stays the source of truth; private PoC exempt from >90%
  coverage but must typecheck + smoke.

## Key Files

- `packages/plgg-poc1-search/` — **the search core to reuse.** PoC 1 proved the
  browser-side indexed full-text search (BM25 over the guide corpus). PoC 6's
  text dimension and the corpus/front-matter parsing build on it (poc4b already
  depends on `plgg-poc1-search`; poc6 does the same).
- `packages/plgg-poc4b-coedit/` — the agent-tool-call spine + single-process
  serve shell + typed/voice surface to copy.
  - `src/agent.ts` — the tool-call loop (poc6 exposes `search_tags`,
    `follow_links`, `filter` tools, one per variant's query).
  - `src/view.ts`, `src/effects.ts` — the plgg-view render + transition seam for
    the results/facets panes.
  - `src/entrypoints/serve.ts` — the single-process server shape.
  - `src/vendors/realtime.ts` — the confined Realtime seam (bonus voice).
  - `package.json`, `workloads/poc4b-coedit/compose.yaml` — the leaf-app package
    + single-process workload recipe to copy.
- `packages/plgg-poc-portal/src/pocs.ts` — the `poc6` record (already `planned`,
  port **5189**, `plgg-poc6.qmu.dev`); the final-step edit flips its `status`
  `planned`→`building` (verdict stays `none()`).
- `scripts/serve-poc.sh` — the canonical detached runner (`serve-poc.sh
  poc6-classify`).
- `scripts/check-all.sh`, `scripts/gate-readme.sh`, `scripts/gate-vendor-boundary.sh`,
  `scripts/gate-guide-deps.sh` — the gates the package wires into / is excluded
  from.
- `~/.cloudflared/config.yml` — the `plgg-poc6.qmu.dev → http://localhost:5189`
  route is **developer-applied**.

## Related History

- [20260711035318-poc1-browser-search-core.md](.workaholic/tickets/archive/work-20260711-035119/20260711035318-poc1-browser-search-core.md) — PoC 1: the browser FTS core (BM25, front-matter parsing, CJK segmenter) the text dimension reuses.
- [20260713193614-poc4b-live-coediting-preview.md](.workaholic/tickets/archive/) — PoC 4b: the agent-tool-call + single-process live-preview spine to copy.
- [20260711035317-plggpress-poc-portal-and-plan.md](.workaholic/tickets/archive/work-20260711-035119/20260711035317-plggpress-poc-portal-and-plan.md) — the PoC plan, port/hostname map, and the `pocs.ts` record contract.
- `.workaholic/missions/active/plggpress-technical-confidence-poc-portal/` — `## Scope` names non-tree classification (group by tag and link in front matter, several prototypes for multi-dimensional search UX and browser-agent manipulatability).

## Implementation Steps

1. Scaffold `packages/plgg-poc6-classify` from the poc4b-coedit shape
   (`private: true`, `type: module`, build = plgg-bundle, test = `tsc --noEmit
   && plgg-test src`, printWidth 50, `rootDir: src`). Depend on
   `plgg-poc1-search` for the FTS/front-matter core. Seed the shared guide-subset
   `content/` corpus via a `seed-content` entry.
2. Build the **pure classification core** (`src/classify.ts`): parse each page's
   front-matter `tags` and `links` into a typed model
   (`Page = { path, tags, links, ... }`), and derive the non-tree indexes — a
   tag→pages multimap and a link/backlink adjacency — as pure data. Option/Result
   throughout; no `as`.
3. Model the **variant set as a closed union** (`src/variants.ts`):
   `Variant = TagFacets | LinkGraph | MultiFilter` (at least two implemented),
   each with a **pure query function** `(index, Query) → ReadonlyArray<Page>` so
   a search is deterministic and testable. Render the variant switcher and each
   variant's results with exhaustive `match`.
4. Wire the **agent tool-call loop** (`src/agent.ts`, from poc4b): one tool per
   variant's query (`search_tags` with AND/OR, `follow_links`/`backlinks`,
   `filter` combining tag+link+text). **Typed** commands are the primary,
   deterministic surface; Realtime voice is the bonus when the key is present.
   Selecting a variant and issuing a query updates the URL (modeless) and
   re-renders results.
5. Build the **side-by-side comparison UX** (`src/view.ts`): the variants
   reachable and comparable on one page (tabs or panes) over the one corpus, so
   the developer can judge which reads best; design loading/empty/error/results
   states. Reuse the plgg-view render + transition seam.
6. Single-process serve entry (`src/entrypoints/serve.ts`, node built-ins only):
   serves the shell, the seeded corpus/index, and mints the Realtime session
   behind `/api/session` (honest 404 without the key). Add
   `workloads/poc6-classify/compose.yaml` (single-process node:22-slim, host
   **5189** → container 5173, `../..` bind-mount, `${OPENAI_API_KEY:-}`), copied
   from `workloads/poc4b-coedit/compose.yaml`.
7. `serve-poc.sh poc6-classify` starts it detached. Wire the package into the
   repo gates (README index, build order, test entry, guide-container exclusion
   consistent with the other PoCs).
8. Prepare the developer-applied cloudflared ingress lines in the README
   (`plgg-poc6.qmu.dev → http://localhost:5189`) — do NOT edit the host tunnel.
9. **Final data edit:** flip the `poc6` record in
   `packages/plgg-poc-portal/src/pocs.ts` from `status: "planned"` to
   `status: "building"` (verdict stays `none()`). Keep `pocConsistent` + the
   portal specs green.
10. Serve live and stop for morning judging: build, seed, start the container,
    confirm `curl -s http://localhost:5189/` returns the shell and a typed query
    against **each** variant returns the expected pages. Leave it serving at
    `plgg-poc6.qmu.dev` for the developer's live judgment.

## Quality Gate

Captured from the developer at ticket time (2026-07-14). PoC packages meet
**typecheck + smoke**, not the >90% coverage gate; the "proven" verdict comes
from **live judgment via the qmu.dev URL** — and because this runs unattended
overnight, the drive stops at *served-and-ready*, not *judged*.

**Acceptance criteria** — the checkable conditions that must hold:

- `packages/plgg-poc6-classify` typechecks strictly; **zero `as` / `any` /
  `ts-ignore`**.
- A `plgg-test` smoke suite covers the pure core: front-matter tag/link parsing,
  the tag→pages and link/backlink indexes, and **each variant's query function**
  (a known query → the expected page set), plus the empty-result state.
- **At least two navigation variants** are implemented and **comparable
  side-by-side** on one page over one corpus.
- The confidence signal is **typed-replayable**: a documented typed command
  drives **each** variant's search deterministically (tag AND/OR, follow
  links/backlinks, combined filter) and re-renders results; the active variant +
  query is URL-held. Voice works as a bonus when the key is present.
- `private: true`, excluded from the >90% coverage threshold, **zero third-party
  runtime deps** beyond the `file:` plgg packages, node built-ins confined to
  `src/entrypoints/` (vendor-boundary green).
- `workloads/poc6-classify/compose.yaml` serves on host **5189**; `serve-poc.sh
  poc6-classify` starts it; the `poc6` record is `building`, verdict `none()`,
  `pocConsistent` + portal specs green.
- Fresh `check-all` passes with the new package wired in.

**Verification method** — the commands/tests/probes that prove them:

- `scripts/tsc-plgg.sh` and the package `plgg-test src` smoke suite green.
- `scripts/check-all.sh` green with the package included (scheduled around any
  live preview).
- After `serve-poc.sh poc6-classify`: `curl -s http://localhost:5189/` returns
  the shell; a headless smoke drives a typed query against each variant and
  asserts the returned page set (the deterministic replay of the morning demo).

**Gate** — what must pass before "proven":

- All the above green **and** the package serving at `plgg-poc6.qmu.dev`, ready
  for the developer to open in the morning and confirm live: the variants are
  comparable side-by-side, and each variant's search is drivable by typed agent
  command. That live judgment is recorded by a **separate concluding-verdict
  ticket** that flips `poc6` — NOT by this ticket or the overnight drive.

## Considerations

- **Do not self-judge overnight** — leave `poc6` `building` / `none()`; the
  live-judgment verdict is a separate morning ticket (poc2/poc3/poc4b pattern).
- **The cloudflared route is developer-applied** — prepare the exact ingress
  lines in the README, never edit the host tunnel (system-safety).
- **Sacrificial variants** (proactive-poc): the point is to *compare* navigation
  UXes and prove agent-drivability, not to ship a production navigation system —
  keep the variants thin and free of production plggpress coupling.
- **Reuse, don't reinvent, the search core**: the text dimension and front-matter
  parsing come from `plgg-poc1-search` (already a fleet dependency); don't
  re-implement FTS.
- **Determinism is the agent contract**: because each variant's query is a pure
  function and the state is URL-held, the same typed command must always return
  the same page set — this is exactly what makes "an agent can drive each
  variant's search deterministically" checkable.
- **Keep the `pocs.ts` record edit a one-liner** (status only); the record shape
  is the mission's durable acceptance data.
- **Corpus reuse + git-ignore**: seed the same guide subset the fleet uses;
  `content/` stays git-ignored and auto-seeded (don't commit it).

## Final Report

Built autonomously as part of the overnight `/drive` batch (2026-07-14),
stopped at **served-and-ready** per the agreed gate: `poc6` stays `building` /
`none()` in `pocs.ts` for the morning live-judgment (a separate
concluding-verdict ticket flips it — NOT this drive).

Delivered `packages/plgg-poc6-classify` on the fleet spine. The classification
core (`src/classify.ts`) turns the tree-shaped guide corpus into non-tree data:
each page's tags are every directory segment of its path (so `packages/plgg/x.md`
is both `packages` and `plgg`) plus any front-matter `tags:`, and its links are
the in-corpus markdown links resolved against its directory (backlinks are the
inverse). Three **comparable navigation variants** (`src/variants.ts`) navigate
it — tag facets (AND/OR), the link/backlink graph of a focus page, and a
multi-dimensional tag+text filter — each a total pure `runQuery`, rendered side
by side over one corpus. As in PoC 5, the confidence signal is driven by a
**deterministic, model-free query-command parser** (`src/command.ts`:
`facets and|or …`, `links <path>`, `filter <text|#tag>`) so every variant's
search is headless-replayable and agent-drivable; clicking a tag facets, clicking
any result page focuses the link graph; the Realtime voice session is a bonus
that calls the same three tools.

Verification against the Quality Gate: `tsc --noEmit` EXIT 0 with **zero
`as`/`any`/`ts-ignore**`; **45 offline specs green** covering the classification
core (tag derivation, front-matter parsing, link resolution incl. `.`/`..`/
root-relative/anchor, dangling/self-link dropping, tag/backlink adjacencies), the
three variant queries, the query-command parser, the event decoder + tool
decoding, the wire casters, and the TEA reducer; **coverage gate passed**
(statements 98.7%, branches 94.8%, functions 97.8%, lines 98.7% — every pure
module 96–100%; `extractLinks` was refactored to `matchAll` to shed a dead
index-guard branch). `gate-readme`, `gate-vendor-boundary`, and the portal specs
(now green with poc5+poc6 = building — the fleet-state view/Poc specs were
updated: building PoCs link, a synthetic planned card exercises the reserve
state) all pass. `dist/main.js` built (227 KB); `npm run seed-content` seeded 38
files; the host serve answered 200 on `/`, and `/index/pages.json` returned the
classified index (e.g. `README.md` → tags `["guide"]`, links
`["contributing/conventions.md"]`; concepts pages tagged `concepts`). The
containerized workload (`scripts/serve-poc.sh poc6-classify`,
`workloads/poc6-classify/compose.yaml`) serves on host **5189**. The full fresh
`check-all.sh` runs once at the end of this night batch. The
`~/.cloudflared/config.yml` ingress lines for `plgg-poc6.qmu.dev → :5189` are
prepared in the package README for the developer to apply;
`https://plgg-poc6.qmu.dev` review is the morning gate.

**Note on the portal advancement:** both `poc5` and `poc6` records were flipped
`planned → building` and the shared fleet-state portal specs updated together in
the PoC 5 commit (the portal is one shared data file); this PoC 6 commit adds the
package and its build/test/doc wiring only.
