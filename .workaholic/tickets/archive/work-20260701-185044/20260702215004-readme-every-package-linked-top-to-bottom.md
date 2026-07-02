---
created_at: 2026-07-02T21:50:04+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort:
commit_hash: f8291a6
category: Added
depends_on:
---

# Every package has a README, linked top-to-bottom, enforced by a gate

## Overview

Every package under `packages/` should carry a `README.md`, and the tree
should be **navigable both directions**: the root `README.md` (top) links down
to every package, and every package README links back up to the root (bottom →
top). Today neither holds: six packages have no README, the root index is
stale (links only 9 of ~18 packages), and only ~8 of the existing READMEs
carry the up-link. This ticket closes all three gaps and adds a `sh`/`grep`
gate so the invariant can't silently regress.

**Reachability is the policy driver** (implementation: *Standard Directory
Structure* + *Accessibility for Humans and AI*): a package a reader — human or
AI agent — cannot reach by navigating from the top-level entry point is an
orphan. The root README is the entry node; each package README is a leaf; the
links are the reachability graph, and it must be complete and verified, not
assumed.

Prose follows the *Objective Technical Documentation* standard: factual,
verifiable descriptions of what each package actually does — no marketing
adjectives (elegant/powerful/simple), no aspirational hedging. Any code sample
must come from real source, tests, or `packages/example` — never invented
(guide `conventions.md` rule). Prefer branded `Str`/`asStr` over `SoftStr` in
examples.

## Relationship to ticket 20260702214254 (guide-site pages)

That sibling ticket adds prose pages to the **plggpress-built docs site**
(`packages/guide/packages/*.md` + `site.config.ts` sidebar) for readers
browsing `plgg-guide.qmu.dev`. THIS ticket writes repo **`README.md`** files
for readers on GitHub/npm — a distinct, independently-required deliverable
(moderation: **clear**, zero file collision). Four packages appear in both
scopes: **plgg-md, plgg-highlight, plggmatic, plggpress**. To avoid drift, the
decision here is **self-contained READMEs**: each README stands on its own (it
is the GitHub/npm face and must not depend on the guide site being published).
Where a package also has a guide page, the README may link to it for depth
(`plgg-guide.qmu.dev/packages/<name>`) but must not require it.

## Scope

### A. Author six new READMEs

`packages/<name>/README.md` for each (source of truth = each package's
`package.json` + entry source):

1. **guide** — the private `@plgg/guide` docs-site project (not a library):
   Markdown content built into a static site via **plggpress** (`build`) with
   **plgg-bundle** as the dev server. README describes the content project +
   how to build/serve it (`npm run build` / dev), not an importable API.
2. **plgg-highlight** — zero-new-dep TS/TSX/JS/JSX/JSON syntax highlighting for
   [plgg-md](../plgg-md/)'s `Highlighter` seam; drives the bundled `typescript`
   `ts.createScanner` to emit classified [plgg-view](../plgg-view/)
   `Html<never>` spans, escaped `<pre><code>` fallback. Deps: plgg, plgg-md,
   plgg-view; peer `typescript`.
3. **plgg-md** — a Markdown→typed-data parser built from scratch on plgg: a
   layout-marker frontmatter splitter + a block tokenizer for the plggpress
   subset producing an immutable `Box`-union AST (`Result`, never throws).
   Deps: plgg, plgg-view.
4. **plgg-test** — the in-house minimal test runner (`plgg-test` bin) every
   package's test/coverage scripts call: assertions, matchers, mocks,
   coverage, discovery, CLI. Deps: plgg, typescript; `bin`.
5. **plggmatic** — a pre-organized, composable full-stack web-app framework on
   the plgg family: config loading, router builder, static-build + dev-server
   orchestration, a pre-organized CLI. The seam plggpress consumes. Deps: plgg,
   plgg-http, plgg-server, plgg-cli (ESM-only).
6. **plggpress** — a VitePress-like static-site generator built on
   [plggmatic](../plggmatic/): typed `SiteConfig` contract, base-path `Href`
   resolver, config-loading CLI (`plggpress` bin), a `CheckLinks` pass. Powers
   the guide. Deps: plgg, plggmatic, plgg-view, plgg-md, plgg-highlight,
   plgg-server, plgg-http (ESM-only).

