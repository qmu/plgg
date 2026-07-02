---
created_at: 2026-07-02T20:25:08+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure, Domain]
effort:
commit_hash: c841323
category: Changed
depends_on:
---

# RESUME: 041500 + 041501 landed (dev server + consume seam); left to do = deploy the guide live, then drive the __require chain (032000 → 213411 → 213412)

## Position (verify first)

**Branch `work-20260701-185044`, HEAD `c506da5`, working tree clean.** `scripts/check-all.sh` is GREEN end-to-end (exit 0). This ticket is a MAP — do NOT implement it. It supersedes the now-stale `20260702042000` resume map (whose priorities 1–2 are DONE).

Baseline checks: `git log --oneline -1` = `c506da5`; `git status` clean; `scripts/check-all.sh` exits 0.

## What is DONE this session (committed, green)

- **041500** (`684fde9`) — `plgg-bundle dev`: a from-scratch, plgg-free, zero-dep toolchain dev server with TRUE module-runner hot-reload (`bin/hook.mjs` propagates a `?v=` version down the local import graph; `src/Dev/` pure core + node adapter). Proven by a child-process PoC (`src/Dev/fixtures/devPoc.spec.ts`).
- **Latent drift fixes** (`740d7a8`) — a fresh check-all rebuild unmasked two pre-existing type drifts; fixed `plggmatic/src/Build/usecase/build.ts` (copyAssets stage `SsgError` → `SsgError | Defect`, per `bb41c15`) and `example/src/app.ts` (opacity `some(0/1)` → `some(box("Float")(…))`). **This is what turned check-all green.** See [[project_plggmatic_checkall_red]].
- **041501** (`c506da5`) — replaced plgg-press's hand-rolled dev with `plgg-bundle dev`; removed dev from plgg-press AND plggmatic. Added cross-package SOURCE hot-reload: `dev.sourceAliases` config + `plgg-bundle/bin/appAliasHook.mjs` (resolves a dependency's `<prefix>/*` to source + propagates `?v=` across the package boundary). **Proven locally**: editing `plgg-press/src/theme/sidebarTree.ts` hot-reloaded the guide in ~1s, no restart. Guide prod build BYTE-IDENTICAL (25 files). Coverage >90% across plgg-bundle/plgg-press/plggmatic.
- **Live guide fix** (this session, no code) — restarted `guide_guide_1` earlier so it picked up the home-sidebar commit `e6e5afa`; the guide currently serves correctly (host :5181, HTTP 200, sidebar present) but on the OLD plgg-press dev.

## PRIORITY QUEUE for the fresh session

**1. Deploy 041501 to the live guide (HUMAN-gated, outward-facing).**
The container still runs the OLD dev server. To switch to the toolchain dev server: `docker restart guide_guide_1` (re-runs `workloads/guide/dev-entrypoint.sh`: install loop → `scripts/build.sh` → `npm run dev` = now `plgg-bundle dev bundle.config.ts`). Then verify hot-reload works LIVE: touch a `packages/plgg-press/src/theme/*.ts` and confirm `plgg-guide.qmu.dev` refreshes with no restart (Cloudflare Access gates curl — a human verifies in-browser; container maps internal :5173 → host :5181 → tunnel). Container has what it needs (compose already isolates `plgg-bundle/node_modules`; `build.sh` runs `npm ci` in plgg-bundle; the guide install loop symlinks the new plgg-bundle devDep). **Confirm with the author before restarting a live service.**

**2. Drive the `__require` chain (was blocked; still needs a deliberate, supervised change):**

