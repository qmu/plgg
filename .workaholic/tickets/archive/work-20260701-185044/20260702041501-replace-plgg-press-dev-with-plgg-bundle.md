---
created_at: 2026-07-02T04:15:01+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure, Domain]
effort: 4h
commit_hash: 4c5360a
category: Changed
depends_on: [20260702041500-plgg-bundle-dev-server-module-runner-hot-reload.md]
---

# Replace plgg-press's dev server with `plgg-bundle`'s; strip dev from plgg-press AND plggmatic

## Overview

Adopt the toolchain dev server from ticket A ([20260702041500-plgg-bundle-dev-server-module-runner-hot-reload.md](.workaholic/tickets/todo/a-qmu-jp/20260702041500-plgg-bundle-dev-server-module-runner-hot-reload.md)): make `plgg-press`/the guide **consume** `plgg-bundle dev` for development, and **remove hot-reload from both the app and the framework** — per the author's decision that dev/hot-reload is a **toolchain** concern only. After this, editing a theme `.ts` refreshes the guide in the browser with **no container restart**.

Removals/relocations:
- **`plgg-press`** sheds its hand-rolled dev server: delete `src/dev.ts` + `src/dev.spec.ts`, drop the `dev` re-export from `src/index.ts`, and remove/redirect the `dev` command in `src/cli.ts`. plgg-press keeps only its **render entry** (the `pressRouter` `Fetch` factory + config load) that it hands to `plgg-bundle dev`.
- **`plggmatic`** sheds the dev loop landed in 213410: remove `src/Dev/usecase/dev.ts` (+ spec) and its barrel export. This **supersedes** 213411's plan to route plgg-press's dev through `plggmatic.frameworkDev` — dev is neither the app's nor the framework's job.

## The consume seam

`plgg-press` exposes a **dev entry**: a `Fetch` factory built from `pressRouter(contentDir, config, base, paths)` + `discoverPaths` + config load (the same render path `build` uses). The guide's `dev` script becomes `plgg-bundle dev` (the tool), configured with a dev entry that binds plgg-press's factory to the guide's `site.config.ts` + `dev.allowedHosts` + port. `plgg-bundle` owns watch + module-runner re-evaluation + SSE reload + `node:http` serve; plgg-press owns only "what a page renders."

## Policies

- `workaholic:implementation` / `policies/domain-layer-separation.md` — dev/serve leaves the app + framework entirely; plgg-press's entry points shrink to the render factory; `plgg-bundle` (toolchain) owns the dev loop.
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`@ts-ignore`; the dev entry is consumed via package alias, not relative cross-package paths.
- `workaholic:design` / `policies/emergent-design-system.md` + `modeless-design.md` — the guide's qmu theme must render **identically** in dev and prod; dev "just works".
- `workaholic:operation` / `policies/ci-cd.md` + `containerization.md` — switch the guide dev container (`workloads/guide/{compose.yaml,dev-entrypoint.sh}`) command to the new dev server; keep it reproducible (the bind-mount now yields live code hot-reload, not just content).
- `workaholic:planning` / `policies/proactive-poc.md` — the guide (`plgg-guide.qmu.dev` → :5181) is the live oracle for the full gate.

Repo constraints: `.workaholic/constraints/architecture.md` (upward-only deps — plgg-press depends on the plgg-bundle toolchain for dev; no cycle), `.workaholic/constraints/project.md` (Package Scope Stability — dev responsibility formally leaves plgg-press/plggmatic; each `index.ts` exports only its own responsibility), `.workaholic/constraints/quality.md`.

## Key Files

plgg-press (slim): `src/dev.ts` (DELETE), `src/dev.spec.ts` (DELETE), `src/cli.ts` (`dev` command → delegate to `plgg-bundle dev` or remove), `src/index.ts` (drop `dev`/`DevServer` export), `src/Press/model/PressOptions.ts` (prune the dev/allowedHosts fields that only fed the old server, or move them to the dev entry), `src/router/pressRouter.ts` (unchanged render path — becomes the Fetch the dev entry exposes), new `src/devEntry.ts` (the Fetch-factory the toolchain consumes).

plggmatic (strip dev): `src/Dev/usecase/dev.ts` (+ spec) DELETE, `src/index.ts` barrel drop the whole dev cluster (`Clients`/`DevHandle`/`DevSpec`/`dev`/`createDevHandle`/`decorateDevHtml`/`isAllowedHost`/`devPort`/`devUrl`/`watchContent`). The seam reaches further than the barrel: `src/Cli/usecase/runApp.ts` imports `dev`/`DevSpec`/`DevServer` and its `AppDefinition` requires a `devSpec` field + serves a `dev` command — drop both; `src/App/model/AppOptions.ts` carries the `DevServer` type and the `dev: boolean`/`allowedHosts` fields that only fed the dev loop — prune (keep whatever `build` still needs). Sweep with `git grep -n "DevServer\|DevSpec\|devSpec" packages/plggmatic/src` until empty. Reconcile 213411 (see note appended to it).

