---
created_at: 2026-07-02T22:46:10+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain, DB]
effort:
commit_hash: 4ec5d51
category: Changed
depends_on: []
---

# Sanitize the `newMigration` name so it can't escape the migrations directory

## Overview

**Security — path traversal in migration scaffolding (Low).**

`newMigration(dir, name, now)` interpolates `name` straight into the output
filename and `join`s it onto `dir` with no sanitization
(`packages/plgg-db-migration/src/domain/usecase/newMigration.ts:41-47`):

```ts
writeFileText(
  joinPath(dir, `${formatTimestamp(now)}_${name}.sql`),
  SKELETON,
);
```

`joinPath` is `node:path` `join` (`src/vendors/fs.ts:28-31`), and `writeFileText`
creates parent directories recursively. A `name` containing `../` therefore
writes the scaffold file **outside** `migrationsDir`. The value reaches here from
the CLI positional argument: `run` → `runNew(config, name)` →
`newMigration(config.migrationsDir, name, …)`
(`src/entrypoints/cli.ts:196-210`, positional parsed at `:305-309`).

## Vulnerability detail

- **Severity:** Low (developer-run CLI; the written content is a fixed, harmless
  up/down skeleton; the operator is already trusted). Elevated if an app exposes
  the public `newMigration` export to non-operator input.
- **Class:** Path traversal (CWE-22).
- **Location:** `packages/plgg-db-migration/src/domain/usecase/newMigration.ts:41-47`;
  sink `joinPath` at `src/vendors/fs.ts:28-31`; reached from
  `src/entrypoints/cli.ts:196-210` / `:305-309`.
- **Exploit:** `migrate new "../../../home/ec2-user/.config/evil"` writes
  `.../evil.sql` outside `migrationsDir`, creating parent directories along the
  way.

## Fix direction

Reject or normalize `name` before building the filename so it is always a single
safe path segment:

- Validate `name` against a safe charset (e.g. `/^[A-Za-z0-9_-]+$/`, optionally
  length-bounded) and return a `MigrationError` (not throw) on violation — this
  keeps the usecase failure-as-value and gives the CLI a clean error to render.
- Alternatively/additionally `path.basename(name)` as defense-in-depth, but a
  hard reject is preferred so the operator gets a clear message rather than a
  silently-relocated file.
- Surface the rejection through the existing `render(..., err)` CLI path.

House style: keep the `PromisedResult` return, **no `as` / `any` / `ts-ignore`**,
Prettier `printWidth: 50`.

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — validation stays
  value-level; strict no-escape-hatch rule; Prettier 50.
- `workaholic:implementation` / `policies/functional-programming.md` — an invalid
  name folds to a `MigrationError` returned from `newMigration`, never a throw or
  a silently-relocated write.
- `workaholic:implementation` / `policies/test.md` — the traversal-rejection test
  is the proof; coverage must stay > 90% on all four axes.

## Quality Gate

**Verification method** — unit test on `newMigration` (inject a fixed `now`)
asserting a `name` of `"../evil"` (and `"a/b"`, `"..", "with space"`) returns an
`Err` `MigrationError` and writes **no** file, while a clean name like
`"add_users"` returns `Ok` with the expected
`<dir>/<timestamp>_add_users.sql` path. A CLI-level test that `migrate new
"../x"` prints the error and exits non-zero (or the existing `fail`/`render`
error path is taken) is a bonus.

**Acceptance criteria (objective, all must hold):**
1. `scripts/tsc-plgg.sh` clean; zero `as`/`any`/`ts-ignore` in the diff.
2. `scripts/test-plgg.sh` passes with the new rejection/acceptance cases.
3. A `name` containing `..`, `/`, or `\` never produces a write outside
   `migrationsDir` (proven by the "no file written" assertion).
4. Coverage for `plgg-db-migration` stays > 90%.
5. Rejection returns a `MigrationError` value; the CLI renders it as an error,
   not a stack trace.

**Edge cases:** `..`, `../x`, `a/b`, `a\\b`, leading `.`, empty string, a name
that is already safe (accepted), and the timestamp prefix remaining intact.

**Division of assurance:** the fix is confined to `newMigration` input
validation (with an optional CLI-render assertion); the fixed `SKELETON` content
and `writeFileText` seam are unchanged.

## Notes

Found during a repository-wide security review (2026-07-02). Companion (higher
severity) ticket: the `TenantId` brand path-safety hardening
(`TenantId.ts:24-25`).