Follow the de-facto house README skeleton (from `plgg-http/README.md` etc.):
**H1 = exact package name** → one-line tagline (house phrase "built from
scratch on [plgg](../plgg/)" where apt) → a status/back-link blockquote
`> **UNSTABLE** — experimental study work. Part of the [plgg monorepo](../../README.md).`
→ short "What it is" rationale → minimal runnable usage snippet → optional
API/vocabulary table → cross-links to sibling packages via relative paths.

### B. Rebuild the root README's downward index

In `README.md`, bring **`## Project Structure`** and **`## Sub-packages`**
up to date so they link to **every** package — currently missing:
plgg-bundle, plgg-cli, plgg-db-migration, plgg-sql, plgg-highlight, plgg-md,
plgg-test, plggmatic, plggpress, guide. Each entry: a
`[`packages/<name>/`](packages/<name>/)` link + a one-line factual blurb;
Sub-packages entries end with `See [packages/<name>/README.md](...)`.

### C. Standardize the upward back-link (full bidirectional)

Every real package README must carry the
`Part of the [plgg monorepo](../../README.md)` up-link. Retrofit it into the
~11 existing READMEs that lack it (in addition to the 6 new ones). This is the
"bottom → top" half of the requested hierarchy.

### D. Add the enforcement gate

New `scripts/gate-readme.sh` (pure `sh`/`grep`, **zero new deps** —
vendor-neutrality), mirroring the existing `scripts/gate-*.sh` pattern, doing
three objective checks:
- **presence** — every dir under `packages/` with a `package.json` has a
  `README.md`; exit non-zero listing any missing.
- **root-link** — every such package is linked from root `README.md`; fail on
  any package not referenced.
- **dead-link** — every relative markdown link in the root and package READMEs
  resolves to a path on disk (catches `../../README.md`, `../../LICENSE`,
  cross-package links).

Wire `gate-readme.sh` into `scripts/check-all.sh` alongside the other gates so
CI runs the same command developers do (command-scripts policy: one canonical
runner).

### E. Cleanup

`packages/plgg-press/` is a **dead stale directory** (only `node_modules/`, no
`package.json`/source — leftover from the rename to `plggpress`). Delete it so
the presence gate has no false target. It is NOT a package and gets no README.

## Key files

- `README.md` — root index; edit `## Project Structure` + `## Sub-packages`.
- `packages/plgg-http/README.md` — cleanest small README template (51L).
- `packages/plgg-server/README.md` — large-API template (222L) for
  plggmatic/plggpress.
- `packages/{guide,plgg-highlight,plgg-md,plgg-test,plggmatic,plggpress}/package.json`
  — source of truth for each new README.
- `scripts/gate-vite.sh`, `scripts/gate-happy-dom.sh`, `scripts/check-all.sh`
  — the gate pattern to mirror and the runner to wire into.
- `packages/plgg-press/` — delete (stale).

## Considerations

- **No orphans**: the acceptance is coverage + reachability, not just "files
  exist" — an unlinked README still fails the goal. Gate check B enforces this.
- **Accuracy over completeness**: an inaccurate README is worse than a missing
  one; describe real exports/behavior, verify against source.
- **Drift with the guide ticket**: for the 4 shared packages keep the README
  self-contained; if both are authored, keep the factual claims consistent.
- **`guide` is not a library**: its README describes a build/content project,
  not an importable API — don't force the library skeleton onto it.
- **ESM-only packages** (plggmatic, plggpress): note that posture in their
  READMEs (no CJS entry) so consumers aren't surprised.
- **Markdown vs Prettier**: `printWidth: 50` governs TS, not prose; match the
  existing READMEs' narrow hand-wrapped code samples for visual consistency.

## Quality Gate

All must pass before `/drive` approval:

1. **`scripts/gate-readme.sh` is green** — (a) every package with a
   `package.json` has a `README.md`; (b) every such package is linked from the
   root `README.md`; (c) every relative markdown link in root + package READMEs
   resolves on disk. The gate is wired into `scripts/check-all.sh`.
2. **`scripts/check-all.sh` is green** — the full repo gate/test suite passes
   with `gate-readme.sh` included (no regressions from the root/README edits;
   any code sample shown compiles under the house rules).
3. **Bidirectional reachability holds** — starting from root `README.md` every
   package is reachable via a link, and every package README links back up to
   `../../README.md`. (Enforced mechanically by 1a/1b; the back-link retrofit
   is spot-checked.)
4. **No escape hatches / clean prose** — zero `as`/`any`/`ts-ignore` in
   `gate-readme.sh` or any code sample; prose is factual (no marketing
   adjectives); `plgg-press` stale dir removed.

**Acceptance = every package has a README, the root links to all of them, all
back-link to root, no dead links, and `check-all.sh` (with the new gate) is
green.**
