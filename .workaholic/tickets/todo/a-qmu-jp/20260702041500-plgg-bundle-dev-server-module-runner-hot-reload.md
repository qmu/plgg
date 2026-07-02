---
created_at: 2026-07-02T04:15:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Added
depends_on:
---

# Expand `plgg-bundle` into a toolchain dev server with true code hot-reload (module-runner)

## Overview

Give the plgg **toolchain** its missing "dev half of Vite": add a `plgg-bundle dev` mode that serves an app over `node:http`, watches its source, and — on a **code** edit — re-evaluates the changed server module subgraph and pushes a browser reload, **with no process/container restart**. Today `plgg-bundle` is a one-shot bundler only; the sole dev server in the repo is `plgg-press`'s hand-rolled `dev.ts`, which watches **only** Markdown content and never re-evaluates render code (theme `.ts` edits need a full container restart — the exact pain this fixes).

**Architectural decision (author, this session):** hot-reload / dev server is a **toolchain** concern, **not** a feature of the app (`plgg-press`) nor the framework (`plggmatic`). This ticket builds the capability in `plgg-bundle`; a sibling ticket ([20260702041501-replace-plgg-press-dev-with-plgg-bundle.md](.workaholic/tickets/todo/a-qmu-jp/20260702041501-replace-plgg-press-dev-with-plgg-bundle.md)) makes `plgg-press` consume it, removes `plgg-press`'s `dev.ts`, and strips `plggmatic`'s `Dev/usecase/dev`.

**Chosen mechanism (author): a true module-runner (HMR-lite), not process-restart.** Watch source → invalidate the changed module + its transitive importers → cache-busting re-import of the app's dev entry so the affected subgraph re-evaluates → swap the served `Fetch` → push reload. This mirrors Vite's SSR module runner. Built **from scratch on `node:*` + the already-present `typescript`** — see the hard constraints below.

## Hard constraints (non-negotiable)

- **`plgg-bundle` stays plgg-free.** It is a foundation build tool and must NOT `import 'plgg'` / `plgg-server` / any library it builds (see `build.ts`/`BundleConfig.ts` headers). The dev server therefore serves over its **own thin `node:http` adapter** and speaks the Web-standard **`Fetch` (`Request => Promise<Response>`)** the app hands it — never a plgg type. (`serve`/`toFetch` in `plgg-server` are the reference for behavior, not an import.)
- **Zero new external dependencies** (`workaholic:design`/`implementation` vendor-neutrality). No `chokidar`/`ws`/`vite`/`esbuild`. Use `node:fs.watch`, `node:http`, the ESM loader `register()`/module hooks, and `typescript` (already a dep). SSE (as today) for the reload channel — no WebSocket lib.
- **Runs from source.** `plgg-bundle` launches via `bin/plgg-bundle.mjs` (`register('./hook.mjs')` + dynamic-import the `.ts` entry, Node strips types). The dev server inherits this, so its own `import()`s are **native** — the `__require` bundled-dynamic-import blocker (ticket `20260702032000`) does **not** gate this work.

## Policies

