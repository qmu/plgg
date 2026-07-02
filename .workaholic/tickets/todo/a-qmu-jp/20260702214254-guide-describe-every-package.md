---
created_at: 2026-07-02T21:42:54+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort:
commit_hash:
category: Added
depends_on:
---

# Make the guide exhaustive: a page for every plgg-family package

## Overview

The guide (`packages/guide`, the plggpress-built site served at
`plgg-guide.qmu.dev` / `:5181`) documents only **11 of the 18** publishable
packages. Seven packages have **no page and no sidebar entry**, so a reader
browsing the guide cannot discover they exist. "Everything needs to be
described there" — this ticket closes that gap by authoring a prose page for
each of the seven undocumented packages and wiring each into the single
information-architecture instance (`site.config.ts`).

Scope is **new pages only** — the 11 existing pages are left as-is (no
enrichment pass). Depth **matches the existing single-file package pages**
(e.g. `packages/guide/packages/plgg-http.md`): bold lead sentence + the
"built from scratch on plgg" tagline, a **Why it exists** section with a small
ASCII dependency graph, a **How it's organized / How it works** section that
bullets each concern and cross-links the concept pages and sibling packages,
and a closing sentence deferring exact types and the full API to the package
source. This is **not** the fuller Install/API-table/Examples structure that
`conventions.md` prescribes — we deliberately follow what ships today. Code
samples, where used, must come from real package source, tests, or
`packages/example` — never invented (per `conventions.md`).

The guide is hand-written prose: the old typedoc/auto-generated API reference
was deliberately removed (archive `20260701121731-replace-typedoc-with-inhouse-api-gen.md`),
so there is **no generator to integrate with** — every page is authored by
hand.

## The seven undocumented packages

Author one page each. The summaries below are starting points; the package's
own source, `package.json`, and README are the source of truth.

**Consumable libraries (4):**

1. **plgg-cli** (has README) — a plgg-style toolkit for building command-line
   program wrappers: typed commands, options, argv parsing, and a
   Result-to-exit-code fold. Cross-link `Result`.
2. **plgg-db-migration** (has README) — a minimal, dependency-free
   schema-migration tool (dbmate-style single-file up/down, a
   `schema_migrations` ledger, on-demand per-tenant SQLite) built on plgg +
   [plgg-sql](/packages/plgg-sql). Ships a CLI bin. Graph:
   `plgg ─ plgg-sql ─ plgg-db-migration`.
3. **plgg-md** — a Markdown-to-typed-data parser built on plgg: a
   layout-marker frontmatter splitter and a block tokenizer for the plggpress
   subset, producing an immutable `Box`-union AST (`Result`, never throws).
   Underpins plggpress content parsing. Cross-link `Box`, `Result`.
4. **plgg-highlight** — zero-new-dep TS/TSX/JS/JSX/JSON syntax highlighting
   for plgg-md's `Highlighter` seam; drives the bundled `typescript`
   compiler's `ts.createScanner` to tokenize code into classified plgg-view
   `Html<never>` spans, with an escaped `<pre><code>` fallback. Support library
   for [plgg-md](/packages/plgg-md). Graph:
   `plgg ─ plgg-md ─ plgg-highlight`.

**Docs/build toolchain (3):**

5. **plggmatic** — a pre-organized, composable full-stack web-application
   framework built on the plgg family: config loading, a router builder,
   static-build + dev-server orchestration, and a pre-organized CLI. This is
   the framework plggpress consumes.
6. **plggpress** — a VitePress-like static-site generator built from scratch
   on plgg (a thin [plggmatic](/packages/plggmatic) consumer): a typed
   `SiteConfig` contract (IA + home data), a single base-path `Href` resolver,
   a config-loading CLI, and a build pipeline with a **build-time dead-link
   checker**. It is the engine that builds **this guide**, and owns the
   `SiteConfig` type + `defineSite` validator that `site.config.ts` imports.
   Graph: `plggmatic ─ plggpress ─ (this guide)`.