- **`20260702032000`** — fix `plgg-bundle`'s `__require` dynamic-import rewrite. `src/domain/usecase/emitBundle.ts` `externalFallback()` (~line 113) emits `throw ... "Cannot resolve external"`; change the unresolved-id branch to fall back to native `return import(id)` (Option A in that ticket). **This alters the shared shim every dist carries** — the ticket flags it as too risky unsupervised; do it deliberately, then FULL `scripts/build.sh` + `scripts/check-all.sh`. Prerequisite for 213411/213412.
- **`20260701213411`** — reimplement plgg-press's config-load/router/static-build on plggmatic (its dev-loop portion is SUPERSEDED by 041501; plggmatic no longer has dev). Concrete redo plan lives in `20260702032000` ("Then: 213411 → 213412", steps 1–9 minus dev). Blocked on 032000. Gates: `scripts/test-plgg-press.sh` + `scripts/test-plggmatic.sh` + coverage, then `check-all.sh`; guide build byte-identical.
- **`20260701213412`** — mechanical rename plgg-press → plggpress (mirror the two prior rename tickets; note the guide's `dev` script is now `plgg-bundle dev`, `build` is still `plgg-press build`).

## Key technical context (carried)

- **The cross-package hot-reload seam (041501, load-bearing):** `guide/bundle.config.ts` declares `dev.sourceAliases: [{prefix: "plgg-press", srcDir: "../plgg-press/src"}]` + `watch: [".", "../plgg-press/src"]`. `guide/devEntry.ts` imports `plgg-press/devEntry` (self-alias → resolved to SOURCE by `appAliasHook.mjs`). `pressDevEntry` (in `plgg-press/src/devEntry.ts`) is the same render path `build` uses.
- **A real bug fixed:** a bare `<prefix>` specifier (e.g. site.config's `import "plgg-press"`) matched the source DIRECTORY (exists) → `import()` EISDIR. Both `appAliasHook.mjs` and `scanGraph.ts` now match only FILES (`isFile`/`statSync`), preferring `index.ts`.
- **Coverage config:** `plgg-bundle/plgg-test.config.json` excludes effectful/adapter files (`/Dev/node/`, `/Dev/fixtures/`, `/vendors/`, `/entrypoints/cli.ts`, `/index.ts`, `/discoverWorkspace.ts`); `plgg-press` excludes `/devEntry.ts` (thin integration entry, verified live); `plggmatic` excludes the new `/throws.config.ts` fixture.
- **Shell gotchas:** the Bash-tool zsh has `noclobber` (use `>|`, not `>`), interactive `cp -i`/`diff`→pager (use `command cp` / `command diff`). See [[reference_shell_interactive_aliases]].
- **commit.sh gotcha:** passing trailing `[files...]` SKIPS its default `git add -u` — stage untracked with `git add` first, then call commit.sh with NO file args. See [[reference_commit_sh_explicit_files]].

## Pending HUMAN (not code)

- **Visual sign-off** of the qmu theme + home sidebar on the live guide (Playwright light/dark, lg/mobile) — reserved as a human step since the qmu-theme tickets (211839/211840).
- **The live-guide deploy of 041501** (priority 1) — a container restart of a live tunnel'd service; author decision.

## UPDATE (2026-07-02, /drive): the `__require` chain is DONE — only the human items above remain

Priority 2 landed in full this session; the queue this map tracks is drained:

- **032000** (`951f034`) — plgg-bundle's ESM `__require` fallback now returns native `import(id)` (CJS deliberately keeps host `require`); proven end-to-end (bundled plggmatic `loadConfig` loads a runtime config).
- **213411** (`21af849`) — plgg-press rewired as a thin plggmatic consumer (guide build byte-identical, 25 files; check-all green). plggmatic joined `scripts/build.sh` and the guide container provisioning. plggmatic's exports map widened to `types`+`default` (Node `require(esm)` needs a matching condition for plgg-bundle's export-surface reader).
- **213412** (`41f24e1`) — the package is now **`plggpress`** everywhere (dir, bin, alias, scripts, CI, workloads, docs; old name greps to zero outside historical records).

**Priority 1 is now the ONLY open item, and the rename changes its verification paths:** after `docker restart guide_guide_1` (which now also installs `packages/plggpress` + `plggmatic` via the updated entrypoint), verify hot-reload by touching a `packages/plggpress/src/theme/*.ts` (NOT `plgg-press`) and confirming `plgg-guide.qmu.dev` refreshes with no restart. Archive this ticket once the restart + visual sign-off are done.
