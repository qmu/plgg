---
created_at: 2026-07-09T18:45:09+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Config]
effort: 2h
commit_hash: 2abc9148
category: Changed
depends_on:
mission:
---

# Refine plgg-bundle's app target to consume PUBLISHED dependencies (unblock standalone app builds)

## Overview

**Carry Origin:** carried on 2026-07-09 from a `/drive` of resume ticket
`20260709103916-resume-plggmatic-publish-boundary.md` that reached its context
budget. This ticket is the **top priority** — it is blocker 3 of the plggmatic
extraction and the last thing between the current state and a green
`../plggmatic`. Drive this BEFORE ticket C (`20260708195657`).

`plgg-bundle`'s `target:"app"` build (used by `plggmatic-example` and by `site`'s
client bundle via `plggpress`/`devEntry`) inlines its dependencies by discovering
them as **`packages/` SIBLINGS** and reading their **`src/`**. That is a
monorepo-only assumption. In the extracted standalone repo `../plggmatic`,
`plgg`/`plgg-view`/`plgg-ui` are installed in `node_modules` (dist-only, no
`src`), so the app bundler cannot find them and the app build dies with
`ResolveError: cannot resolve "plgg" from src/main.ts`.

Goal: make `plgg-bundle`'s app target build a standalone app against **published**
plgg dependencies, so `../plggmatic/scripts/check-all.sh` goes fully green.

## Position at carry (verifiable)

- **Two repos, both committed, working trees clean.**
  - `plgg` monorepo — branch `work-20260706-120449`, HEAD `d1ab0d1f`. Recent:
    `f3bb180a` split, `38cb0eec` plggpress@0.0.2 + archive B, `460864eb`
    relocation launcher fix, `e3297914` drift bumps, `efc6a4ce` relocate
    stale-cache bugfix, `d1ab0d1f` doc blocker 3. `scripts/check-all.sh` GREEN.
  - `/home/ec2-user/projects/plggmatic` — HEAD `9b2f079`. Standalone repo,
    populated, pins point at the published plgg family. `scripts/check-all.sh`
    passes the LIBRARY (`plggmatic`) and stops at the `plggmatic-example` APP
    build (blocker 3).
- **Published (npm) after the developer's family republish:** `plgg-view@0.0.2`,
  `plgg-md@0.0.2`, `plgg-server@0.0.4`, `plgg-ui@0.1.1`, `plgg-highlight@0.0.3`,
  `plgg-bundle@0.0.3`, `plgg-test@0.0.4`, `plggpress@0.0.2`.
- **PENDING republish (local > registry — the relocate stale-cache bugfix
  `efc6a4ce`, not yet published):** `plgg-bundle` local `0.0.4` (pub `0.0.3`),
  `plgg-test` local `0.0.5` (pub `0.0.4`), `plggpress` local `0.0.3` (pub
  `0.0.2`), `plgg-cms` local `0.0.2` (pub `0.0.1`). Verify with
  `PREFLIGHT=1 ONLY="plgg-bundle plgg-test plggpress" ./scripts/publish-npm.sh`.
- **What already works standalone (proven this session):** the published-dep
  contract resolves; `plggmatic` (library) build + `tsc --noEmit` + tests +
  coverage are GREEN with the RELOCATED published tooling (relocation launcher
  fix is real and validated). `plggpress`'s bin relocates and runs end-to-end
  (staged-tarball scratch install).

## The precise technical problem (read these files)

- `packages/plgg-bundle/src/domain/usecase/discoverWorkspace.ts` —
  `discoverWorkspace(config.root)` scans `dirname(config.root)` (the monorepo
  `packages/` dir) for sibling packages. In `../plggmatic/packages/` the only
  siblings are `{plggmatic, plggmatic-example, site}`, so `plgg`/`plgg-view`/
  `plgg-ui` are never discovered.
- `packages/plgg-bundle/src/domain/usecase/resolveWorkspaceSpecifier.ts` —
  `resolveInPackage` resolves an inlined dep to `join(pkg.dir, "src", ...)`, i.e.
  it READS the sibling's `src/`. Published `plgg`/`plgg-view`/`plgg-ui` ship
  `files: ["dist"]` only — no `src`.
