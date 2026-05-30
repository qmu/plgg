---
created_at: 2026-05-29T19:07:06+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort: 2h
commit_hash: bb83da9
category: Changed
depends_on:
---

# Rename repo-root `sh/` → `scripts/` and `src/` → `packages/`

## Overview

Rename the two top-level directories — `sh/` → `scripts/` (the dev/build/test
shell scripts) and `src/` → `packages/` (the nine standalone npm packages) — and
update **every** reference so the build, type-check, tests, CI, and tooling keep
working and **no path reference is left stale anywhere** (the developer chose to
fix all living docs "perfectly").

This is a pure structural relabel: **no runtime or library behavior changes, no
public API changes**. The success signal is "identical green gate, new directory
names." It mirrors the established package-rename playbook (`plgg-web →
plgg-http-router → plgg-server`, `plgg-http-client → plgg-fetch`) but inverts a
few steps because it renames the **container** directories, not a package.

### The one critical rule: two distinct meanings of `src/`

There are two `src/` in this repo and only **one** is being renamed:

- **Repo-root `src/<pkg>`** (the package container) → **rename to `packages/`**.
  This is what appears as `$REPO_ROOT/src/<pkg>`, `cd src/<pkg>`,
  `[src/plgg/](src/plgg/)`, `working-directory: src/plgg`, `npx tsx
  src/plgg-x/example.ts`.
- **Package-internal `src/`** (each package's own source dir, e.g.
  `packages/plgg/src/index.ts`) → **KEEP verbatim**. This is what appears as
  `entry: "src/index.ts"` / `"src/client.ts"` in vite configs, `"paths": {
  "plgg*": ["./src/*"] }` and `include: ["src/**/*"]` and `rootDir: "src"` in
  tsconfigs, `tsx src/server.ts` in the example's serve script, and import
  barrels. After the rename, `src/plgg/src/index.ts` becomes
  `packages/plgg/src/index.ts` — **only the first segment changes**.

A naive recursive find/replace of `src/` would corrupt every tsconfig path, vite
config, and barrel. Match **repo-root-prefixed** occurrences only.

### Atomicity

The directory moves and all reference rewrites must land in **one commit** so npm
install / CI / the dev loop never sees a half-renamed tree. Use `git mv` (not
delete+add) for both dirs to preserve file history and the executable bit on the
~40 scripts.

## Key Files

### The directory moves
- `sh/` → `scripts/` via `git mv sh scripts` (~40 scripts move with their exec
  bits and history).
- `src/` → `packages/` via `git mv src packages` (9 package dirs:
  `example`, `plgg`, `plgg-fetch`, `plgg-foundry`, `plgg-kit`, `plgg-router`,
  `plgg-server`, `plgg-sql`, `plgg-view`).

### Shell scripts (now under `scripts/`) — internal path edits
- Every per-package script (`tsc-*/test-*/tsc-watch-*/test-watch-*` for the 9
  packages, plus `coverage-plgg.sh`, `publish-plgg.sh`): rewrite the body
  `cd $REPO_ROOT/src/<pkg>` → `cd $REPO_ROOT/packages/<pkg>`. `$REPO_ROOT` is
  `git rev-parse --show-toplevel`, robust to the move — only the `src/` segment
  changes.
- `scripts/build.sh` — `cd $REPO_ROOT/src/<pkg>` lines (plgg, plgg-kit,
  plgg-view, plgg-router, plgg-server, plgg-fetch, plgg-sql) → `packages/`, plus
  the descriptive `echo` listing.
- `scripts/npm-install.sh` — all `cd $REPO_ROOT/src/<pkg>` → `packages/`, plus
  its `echo` listing.
- `scripts/check-all.sh` — the **only** script with a hardcoded `./sh/` prefix:
  rewrite `./sh/build.sh` and every `./sh/test-*.sh` → `./scripts/...`.
- `scripts/menu.sh` — **no content edit needed** (resolves its own dir via
  `$SCRIPT_DIR` from `BASH_SOURCE`, auto-discovers siblings by glob). It just
  moves with the dir.

### CI — breaks unless updated
- `.github/workflows/run-tests.yml` — `cache-dependency-path:
  'src/plgg/package-lock.json'` → `packages/plgg/...`, and every
  `working-directory: src/plgg` step (install / tsc / test / build / coverage,
  ~5+ occurrences) → `packages/plgg`. Confirm `release.yml`,
  `prepare-release.yml`, `start-pull-request.yml` have no `src/`/`sh/` literals
  (scan showed none).

### Project instruction + user-facing docs
- `CLAUDE.md` — `sh/tsc-plgg.sh` → `scripts/tsc-plgg.sh`; `sh/test-plgg.sh` →
  `scripts/test-plgg.sh` (the literal commands the agent is told to run).
- `README.md` (root) — package links `[src/plgg/](src/plgg/)` etc. (≈ lines
  75, 81-87, 281-305), sub-README links, and the command block listing
  `sh/npm-install.sh`, `sh/tsc-plgg.sh`, `sh/test-plgg.sh`, `sh/coverage-plgg.sh`,
  `sh/build.sh`, `sh/check-all.sh`, the per-package `sh/test-*.sh` → `scripts/`,
  package paths → `packages/`.
- Per-package READMEs with **repo-root** `src/`/`sh/` refs:
  `packages/plgg-fetch/README.md` (lines ≈99-100 `npx tsx src/plgg-*/example.ts`,
  106-107 `sh/*-plgg-fetch.sh`; KEEP the package-local `src/Http/usecase/seam.ts`
  at ≈77), `packages/plgg-sql/README.md` (≈46 `npx tsx src/plgg-sql/example.ts`;
  KEEP `../example` at ≈50), `packages/example/README.md` (≈77 `cd src/example`;
  KEEP `src/example/src/` ≈16 and `tsx src/server.ts` ≈80),
  `packages/plgg-view/README.md` (≈110 `cd src/plgg-view`, ≈128 `in src/plgg`).

### `.workaholic/` LIVING docs — update ALL (developer-confirmed "all of them perfectly")
Update every repo-root `src/`/`sh/` path literal to `packages/`/`scripts/` (apply
the two-`src/`-meanings rule: `src/plgg/src/...` → `packages/plgg/src/...`) in:
- **constraints/**: `architecture.md`, `quality.md`, `project.md` (these encode
  machine-checkable criteria like `sh/tsc-plgg.sh`, `git grep ... src/`,
  tsconfig/vite paths — stale paths silently disable gates).
- **specs/**: `infrastructure.md` (the canonical layout doc — file-system tree,
  per-package layout, install/build/publish snippets, script-inventory table,
  **both mermaid diagrams** `sh["sh/"]`/`src["src/"]`), `application.md`,
  `component.md`, `data.md`, `feature.md`, `model.md`, `project-context.md`,
  `quality-context.md`, `usecase.md`, `ux.md`.
- **policies/**: `accessibility.md`, `delivery.md`, `observability.md`,
  `quality.md`, `recovery.md` (e.g. `sh/publish-plgg.sh`), `security.md`,
  `test.md`.
- **terms/**: `artifacts.md`, `core-concepts.md`, `file-conventions.md`,
  `workflow-terms.md`.
- **DO NOT TOUCH** the append-only history: `.workaholic/tickets/**` (including
  this ticket once archived), `.workaholic/stories/**`,
  `.workaholic/release-notes/**`, and `.workaholic/concerns/**` (historical
  notes, some with the long-stale `plgg-web` name) — these record what was true
  when written.

## Related History

- [20260528193320-rename-plgg-http-router-to-plgg-server.md](.workaholic/tickets/archive/work-20260528-143038/20260528193320-rename-plgg-http-router-to-plgg-server.md) — The most detailed rename precedent (19-step plan): `git mv` for blame, the script rename + `cd`-body edit, the `build.sh`/`check-all.sh`/`npm-install.sh` aggregator sweep, dist rebuild in dependency order, and the live-code-only verification grep. The procedure this ticket adapts.
- [20260528193321-rename-plgg-http-client-to-plgg-fetch.md](.workaholic/tickets/archive/work-20260528-143038/20260528193321-rename-plgg-http-client-to-plgg-fetch.md) — Second application of the playbook; warns that a blanket token-swap is only safe for a **unique** token. `src`/`sh` are NOT unique (high collision risk) — hence the repo-root-prefix-only rule above.
- [20260527142355-rename-plgg-web-to-plgg-http-router.md](.workaholic/tickets/archive/plgg-http-client/20260527142355-rename-plgg-web-to-plgg-http-router.md) — Original precedent; documented the dist-rebuild gotcha (`file:` deps resolve through `dist/`; fresh trees need `npm install` + build in dependency order) and the append-only `.workaholic/` policy.

## Implementation Steps

1. **Move the directories** (one commit, `git mv` for history + exec bits):
   `git mv sh scripts` and `git mv src packages`.
2. **Rewrite script bodies.** In every `scripts/*.sh`, replace `$REPO_ROOT/src/`
   → `$REPO_ROOT/packages/` (and any `cd src/<pkg>`). In `scripts/check-all.sh`
   replace `./sh/` → `./scripts/`. Fix the `echo` listings in `build.sh` and
   `npm-install.sh`. Leave `menu.sh` untouched. A targeted sed is safe **only**
   on the repo-root-prefixed pattern (e.g. `s#\$REPO_ROOT/src/#$REPO_ROOT/packages/#g`,
   `s#\./sh/#./scripts/#g`) — never a bare `src`/`sh` swap.
3. **Update CI.** In `.github/workflows/run-tests.yml`, `src/plgg` →
   `packages/plgg` for `cache-dependency-path` and every `working-directory`.
   Grep the other three workflows to confirm no path literals.
4. **Update CLAUDE.md** — the two `sh/*-plgg.sh` command paths → `scripts/`.
5. **Update READMEs** — root `README.md` (package links, sub-README links,
   command block) and the four per-package READMEs with repo-root refs. Apply the
   two-`src/`-meanings rule; KEEP package-local `src/` inside example/fetch/sql.
6. **Update ALL `.workaholic/` living docs** (constraints, specs, policies,
   terms) listed in Key Files. For each, rewrite repo-root `src/<pkg>` →
   `packages/<pkg>` (so `src/plgg/src/` → `packages/plgg/src/`, inner `src/`
   intact) and `sh/<script>` → `scripts/<script>`. Update `infrastructure.md`'s
   tree, snippets, table, and both mermaid diagrams. Do NOT touch
   tickets/stories/release-notes/concerns.
7. **Reinstall + rebuild.** Run `scripts/npm-install.sh` to repoint
   `node_modules` symlinks (the `file:../` specs are sibling-relative and survive
   the move, so no `package.json` dep edits are needed), then build in dependency
   order (`scripts/build.sh`).
8. **Verify** (see below). Fix any breakage with proper paths — never an
   `as`/`any`/`@ts-ignore` to paper over a path error.

## Patches

> No patches — the work is `git mv` + mechanical, rule-bound path rewrites across
> scripts, CI, docs, and `.workaholic/` living docs. The two-`src/`-meanings rule
> is the crux; see Implementation Steps.

## Considerations

- **Two `src/` meanings (the #1 risk).** Only repo-root-prefixed `src/<pkg>`
  flips to `packages/`; each package's internal `src/` (tsconfig `./src/*` /
  `rootDir: "src"` / `include: ["src/**/*"]`, vite `entry: "src/..."`, barrels,
  `tsx src/server.ts`) stays. A bare recursive `src/` replace would corrupt the
  build. (every package's `tsconfig.json`/`vite.config.ts`)
- **`file:../` deps survive the move.** All inter-package deps are
  sibling-relative (`file:../plgg`, `file:../plgg-server`, …); since every sibling
  moves together inside the renamed parent, the spec values stay valid — **no
  `package.json` dependency edits**. A `scripts/npm-install.sh` reinstall is still
  prudent to rebuild `node_modules` symlinks cleanly.
- **CI is the highest-risk non-script surface.** `run-tests.yml` hardcodes
  `src/plgg` in `cache-dependency-path` + ~5 `working-directory` steps; it breaks
  on first push if missed (the package renames never had to touch CI).
- **`menu.sh` needs no edit** (BASH_SOURCE-relative `$SCRIPT_DIR`, glob
  auto-discovery). **`check-all.sh` is the only script with a hardcoded `./sh/`
  prefix.**
- **Atomicity.** Moves + all rewrites in one commit; scripts internally
  `cd $REPO_ROOT/src/<pkg>` and `check-all.sh` calls `./sh/…`, so a half-state
  breaks the dev loop and CI. `git mv` (not rm+add) to keep history + exec bits.
- **`.workaholic/` scope.** Update all **living** docs
  (constraints/specs/policies/terms) — they include machine-checkable criteria
  (`sh/tsc-plgg.sh`, `git grep … src/`, coverage/tsconfig paths) that silently
  stop checking if left stale. **Never** touch the append-only history
  (tickets/stories/release-notes/concerns). `infrastructure.md` is additionally
  drifted (says 4 packages/20 scripts vs current 9/~40) — this ticket fixes the
  path tokens; broader content refresh of that doc is optional and may be flagged
  for a follow-up.
- **No root workspace config.** There is no root `package.json`/`tsconfig`/npm
  workspace, so there is no central `src/*` glob to update — references are
  distributed across ~40 scripts, 1 CI workflow, CLAUDE.md, 5 READMEs, and ~24
  `.workaholic/` living docs.
- **Layer = [Config]/housekeeping.** No runtime/library behavior change; the exit
  bar is "identical green gate, new names."

## Verification

After the rename and all rewrites:
- `scripts/check-all.sh` passes end-to-end (builds in dependency order, then all
  9 package test suites + example): `tsc` clean everywhere, all tests pass,
  `plgg` coverage ≥90% on statements/branches/functions/lines via
  `scripts/coverage-plgg.sh`.
- Zero new escape hatches: `git grep -nE 'as any|@ts-ignore| as .*[A-Z]' packages/`
  clean.
- No stale repo-root references remain in live surfaces: grep `README.md`,
  `CLAUDE.md`, `.github/`, `scripts/`, and `.workaholic/{constraints,specs,policies,terms}`
  for repo-root `src/` and `sh/` patterns → zero hits (excluding package-internal
  `src/` and the append-only history dirs).
- `file:../` links resolve (`scripts/npm-install.sh` installs cleanly).
- CI `run-tests.yml` is green on the `packages/plgg` working dir.

## Open Questions (decide during implementation, document in Final Report)

- **`infrastructure.md` content drift** (4 pkgs/20 scripts vs 9/~40): fix only the
  path tokens here, or also refresh counts/diagrams? Recommend path tokens now,
  flag a content refresh as a follow-up to keep this ticket a clean rename.
- **`sed` vs manual edits for `.workaholic/` docs**: a rule-bound `sed` on the
  repo-root-prefixed pattern is efficient across ~24 docs, but each doc must be
  re-read after to confirm no package-internal `src/` was caught. Recommend
  scripted replace + per-file diff review.

## Final Report

Completed the rename via `git mv sh scripts` + `git mv src packages` (git
recorded **446 renames** with history preserved, **45 renamed-and-edited**, **27
modified-in-place**). All references updated: ~40 scripts (`$REPO_ROOT/src/` →
`packages/`, `check-all.sh`'s `./sh/` → `./scripts/`), `.github/workflows/run-tests.yml`
(`working-directory`/`cache-dependency-path` → `packages/plgg`), `CLAUDE.md`,
root + 4 per-package READMEs, and **all 24 `.workaholic/` living docs**
(constraints/specs/policies/terms). Append-only history (tickets/stories/
release-notes/concerns) left untouched.

**Verification**: `scripts/npm-install.sh` clean, `scripts/check-all.sh` green
end-to-end (build in dependency order + all 9 suites + example, 43 tests),
`plgg` coverage 98.0/92.5/97.5/97.9% (≥90%), zero stale repo-root `src/`/`sh/`
references in any live surface, package-internal `src/` preserved everywhere.

### Open questions resolved
- **`infrastructure.md` content drift** — fixed path tokens only (4-packages/20-scripts
  counts left as-is); a content refresh of that doc's stale counts/inventory is a
  separate follow-up, kept out to preserve a clean rename.
- **`sed` vs manual** — used a hybrid: a rule-bound replace (`src/plgg`,
  `src/example`, `\bsh/`) across the bulk, then surgical Read+Edit for the files
  mixing both `src/` meanings (`infrastructure.md` trees/mermaid, and the bare
  `src/` dir-refs in `quality.md`/`component.md`/`file-conventions.md`).

### Discovered Insights

- **Insight**: This shell is **zsh**, which does **not** word-split unquoted
  parameter expansions (`for f in $FILES` / `grep … $FILES` ran with the whole
  list as a single argument and silently no-op'd). Multi-file loops must use a
  `while IFS= read -r` over a heredoc (or `${=VAR}`/an array), not bare `$VAR`
  splitting. A blind sed loop appeared to succeed while changing nothing — always
  verify with a post-grep.
  **Context**: Affects any future scripted sweep run through the Bash tool here.
- **Insight**: `git mv` of a **directory** does a real filesystem rename, so it
  moves untracked/ignored contents too (`node_modules/`, `dist/`) and the
  **relative** `file:../` symlinks (e.g. `packages/plgg-server/node_modules/plgg
  -> ../../plgg`) keep resolving because every sibling moved together. No
  `package.json` `file:` spec edits were needed; `npm-install` was only a
  belt-and-braces resolve.
  **Context**: Confirms the discovery's claim that sibling-relative deps survive a
  container rename — the rename's blast radius was references, not dependency wiring.
- **Insight**: The two-`src/`-meanings rule is real and load-bearing — repo-root
  `src/<pkg>` renames, package-internal `src/` (tsconfig `./src/*`, vite
  `entry:"src/…"`, `tsx src/server.ts`, `src/index.ts` barrels, `src/Http/…`)
  stays. The safe scripted pattern is `src/plgg` + `src/example` (package-name-
  prefixed), which leaves all package-internal `src/<CapitalSubdir>`/`src/index`
  untouched; bare dir-references (`under \`src/\``, tree `├── src/`, mermaid
  `src["src/"]`) needed individual handling.
  **Context**: `packages/*/tsconfig.json`/`vite.config.ts` — a naive recursive
  `src/`→`packages/` would have corrupted every build config.
- **Insight**: Pre-existing `as Str`/`as KebabCase`/`as Bool` casts live in
  `packages/plgg-foundry/src/Foundry/model/*` — they violate CLAUDE.md's escape-
  hatch prohibition but predate this ticket (no source `.ts` was touched here).
  The repo's quality gate (`git grep … packages/`) will now surface them; worth a
  separate cleanup ticket.
  **Context**: Flagged so they're not mistaken for regressions from this rename.

### Deferred
- Refreshing `infrastructure.md`/`component.md` stale package **counts** ("four"
  → nine) and the script-inventory table (20 → ~40) — content drift, not path
  tokens; a follow-up doc-refresh ticket.
- Cleaning up the pre-existing `as <Type>` casts in `plgg-foundry`.