7. **plgg-bundle** — the monorepo's in-house minimal library bundler
   (ESM + CJS dual output, per-file `.d.ts` tree), zero new dependencies
   (reuses the project's own `typescript`, no native bindings). Also provides
   the guide's `dev` server. Pure build tooling.

Note the naming: the docs engine is **plggpress** / **plggmatic** — never the
retired `plgg-press` name.

## Key files

- `packages/guide/site.config.ts` — the single information-architecture
  instance. Register each new page here (see Implementation).
- `packages/guide/packages/plgg-http.md` — canonical single-file exemplar for
  the target voice and section skeleton.
- `packages/guide/packages/plgg-kit.md`, `packages/guide/packages/example.md`
  — further exemplars.
- `packages/guide/concepts/*.md` — the shared vocabulary
  (`option`, `result`, `tagged-data`, `validation`, `async`, `match`,
  `composition`) that pages cross-link into.
- `packages/guide/contributing/conventions.md` — the doc-authoring contract;
  also carries a **stale reference** to fix (see below).
- Each target package's `packages/<name>/` source + `package.json` + README —
  the source of truth for every page's content.

## Implementation

For **each** of the seven packages:

1. Create `packages/guide/packages/<name>.md` following the existing
   single-file page skeleton (H1 = bare package name; bold lead + "built from
   scratch on [plgg](/packages/plgg/)" tagline + dependency posture;
   `## Why it exists` with an ASCII graph; `## How it's organized` bulleting
   concerns and cross-linking concepts/siblings; closing source-deferral
   sentence). Prose hard-wrapped at Prettier `printWidth: 50`.
2. Append a `PackageGroup` entry to `PACKAGE_GROUPS` in `site.config.ts`:
   `{ key: "<name>", text: "<sidebar label>", overview: "/packages/<name>" }`.
   The sidebar tree is built automatically via
   `...PACKAGE_GROUPS.map(packageGroup)` — no other sidebar edit is needed.
   Keep the ordering rule: featured trio (plgg, plgg-http, plgg-router) first,
   `example` last. Suggested placement: the consumable libraries among the
   runtime family, the toolchain (plgg-md, plgg-highlight, plgg-bundle,
   plggpress, plggmatic) grouped together just before `example` — final
   grouping is the implementer's call within that rule.
3. Use `leaf()` / the `PackageGroup` shape so entries satisfy
   `SidebarItemInput` (items required, link optional) and validate through
   `defineSite` — **no `as` / `any` / `ts-ignore`** to force a shape.

Plus, once (not per-package):

4. **Fix the stale reference in `packages/guide/contributing/conventions.md`**:
   it still says the nav/sidebar tree lives in `.vitepress/config.ts`. The
   real IA now lives in `packages/guide/site.config.ts` (validated through
   `defineSite`). Correct it so the conventions describe how pages are
   actually wired today.

Optional (implementer's discretion, not required): surface a couple of the new
packages in the home feature grid or the top-nav "Packages" link in
`site.config.ts`.

## Considerations

- **Reachability is the point** (design policy): a page that exists but is not
  linked from the sidebar is unreachable — every new page MUST have a
  `PACKAGE_GROUPS` entry. This is enforced by the Quality Gate below.
- **Accessibility** (implementation policy): single H1, ordered heading
  hierarchy, descriptive link text, real Markdown tables if any table is used,
  no meaning conveyed by color alone.
- **Factual, not aspirational prose**: describe actual behavior; avoid
  marketing adjectives (elegant/powerful/simple). Match the existing pages'
  matter-of-fact voice.
- **No new dependencies**: do not reintroduce `vitepress` — plggpress owns the
  `SiteConfig` type deliberately.
- **Dead links fail the build**: plggpress's build-time link checker fails on
  any broken internal link/anchor, so every cross-link
  (`/concepts/*`, `/packages/*`) must resolve — this is the main mechanical
  risk when authoring seven interlinked pages at once.

## Quality Gate

All three must pass before `/drive` approval (a human visual review at
`:5181` is **not** required):

1. **Guide build is green.** From `packages/guide`, `npm run build`
   (`plggpress build --config site.config.ts --contentDir . --outDir dist`)
   succeeds — every new page renders and the built-in **dead-link checker**
   passes with zero broken internal links or bad fragments.
2. **Config typechecks with no escape hatches.** `site.config.ts` compiles and
   validates through `defineSite` (returns `Ok`, not `Err`); Prettier
   (`printWidth: 50`) reports the changed files clean; **zero** `as` / `any` /
   `ts-ignore` added anywhere in the change.
3. **Every target package is reachable from the sidebar.** All seven packages
   (plgg-cli, plgg-db-migration, plgg-md, plgg-highlight, plggmatic, plggpress,
   plgg-bundle) have a `PACKAGE_GROUPS` entry and a corresponding prose page —
   no orphan pages, no missing entries.

**Acceptance = the guide lists 18/18 packages**, each with a rendered,
link-clean prose page, and the build is green.
