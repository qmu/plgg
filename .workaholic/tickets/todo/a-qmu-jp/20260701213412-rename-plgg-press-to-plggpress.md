---
created_at: 2026-07-01T21:34:12+09:00
author: a@qmu.jp
type: refactoring
layer: [Config]
effort:
commit_hash:
category:
depends_on: [20260701213411-reimplement-plgg-press-on-plggmatic.md]
---

# Rename `plgg-press` → `plggpress`

## Overview

Mechanically rename the package from `plgg-press` to **`plggpress`** across the whole repo, completing the `plgg libraries → plggmatic → plggpress` naming. This is the **last** step: it runs after plgg-press has been reimplemented on `plggmatic` (ticket B) and carries **no behavior change** — the guide site builds and serves identically, only the name changes. Two prior renames in this repo (`plgg-http-router → plgg-server`, `plgg-http-client → plgg-fetch`) are the exact procedure to mirror.

## Policies

- `workaholic:planning` / `policies/terminology.md` — **"plggpress"** replaces "plgg-press" as the single Ubiquitous-Language term everywhere it appears (name, bin, alias, imports, scripts, CI, docs); one word per concept, applied consistently and completely.
- `workaholic:implementation` / `policies/directory-structure.md` — the package directory and its self-alias must match the new name so files are still found by structure; the path-alias/bundle-prefix conventions are preserved.
- `workaholic:operation` / `policies/ci-cd.md` — update CI (`deploy-guide.yml`) and the canonical runner scripts so the pipeline stays reproducible under the new name; no bespoke scripts added.
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`@ts-ignore`; the rename must not introduce relative cross-package imports (keep the alias).
- `plgg-coding-style` (skill) — printWidth 50; specs stay green.

Repo constraints: `.workaholic/constraints/architecture.md` (package-name path-alias + upward-only deps preserved), `.workaholic/constraints/quality.md` (tsc + tests green after rename).

## Key Files

In-package rename surface (`packages/plgg-press` → `packages/plggpress`):

- Directory `packages/plgg-press/` → `packages/plggpress/`.
- `package.json` — `name: "plgg-press"` → `"plggpress"`; `bin` key `plgg-press` → `plggpress`.
- `bin/plgg-press.mjs` → `bin/plggpress.mjs` (launcher path) and `bin/hook.mjs` — self-alias `prefix = "plgg-press/"` → `"plggpress/"`.
- `bundle.config.ts` — `alias.prefix "plgg-press"` → `"plggpress"`.
- `tsconfig.json` — `paths { "plgg-press/*" }` → `{ "plggpress/*" }`.
- All `src/**` self-alias specifiers `plgg-press/<sub>` → `plggpress/<sub>`.

Non-source repo surface (11 files named in source discovery):

- `scripts/build.sh` (build ordering entry), `scripts/check-all.sh`, `scripts/gate-vite.sh`, `scripts/serve-guide.sh`.
- `scripts/test-plgg-press.sh` → `test-plggpress.sh`, `scripts/coverage-plgg-press.sh` → `coverage-plggpress.sh` (file renames + internal references).
- `.github/workflows/deploy-guide.yml`.
- `workloads/guide/{Dockerfile,compose.yaml,dev-entrypoint.sh,README.md}` (all four reference `plgg-press` — the Dockerfile too, per `git grep -l "plgg-press" -- workloads`).
- `docs/plgg-press-migration/spike-decisions.md` (and the `docs/plgg-press-migration/` dir name if renamed).

Consumer:

- `packages/guide/package.json` — dep `plgg-press` → `plggpress`; the two `plgg-press dev`/`plgg-press build` npm scripts.
- `packages/guide/site.config.ts` — `import { defineSite } from "plgg-press"` → `"plggpress"`.

## Related History

- [20260528193320-rename-plgg-http-router-to-plgg-server.md](.workaholic/tickets/archive/work-20260528-143038/20260528193320-rename-plgg-http-router-to-plgg-server.md) — **the procedure to mirror**: package.json name, `file:` deps, script/CI rewiring, build-order updates.
- [20260528193321-rename-plgg-http-client-to-plgg-fetch.md](.workaholic/tickets/archive/work-20260528-143038/20260528193321-rename-plgg-http-client-to-plgg-fetch.md) — second rename precedent.
- Depends on ticket B (reimplementation on `plggmatic`) landing green first.