- `packages/plgg-bundle/src/domain/usecase/build.ts` (app path ~L131–150) passes
  `resolve: resolveWorkspaceSpecifier({..., packages})`. App external is
  `NODE_EXTERNAL = /^node:/` only; everything else is inlined.
- `packages/plggmatic-example/bundle.config.ts` (`target:"app"`) and
  `packages/site/{bundle.config.ts,devEntry.ts}` are the standalone consumers.
- Repro in `../plggmatic`:
  `cd /home/ec2-user/projects/plggmatic && npm_config_min_release_age=0 ./scripts/check-all.sh`
  → builds `plggmatic` OK, then
  `plgg-bundle: ResolveError: cannot resolve "plgg" from src/main.ts`.

## Approach (decide in-drive; options, not a mandate)

1. **node_modules-aware discovery + inline from dist.** Extend
   `discoverWorkspace` to ALSO find plgg-family packages under the target's
   `node_modules` (hoisted), and teach `resolveInPackage` to fall back to the
   package's built `dist` (its `exports` default) when `src` is absent. The app
   bundler then inlines the published dist for `plgg`/`plgg-view`/`plgg-ui` while
   still inlining the local `file:` sibling `plggmatic` from its `src`. Likely the
   most faithful: keeps `target:"app"` producing a self-contained browser bundle.
   Watch: dist is compiled ESM — confirm `transpileToCjs`/`collectModules` handle
   already-JS modules, and that export discovery (`readExportNames`) still works.
2. **Ship `src` in the inlined libs.** Add `"src"` to `files` for `plgg`,
   `plgg-view`, `plgg-ui` (consistent with plggpress/plgg-bundle/plgg-test, which
   already ship `src`), plus the node_modules-aware discovery from (1) minus the
   dist fallback. Smaller bundler change, but bumps + republishes three more core
   libs and ships source to the registry.
3. **Standalone bundler mode / standard resolver.** A distinct app mode that
   resolves published deps via normal Node resolution against `node_modules`
   `exports`. Larger, but cleanly separates "monorepo sibling inlining" from
   "published-dep consumption".

Prefer (1) if the dist-inlining proves clean; fall back to (2) if not. Whatever is
chosen, the monorepo app builds (`example`, `plggmatic-example`, `site`) must stay
green (the monorepo path still discovers `packages/` siblings from `src`).

## Implementation Steps

1. Reproduce the failure in `../plggmatic` (command above). Read the four
   plgg-bundle files named above and `packages/plgg-bundle/src/domain/usecase/collectModules.ts`.
2. Implement the chosen approach in `plgg-bundle` (+ lib `files` changes if
   approach 2). Add/adjust `*.spec.ts` for the new discovery/resolution path.
   No `as`/`any`/`ts-ignore`; Prettier printWidth 50.
3. Keep the MONOREPO app builds green: run `./scripts/check-all.sh` in the plgg
   monorepo (it builds `example`/`plggmatic-example`/`site` via `packages/`
   siblings). Also harden the publish smoke to actually build a tiny app from a
   scratch install if feasible (the current smoke only ran `--help`).
4. Bump `plgg-bundle` again for this feature (local is `0.0.4` from the relocate
   fix → `0.0.5`), keeping the pending relocate-fix bumps for `plgg-test`
   (`0.0.5`), `plggpress` (`0.0.3`), `plgg-cms` (`0.0.2`).
5. **Developer-run publish (surface, do NOT auto-run)** the pending tool set:
   `ONLY="plgg-bundle plgg-test plggpress" ./scripts/publish-npm.sh`
   (add `plgg-cms` only if a consumer needs it; it is not consumed by the
   extraction). If approach 2 also republishes libs, add
   `plgg plgg-view plgg-ui` and bump them.
6. In `../plggmatic`: bump the tool pins to the newly published versions
   (`plgg-bundle@^0.0.5`, `plgg-test@^0.0.5`, `plggpress@^0.0.3`; +
   `plgg`/`plgg-view`/`plgg-ui` if approach 2), clear stale caches
   (`rm -rf /tmp/plgg-relocate-*`), `npm_config_min_release_age=0 ./scripts/npm-install.sh`,
   then `./scripts/check-all.sh` to FULL green (library + both apps + site).
