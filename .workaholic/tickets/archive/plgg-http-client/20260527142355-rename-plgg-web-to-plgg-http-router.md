---
created_at: 2026-05-27T14:23:55+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Config]
effort: 0.5h
commit_hash: 704e9d6
category: Changed
---

# Rename `plgg-web` → `plgg-http-router`

## Overview

`plgg-web` is really the server-side HTTP **router**. Rename it to
`plgg-http-router` so it is symmetric with the new `plgg-http-client` (added in a
sibling ticket). This rename is scoped to **this worktree/branch only** — `main`
and the other experimental worktrees intentionally still see `plgg-web`. Do this
ticket **before** the `plgg-http-client` ticket, since the client reuses the
router's HTTP model.

No behaviour change — pure rename. Leave **zero** `plgg-web` references behind.

## Key Files

- `src/plgg-web/` - the package directory to `git mv` to `src/plgg-http-router`.
- `src/plgg-web/package.json` - `name` + `description`.
- `src/plgg-web/tsconfig.json` - `paths` key `"plgg-web*"`.
- `src/plgg-web/vite.config.ts` - `resolve.alias` key + `build.lib.name`.
- `src/plgg-web/example.ts`, `src/plgg-web/src/**/*.spec.ts` - import specifiers
  `"plgg-web/index"`.
- `src/plgg-web/README.md`, root `README.md`, `CHANGELOG.md` - name/headings.
- `sh/tsc-plgg-web.sh`, `sh/test-plgg-web.sh`, `sh/tsc-watch-plgg-web.sh`,
  `sh/test-watch-plgg-web.sh` - rename files + update `cd src/plgg-web` bodies.
- `sh/check-all.sh`, `sh/npm-install.sh`, `sh/build.sh` - update references.

## Implementation Steps

1. `git mv src/plgg-web src/plgg-http-router` (preserve history).
2. `package.json`: `name` `plgg-web` → `plgg-http-router`; update `description`.
3. `tsconfig.json`: `paths` key `"plgg-web*"` → `"plgg-http-router*"`.
4. `vite.config.ts`: `resolve.alias` key + `build.lib.name` `plgg-web` →
   `plgg-http-router`.
5. `example.ts` and every `*.spec.ts`: `"plgg-web/index"` →
   `"plgg-http-router/index"`.
6. `README.md` (package + root) and `CHANGELOG.md`: update name/headings.
7. Rename the four `sh/*-plgg-web.sh` scripts to `*-plgg-http-router.sh` and
   update their `cd $REPO_ROOT/src/plgg-web` bodies to `src/plgg-http-router`.
8. Update references in `sh/check-all.sh`, `sh/npm-install.sh`, `sh/build.sh`.
9. Verify: `sh/tsc-plgg-http-router.sh` and `sh/test-plgg-http-router.sh` green;
   `grep -rn "plgg-web"` across the repo returns zero hits.

## Considerations

- Scoped to this branch only — do **not** assume the rename exists on `main` or
  the other worktrees (`src/plgg-web` still exists there).
- After landing, the maintainer will refresh the `project-plgg-web` agent memory
  note to the new name — not part of this ticket.
- `npm install` may be needed in this worktree before scripts run (worktrees
  share `.git` but not per-package `node_modules`).

## Final Report

Development completed as planned. Pure rename via `git mv` (history preserved —
git tracked all 40 source files as renames). `tsc` clean, 87/87 tests pass, zero
`plgg-web` references in live code.

### Discovered Insights

- **Insight**: `vite.config.ts` is itself a `.ts` file under the package dir, so a
  blanket `plgg-web`→`plgg-http-router` substitution across `*.ts` already covers
  the `resolve.alias` key and `build.lib.name` — no separate config edit needed.
  **Context**: The ticket listed `vite.config.ts` as a distinct step, but the
  source-file sweep subsumes it; double-editing would have been a no-op conflict.
- **Insight**: `plgg-web` still appears ~15 times under `.workaholic/`
  (stories/release-notes/concerns/archived tickets) and was deliberately left
  intact. These are immutable records of PR #31 referencing pinned commit SHAs;
  the verification grep in step 9 must be scoped to live code (`src sh README`),
  not the whole repo, or it falsely flags history.
  **Context**: Future renames in this repo should treat `.workaholic/` archives as
  append-only history, never find-replace targets.
- **Insight**: This worktree had no `node_modules` and no `src/plgg/dist`. The
  router's `tsc`/`vitest` resolve `plgg` through a `file:` dep that points at
  `dist/`, so `npm install` + `npm run build` in `src/plgg` is a prerequisite
  before the router scripts will run green.
  **Context**: Same dist-rebuild gotcha recorded in PR #31's concerns; applies to
  every fresh worktree.
