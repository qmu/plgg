---
created_at: 2026-06-24T14:17:05+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort:
commit_hash:
category:
depends_on: [20260624141656-u2-migrate-example.md, 20260624141657-u2-migrate-plgg-http.md, 20260624141658-u2-migrate-plgg-view.md, 20260624141659-u2-migrate-plgg-router.md, 20260624141700-u2-migrate-plgg-sql.md, 20260624141701-u2-migrate-plgg-fetch.md, 20260624141702-u2-migrate-plgg-server.md, 20260624141703-u2-migrate-plgg-kit.md, 20260624141704-u2-migrate-plgg-foundry.md]
---

# U3 — Clean lingering vitest from `plgg` + final repo-wide grep gate

## Overview

Final cleanup and acceptance gate for the trip. Two parts:

1. **Clean the already-migrated `plgg` package.** Although `plgg` runs on
   plgg-test, it still declares dead vitest artifacts: `vitest` +
   `@vitest/coverage-v8` in devDependencies, a dead `test: { coverage }`
   block in `vite.config.ts`, and the `/// <reference types="vitest" />`
   triple-slash line. Direction-v2 criterion 1 ("zero vitest references
   anywhere") includes `plgg`, so these must go.

2. **Final repo-wide grep gate** proving the trip's success criteria:
   zero `from "vitest"` / `vitest` references repo-wide, zero residual
   vitest config, and zero **new** `as`/`any`/`ts-ignore` introduced by
   the migration.

This ticket depends on ALL nine U2 package migrations.

**Trip Origin:** `.workaholic/trips/replace-vitest-with-plgg-test/designs/design-v2.md`
§6 (grep gates) + §7 (U3).

## Key Files

- `packages/plgg/package.json` — remove `vitest` +
  `@vitest/coverage-v8` from devDependencies (keep `plgg-test`).
- `packages/plgg/vite.config.ts` — remove the `test:` block and the
  `/// <reference types="vitest" />` line; keep `build`/`resolve`/
  `plugins`.
- (Repo-wide, read-only verification) all `packages/*/package.json`,
  `packages/*/vite.config.ts`, all `*.spec.ts`.

## Implementation Steps

1. Strip the two vitest devDeps from `packages/plgg/package.json`.
2. Remove the `test:` block + vitest triple-slash from
   `packages/plgg/vite.config.ts`.
3. Run the grep gates (all must return empty):
   - `grep -rn 'from "vitest"' packages --include="*.ts"` → 0
   - `grep -rln '"vitest"\|@vitest/coverage-v8' packages/*/package.json`
     → 0
   - `grep -rn 'reference types="vitest"' packages/*/vite.config.ts` → 0
   - no residual `test:` block in any `vite.config.ts`
   - no NEW `as`/`any`/`@ts-ignore` in changed spec files vs baseline
4. Run `scripts/check-all.sh` (build in dependency order, then every
   `test-*.sh`) as the trip's final acceptance — must pass end-to-end.
5. Confirm `scripts/tsc-plgg.sh` clean.

## Considerations

- This is the trip's final GATE: the migration is "done" only when every
  grep gate is empty and `check-all.sh` is green.
- `plgg`'s `vite.config.ts` still drives `vite build` — only the `test:`
  block + triple-slash are removed, never the `build`/`resolve`/
  `plugins`.
- Do NOT delete any `vite.config.ts` file; the build needs it.
- No new escape hatches may be introduced by this cleanup.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` —
  per-package config stays at package root; no relocation.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; Prettier printWidth:50.
- `workaholic:implementation` / `policies/test.md` — the final gate
  proves coverage + assertions were preserved repo-wide.
- `workaholic:implementation` / `policies/command-scripts.md` — the
  acceptance runs through `scripts/check-all.sh` and the per-package
  scripts unchanged.
- `workaholic:operation` / `policies/ci-cd.md` — `check-all.sh` is the
  CI/deploy gate; it must stay green with the build-before-test ordering
  intact.
- `workaholic:implementation` / `policies/vendor-neutrality.md` —
  removing the last vitest references completes the dependency-
  sovereignty outcome.
- `workaholic:implementation` / `policies/type-driven-design.md` — the
  no-new-escape-hatch grep gate protects the type-driven guarantee.
- `workaholic:implementation` / `policies/functional-programming.md` —
  the repo ends on one house idiom (data-last `check`) end-to-end.