- `workaholic:design` / `policies/vendor-neutrality.md` — **CENTRAL**: watcher, reload channel, and module re-evaluation built from scratch on `node:*` + `typescript`; zero new deps; node seams isolated behind a thin adapter so exit cost stays ~0.
- `workaholic:design` / `policies/modeless-design.md` + `self-explanatory-ui.md` — the dev server "just works" on start (watch + re-eval + reload), no mode to enter; legible console/error output.
- `workaholic:design` / `policies/sacrificial-architecture.md` — draw the dev-server module boundary as a rebuildable/discardable unit.
- `workaholic:implementation` / `policies/domain-layer-separation.md` + `functional-programming.md` — **pure core** (module graph, invalidation set, reload-protocol messages) separated from the **node/fs/module-loader/http adapter** (mirror `plgg-server`'s core vs `/node` split); declarative graph logic, mutation confined to the edge.
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`@ts-ignore`; `Result`/`Option`; the `fs.watch`/loader/socket seams wrapped at a typed boundary. (Note: `plgg-bundle` is plain-TS with no `plgg`, so `Result`/`Option` here are its own local typed patterns — do not import plgg.)
- `workaholic:implementation` / `policies/directory-structure.md` — new modules under `packages/plgg-bundle/src/` in the established `domain/model` + `domain/usecase` split, colocated `*.spec.ts`, exported from `src/index.ts` (Module Export Convention).
- `workaholic:implementation` / `policies/command-scripts.md` — no bespoke per-package dev script; fold into the canonical runners.
- `workaholic:operation` / `policies/ci-cd.md` — register the expanded suite in the canonical/`run-tests` runners so the new code compiles + tests reproducibly.
- `workaholic:planning` / `policies/terminology.md` + `proactive-poc.md` — one consistent vocabulary (dev-server, watcher, module graph, invalidation, module-runner, reload transport); prove with the smallest runnable slice (a fixture app here; the guide is the end-to-end oracle in the sibling ticket).

Repo constraints: `.workaholic/constraints/architecture.md` (Module Export Convention; TS strict flags identical to plgg; the toolchain layer's position — the "new capability" trigger — should be recorded), `.workaholic/constraints/quality.md` (no escape hatch; ≥90% coverage; Prettier printWidth 50).

## Key Files

`plgg-bundle` (change/add):
- `packages/plgg-bundle/src/entrypoints/cli.ts` — add a `dev`/`serve` subcommand branch (today `argv[2]` is only a config path); it resolves the config, then runs the dev server instead of the one-shot `build()`.
- `packages/plgg-bundle/src/domain/model/BundleConfig.ts` — extend the validated contract with an optional `dev` section (dev entry module path, `port`, `watch` roots, `allowedHosts`); `asBundleConfig` validates it at the `unknown` boundary.
- `packages/plgg-bundle/src/Dev/**` (new) — the dev server: a **pure core** (`model`: module-graph node/edge, invalidation set, reload message; `usecase`: invalidation-propagation to transitive importers, reload decision, dev-HTML live-reload injection, host-allowlist) and a **node adapter** (`fs.watch` debounce, the `node:http` serve, the SSE client registry, the loader-hook version bump + cache-busting re-import of the dev entry). Colocated specs.
- `packages/plgg-bundle/bin/hook.mjs` — extend the resolver so changed files (and their importers) resolve with a `?v=<version>` query, so a re-import re-evaluates the affected subgraph rather than serving cached modules. This is the crux of real code hot-reload.
- `packages/plgg-bundle/src/index.ts` — export the dev-server entry (`devServer`/`dev`) + its config type.
- `packages/plgg-bundle/vite.config.ts` / `plgg-test.config.json` — coverage thresholds ≥90; adapter-only files (no executable statements) go in the exclude array, not the threshold.

Reference (behavior only — do NOT import): `packages/plgg-server/src/Serving/usecase/serve.ts` (`node:http` adapter), `.../Routing/usecase/toFetch.ts` (`Web→Fetch`), and `packages/plgg-press/src/dev.ts` (the SSE live-reload injection, host allowlist, debounce — the behaviors to reproduce, plgg-free, in the toolchain). `packages/plgg-bundle/src/vendors/runner.ts` (existing vm/isolated-eval precedent for "run/re-evaluate a module").

## Related History

- [20260627002335-replace-example-vite-dev-server-and-app-bundle.md](.workaholic/tickets/archive/work-20260626-221353/20260627002335-replace-example-vite-dev-server-and-app-bundle.md) — recorded "a bundler is not a dev server" (commit `0cc75bf`); this ticket **deliberately revises** that position per the author's Vite-model decision (the bundler tool now also serves+HMRs in dev), while keeping build and dev as separate modes.
- [20260630013509-plgg-press-dev-server-live-reload.md](.workaholic/tickets/archive/work-20260630-013457/20260630013509-plgg-press-dev-server-live-reload.md) — created the hand-rolled `plgg-press` dev (SSE live-reload, "live-reload NOT HMR", content-only); this ticket supersedes it with true code hot-reload in the toolchain.
- [20260702032000-resume-plggmatic-rewire-blocked-on-bundle-dynamic-import.md](.workaholic/tickets/todo/a-qmu-jp/20260702032000-resume-plggmatic-rewire-blocked-on-bundle-dynamic-import.md) — the `__require` dynamic-import rewrite note; related module-loading area but NOT a gate here (dev runs from source → native `import()`).

## Implementation Steps

1. **Agree the app⇄dev-server contract** (design-first): the app supplies a **dev entry** module exporting a `Fetch` factory (`() => Fetch` or `(paths) => Fetch`) + the watch roots + `allowedHosts` + port; `plgg-bundle` owns everything else. Fix this small contract before coding.
2. **Config**: extend `BundleConfig`/`asBundleConfig` with the optional `dev` section; validate at the boundary.
3. **Pure core** (`Dev/model` + `Dev/usecase`): module-graph + invalidation propagation (changed file → itself + transitive importers), the reload-decision, the dev-HTML live-reload `<script>` injection (string-append to rendered HTML output only), and the host-allowlist — all pure, unit-tested, no `node:*`.
4. **Loader-hook versioning**: extend `hook.mjs` (and/or a `module.register` hook) to append `?v=<version>` to resolved specifiers for invalidated files, so re-importing the dev entry re-evaluates the changed subgraph. Keep native `import()` (from source).
5. **Node adapter**: `fs.watch` (debounced, recursive over the watch roots), the `node:http` serve hosting the app `Fetch`, the SSE reload channel + client registry, and the rebuild loop (bump versions → re-import dev entry → swap `Fetch` → notify clients). Wrap throws to typed results at the boundary.
6. **CLI**: wire `plgg-bundle dev` to load the config and start the server; fold `Result`→exit at the bin edge.
7. **Spec** the pure core + adapter (colocated `*.spec.ts`, ≥90%); register `plgg-bundle` in the canonical runners + `run-tests.yml` install/test steps.
8. **PoC**: a minimal fixture app (a tiny `Fetch` factory + a source module) proving: edit the source module → subgraph re-evaluates → served output changes → SSE reload fires — **without restarting the process**.

## Quality Gate

**Acceptance criteria (the full gate the author selected — the code-edit hot-reload half proven here on a fixture; the guide-live half is the sibling ticket):**
- `plgg-bundle dev` serves an app-supplied `Fetch` over `node:http`, watches its source, and on a **code** edit re-evaluates the changed module subgraph and pushes a browser reload **without a process restart** — proven by a runnable fixture spec (edit a source module mid-run → new output served, no restart).
- **Zero new external dependencies**: `git diff` of `packages/plgg-bundle/package.json` shows no added `dependencies`/`devDependencies`; and `git grep -nE "from \"plgg\b|from 'plgg\b|plgg-server" packages/plgg-bundle/src` is empty (stays plgg-free).
- Pure-core vs node-adapter separation holds; the graph/invalidation logic is unit-testable without `fs`/a live socket.
- No `as`/`any`/`@ts-ignore`; `plgg-bundle` keeps plgg-identical strict flags.

**Verification method:**
- `scripts/tsc-plgg.sh` exits 0; `scripts/test-plgg.sh` green including `plgg-bundle`'s new suite at ≥90% (statements/branches/functions/lines); `git grep` gates above are empty.
- A fixture-app spec demonstrates code hot-reload end-to-end in-process (change file → re-eval → new response) and the SSE reload frame is emitted.

**Gate:** tsc + tests green (incl. plgg-bundle ≥90%), zero new deps + plgg-free confirmed by grep, pure/adapter split intact, fixture proves code re-evaluation without restart — all before approval.

## Considerations

- **The hard part is transitive invalidation**, not watching files. Node caches ES modules by resolved URL; cache-busting one module does NOT re-evaluate its importers unless they also re-resolve with a new query. The loader-hook version scheme (step 4) is load-bearing — spec it against a small multi-module fixture (A imports B; edit B; confirm A re-evaluates).
- **Keep `build` and `dev` as distinct modes** — this revises "a bundler is not a dev server" only insofar as the *tool* now has both modes; the one-shot build path stays untouched and script-free.
- **Reuse the atomic-publish discipline** (MEMORY: shared-dist concurrency) if the dev loop ever writes to `dist`; prefer serving from memory to avoid torn reads.
- **Live-reload injection stays output-only** (string-append to rendered HTML), never in a typed tree, so it can never leak into a production build.