Consumer/CI: `packages/guide/package.json` (`dev` script → `plgg-bundle dev …`), `packages/guide/site.config.ts` (`dev.allowedHosts` still honored by the toolchain server), `workloads/guide/{compose.yaml,dev-entrypoint.sh}` (container command switchover; PORT=5173 / 5181 tunnel preserved), `.github/workflows/deploy-guide.yml` (unaffected — prod build path unchanged; verify).

## Related History

- Ticket A (the toolchain dev server this consumes).
- [20260701213411-reimplement-plgg-press-on-plggmatic.md](.workaholic/tickets/todo/a-qmu-jp/20260701213411-reimplement-plgg-press-on-plggmatic.md) — its dev-loop-through-plggmatic portion is **superseded** here (dev → plgg-bundle); the rest of 213411 (config/router/build rewire onto plggmatic) still stands, still blocked on the `__require` fix (`20260702032000`).
- [20260702034500-plgg-press-home-sidebar-nav-reachable.md](.workaholic/tickets/archive/work-20260701-185044/20260702034500-plgg-press-home-sidebar-nav-reachable.md) — the theme edit that motivated wanting real hot-reload.

## Implementation Steps

1. Add `plgg-bundle` (`file:../plgg-bundle`) as the guide's / plgg-press's dev dependency-of-record for dev; wire a dev entry (`plgg-press/devEntry`) exposing the `Fetch` factory + config load.
2. Point the guide's `dev` script at `plgg-bundle dev` with a dev config (entry + port + watch roots = plgg-press theme/src + guide content + `allowedHosts` from `site.config.ts`).
3. Delete `plgg-press/src/dev.ts` + `dev.spec.ts`; drop the `dev`/`DevServer` exports from `src/index.ts`; remove/redirect the `dev` command in `cli.ts`.
4. Delete `plggmatic/src/Dev/usecase/dev.ts` (+ spec) and its barrel export; prune the `devSpec`/`dev`-command seam from `runApp.ts` and the `DevServer`/dev fields from `AppOptions.ts` (grep-sweep per Key Files); the supersede note on 213411 is already appended — verify it still matches.
5. Switch `workloads/guide/{dev-entrypoint.sh,compose.yaml}` to the new dev command; confirm the bind-mount now drives code hot-reload (no rebuild-and-restart cycle).
6. Package gates green ≥90%: `scripts/test-plgg-press.sh`, `scripts/test-plggmatic.sh`, `scripts/test-plgg-bundle.sh` + their coverage runners (NOTE: `tsc-plgg.sh`/`test-plgg.sh` cover `packages/plgg` only), then `scripts/check-all.sh`; verify prod build output unchanged.
7. Live-verify on the guide (see gate).

## Quality Gate

**Acceptance criteria (the full gate the author selected):**
- With the guide running under the new dev server, editing a theme `.ts` (e.g. `page.ts`) is reflected in the browser **with NO container restart, within ~2s**.
- Markdown/content edits **still** live-reload.
- Production build output is **unchanged** (byte-identical guide build vs a pre-change oracle; emit stays script-free).
- `tsc` + tests green; coverage ≥90% (dev-server coverage now lives in plgg-bundle; plgg-press/plggmatic lose their dev specs cleanly — no threshold drop, exclusions updated).
- **Zero new external deps**; plgg-press's `dev.ts` and plggmatic's `Dev/usecase/dev.ts` are gone (`git grep` confirms); no `as`/`any`/`@ts-ignore`.
- The guide dev container command is switched over and verified live on `plgg-guide.qmu.dev`.

**Verification method:** `scripts/test-plgg-press.sh` + `scripts/test-plggmatic.sh` + `scripts/test-plgg-bundle.sh` and their coverage runners green ≥90%, then `scripts/check-all.sh` (NOTE: `tsc-plgg.sh`/`test-plgg.sh` cover `packages/plgg` only — not a gate for these packages); guide build diff (pre vs post) empty; edit-a-theme-file → browser refresh demonstrated on the running guide (light/dark), no restart; `git grep -n "plgg-press/dev\b\|Dev/usecase/dev\|DevSpec\|devSpec" packages/plgg-press packages/plggmatic` is empty (scoped to those two — plgg-bundle's own new `Dev/` domain legitimately matches).

**Gate:** code edit hot-reloads the guide with no restart, content still reloads, prod build byte-identical, tsc + tests green ≥90%, dev fully removed from plgg-press + plggmatic, zero new deps — before approval.

## Considerations

- **Behavior parity for prod is the contract** — this moves *dev* plumbing only; the built site must not change. Capture the guide build oracle before starting.
- **Sequencing vs the plggmatic chain**: this can land independently of the blocked 213411 (dev runs from source, no `__require` dependency). It *reduces* 213411's scope (dev removed from its plan). Do A → B; 213411/213412 remain gated on the separate `__require` fix.
- **Don't regress the tunnel**: the toolchain server must keep honoring `site.config.ts`'s `dev.allowedHosts` (`plgg-guide.qmu.dev`).