## Implementation Steps

1. `git mv packages/plgg-press packages/plggpress`; rename `bin/plgg-press.mjs` → `bin/plggpress.mjs`.
2. Update in-package config: `package.json` name+bin, `bundle.config.ts` alias, `tsconfig.json` paths, `bin/hook.mjs` prefix.
3. Rewrite all `src/**` self-alias `plgg-press/` specifiers → `plggpress/` (exact-string, verify no stragglers).
4. Update the consumer: `packages/guide/package.json` dep + scripts, `packages/guide/site.config.ts` import.
5. Rename + update the runner scripts (`test-/coverage-plgg-press.sh`), and update references in `build.sh`, `check-all.sh`, `gate-vite.sh`, `serve-guide.sh`.
6. Update CI (`deploy-guide.yml`) and `workloads/guide/*`; update the `docs/plgg-press-migration/` references (and dir name).
7. Reinstall `file:` deps as needed so the guide resolves `plggpress`; run the renamed `scripts/test-plggpress.sh` + `scripts/coverage-plggpress.sh`, then `scripts/check-all.sh` (whose `test-plgg-press.sh` line must be updated in step 5 — NOTE `tsc-plgg.sh`/`test-plgg.sh` cover `packages/plgg` only).
8. Build + dev-serve the guide; confirm output is identical to pre-rename.

## Quality Gate

**Acceptance criteria:**
- **Zero occurrences of the old name remain** (outside archived tickets/CHANGELOG history): `git grep -n "plgg-press"` returns nothing in `packages/`, `scripts/`, `.github/`, `workloads/`, `docs/` (allowing intentional historical mentions only where a changelog requires them).
- The package resolves as `plggpress` (name, bin `plggpress`, alias `plggpress/*`); the guide depends on and invokes `plggpress`.
- **No behavior change:** the guide's built output is byte-identical to pre-rename; `dev` serves and live-reloads.
- All specs green; coverage ≥90%; no `as`/`any`/`@ts-ignore`; no relative cross-package imports introduced.

**Verification method:**
- `git grep -n "plgg-press" -- packages scripts .github workloads docs` is empty (or only sanctioned historical references).
- `scripts/test-plggpress.sh` + `scripts/coverage-plggpress.sh` (renamed) green ≥90%; `scripts/check-all.sh` green end-to-end under the new name.
- Guide build output diff (pre vs post rename) is empty; `plggpress build`/`plggpress dev` run from the guide.

**Gate:** old name fully gone, `plggpress` resolves end-to-end (bin + alias + guide), guide output byte-identical, tsc + tests green ≥90%, no escape hatch — before approval.

## Considerations

- **Do it atomically.** A half-applied rename leaves an unresolvable alias/bin; land the whole surface (in-package + scripts + CI + consumer) in one commit, following the prior rename tickets (`packages/plgg-press` → everywhere).
- **`file:` dep reinstall.** The guide's `node_modules/plgg-press` symlink must be replaced with `plggpress`; reinstall so resolution + the clean-runner CI both see the new name (`packages/guide/package.json`).
- **Build ordering unchanged.** Only the name changes in `scripts/build.sh`; the position (after `plggmatic`, which is after the plgg libs) stays (`scripts/build.sh`).
- **Docs dir.** `docs/plgg-press-migration/` may also want renaming; decide whether to rename the dir or keep it as historical record and only update forward-looking references.
- **Archived tickets keep the old name** — do not rewrite history under `.workaholic/tickets/archive/`.
- **UPDATE (2026-07-02): dev is gone by the time this runs.** Tickets `20260702041500`/`20260702041501` remove plgg-press's `dev.ts`/`dev` command before this rename; the guide's `dev` script will be `plgg-bundle dev`, not `plgg-press dev`. So the rename surface has ONE guide npm script (`build`), and the gate clauses "`plggpress dev` run from the guide" / "`dev` serves and live-reloads" reduce to: the `plgg-bundle dev` setup still resolves the renamed `plggpress` dev entry (whatever module 041501 pointed it at) and still serves. Verify against the tree as it actually is when driving.
