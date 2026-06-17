---
created_at: 2026-06-17T21:39:57+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, UX]
effort:
commit_hash:
category:
depends_on:
---

# Guide T1 — Scaffold the VitePress guide + containerized dev + information architecture

## Overview

Stand up `packages/guide/` as a VitePress site that will become the **official
user guide for plgg and the whole plgg family** (plgg, plgg-http, plgg-router,
plgg-server, plgg-view, plgg-fetch, plgg-sql, plgg-foundry; plgg-kit noted), and
make it runnable in a container for local dev in this repo. This is the
**foundation ticket**: it fixes the information architecture (nav + sidebar tree)
that every later content ticket fills in, so the docs grow against a stable
structure rather than ad hoc.

This is a large initiative split across 8 tickets (T1–T8); see the queue. T1
ships the skeleton + dev container + IA only — **no per-package content yet**
(that is T2–T7), and **no API auto-generation or CI deploy** (that is T8).

## Key Files

- `packages/guide/` (new) — the VitePress project: `package.json`
  (vitepress dep + `dev`/`build`/`preview` scripts), `.vitepress/config.ts`
  (site metadata, nav, the full sidebar IA), `index.md` (home/landing),
  `getting-started.md` + per-package section stubs.
- `workloads/development/compose.yaml` / `workloads/development/Dockerfile` -
  the existing dev-container precedent (builds the package chain, runs the
  `example` SSR/CSR demo on :3000). The guide's container follows these
  conventions. (`workloads/development/README.md` documents the pattern.)
- Each package's `README.md` (10 of them) - the source material the IA must have
  a home for; the sidebar tree mirrors the package set.

## Implementation Steps

1. **Scaffold `packages/guide/`** — a VitePress project (its own `package.json`,
   standalone like the other packages; no root workspaces exist). Pin VitePress,
   add `dev`/`build`/`preview` scripts. Add `.gitignore` for `.vitepress/cache`
   and `dist`.
2. **Author the information architecture** in `.vitepress/config.ts`: top nav
   (Guide / API / Packages / GitHub) and a sidebar tree covering **every**
   package, with placeholder pages so the structure is navigable end to end:
   - *Guide*: Getting started, Core concepts (Option/Result/pipe/cast/proc/match,
     errors-as-data).
   - *Packages*: plgg (core), plgg-http, plgg-router, plgg-server, plgg-view,
     plgg-fetch, plgg-sql, plgg-foundry, plgg-kit, example (tutorial).
   - *API reference*: a section reserved for the auto-generated reference (T8).
   Each later ticket (T2–T7) owns the pages under its section.
3. **Landing page** (`index.md`) — VitePress hero + feature grid summarizing the
   family ("built from scratch on plgg", Option/Result, runtime-neutral, etc.),
   linking into the sections.
4. **Containerized dev** — add a guide service so `docker compose` runs the
   VitePress dev server with hot-reload. Either a new service in
   `workloads/development/compose.yaml` or a sibling `workloads/guide/`
   (Dockerfile + compose.yaml) mirroring the existing one: `node:22-slim`, repo
   root build context, install `packages/guide`, run `vitepress dev --host` on a
   dedicated port (e.g. 5173), repo mounted for live editing. Document the
   one-command run in a short README, matching `workloads/development/README.md`.
5. **Doc conventions page** — a short contributor page fixing how API/package
   pages are structured (overview → install → concepts → API tables → examples),
   and the rule that **code samples come from the real packages / tested
   examples**, not invented snippets.

## Considerations

- **No npm workspaces in this repo.** Each package is standalone and consumes
  plgg via `file:` dist symlinks (see the dev Dockerfile's ordered build). The
  guide is a standalone package too; it does **not** need to import the packages
  at build time for T1 (content is Markdown). If later tickets embed type-checked
  samples, they pull built dists — coordinate with T8.
  (`workloads/development/Dockerfile`)
- **Container parity with the existing dev workload.** Reuse the `node:22-slim`
  + repo-root-context + `.dockerignore` conventions so the guide container
  behaves like the `example` one; pick a non-3000 port to coexist.
  (`workloads/development/compose.yaml`)
- **IA is the contract.** T2–T7 fill pages under the sidebar tree this ticket
  defines; keep the tree comprehensive (one node per package + concept) so no
  later ticket has to restructure navigation. (`packages/guide/.vitepress/config.ts`)
- **Operation policy (`standards:operation`).** The dev container is delivery
  infrastructure — keep it reproducible and one-command, vendor-neutral
  (plain Docker Compose), and leave production build/deploy to T8.
- Layer: `Infrastructure` (container/build) + `UX` (the guide is the user's
  reach into the API; the IA shapes that reach — `standards:design`).