7. Only after `../plggmatic` is fully green: proceed to ticket C
   (`20260708195657`) to remove the cluster from the monorepo.

## Policies

- `workaholic:implementation` / `policies/command-scripts.md` — the fix lives in
  the tool; consumers keep the canonical runner set. No per-consumer workarounds.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; plain `.mjs` launchers; Prettier printWidth 50.
- `workaholic:implementation` / `policies/type-driven-design.md` — the bundler's
  resolver/discovery stays typed (Option/Result, exhaustive handling).
- `workaholic:implementation` / `policies/test.md` — new discovery/resolution
  paths carry specs; coverage stays above the enforced threshold.
- `workaholic:design` / `policies/vendor-neutrality.md` — zero new dependencies;
  Node built-ins + the project's own TypeScript only.
- `workaholic:operation` / `policies/ci-cd.md` — published packages ARE the
  product; the publish smoke must catch "installed but cannot build/run".
- `workaholic:design` / `policies/sacrificial-architecture.md` — plgg-bundle is
  durable-core tooling; make it genuinely consumable, not monorepo-only.

## Quality Gate

**Acceptance criteria:**

- `../plggmatic/scripts/check-all.sh` passes FULLY green from a clean install of
  published packages: `plggmatic` (library) + `plggmatic-example` (app build +
  tests) + `site` (SSG build + examples tsc).
- The plgg monorepo `scripts/check-all.sh` stays green (monorepo app builds still
  inline `packages/` siblings from `src`).
- The relocate stale-cache bugfix (`efc6a4ce`) is published (plgg-bundle,
  plgg-test, plggpress at the bumped versions).
- No `as`/`any`/`ts-ignore`; no new runtime dependency; Prettier printWidth 50.

**Verification method:**

- Clean `../plggmatic`: `rm -rf /tmp/plgg-relocate-* packages/*/node_modules packages/*/dist`,
  then `npm_config_min_release_age=0 ./scripts/npm-install.sh && ./scripts/check-all.sh`.
- Monorepo `./scripts/check-all.sh` green.
- `PREFLIGHT=1 ./scripts/publish-npm.sh` shows the pending tool set only.

**Gate:**

- Both repos green AND standalone app build works against published deps AND the
  relocate bugfix is published AND no escape hatches / new deps.

## Considerations

- **Ticket C (`20260708195657`) stays BLOCKED** until `../plggmatic` is fully
  green — it deletes the only working home of the showcase apps.
- The relocate stale-cache bug only bites a host that previously ran the same tool
  version from a different tree (e.g. the developer's host after a publish smoke);
  a clean CI host is unaffected. Still publish the fix.
- `min-release-age=7` in the dev `~/.npmrc` blocks installing freshly-published
  versions; use `npm_config_min_release_age=0` for immediate post-publish installs
  (a normal aged install needs no override). Do NOT bake the override into the
  repo scripts.
- Publishing is developer-run (surface the exact `ONLY=...` command; never
  auto-publish). Scope every publish with `ONLY=` so the unpublished
  `plgg-content`/`plgg-mcp`/`plgg-domain` are never dragged in.
- Related tickets: `20260709103916` (extraction, blockers 1–3 documented in its
  carry checkpoints), `20260709165827` (run-from-source CLI consumability — the
  launcher relocation, now largely done; this ticket is its app-target sequel).

## Final Report

Development completed as planned.

### Discovered Insights

- **Insight**: Published plgg-family dist files are already plgg-bundle registry
  bundles, so their inner `require("src/...")` calls are not package imports.
  **Context**: App bundling published deps needs to treat dist entries as
  prebundled modules: inline their real external package requires, but leave the
  inner registry ids untouched.
- **Insight**: A standalone source sibling can have its own per-package
  `node_modules` even when the leaf app has a separate install tree.
  **Context**: The extracted `plggmatic` package imports `plgg-ui/style` from
  its own install, so app dependency discovery must include sibling source
  packages' `node_modules`, not only the app package's node_modules.
