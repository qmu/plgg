---
created_at: 2026-06-27T21:01:48+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, DB]
effort:
commit_hash: bcc3ef4
category: Added
depends_on: [20260627210147-domain-models.md]
---

# Implement the migration-file parser, filesystem ACL, and MigrationDir

## Overview

Turn migration files on disk into the domain `MigrationDir`. The parser
(`parseMigration`) is pure and exhaustively testable with no filesystem; the only
I/O is isolated in `vendors/fs.ts`, which `readMigrations` composes with
`parseMigration` to build the ordered, unique-checked `MigrationDir`. (The pure
`planMigrations` diff is in the apply/dry-run ticket, where it sits with
`listApplied`.)

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — pure logic in
  `src/domain/usecase/`; the `node:fs` boundary in `src/vendors/fs.ts`
  (anti-corruption layer).
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; `unknown` → validated `Migration`; ternaries over `if`;
  Prettier printWidth 50.
- `workaholic:implementation` / `policies/functional-programming.md` —
  `parseMigration` is pure, returning `Result`; no `throw`.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — no
  `usecase` reaches for `node:fs` directly; parsing stays testable without a
  filesystem.
- `workaholic:implementation` / `policies/test.md` — table-test the parser
  (up-only, up+down, missing-up error, `transaction:false` directive,
  CRLF/whitespace tolerance) and `MigrationDir` construction (duplicate/unordered
  → error); coverage > 90%.

## Trip Origin

`.workaholic/trips/plgg-db-migration/designs/design-v2.md` §2.1 (the dbmate-style
up/down parser; body kept whole, no `;`-splitting) and §1.3/§4 ticket 3
(`parseMigration`, `vendors/fs.ts`, `readMigrations`, `MigrationDir`), with the
filesystem-seam boundary from `models/model-v1.md` §4 (Boundary 3).

## Key Files

- `packages/plgg-bundle/src/vendors/runner.ts`,
  `packages/plgg-bundle/src/domain/usecase/discoverWorkspace.ts` - precedent for
  a `node:fs`/`node:path` ACL in `vendors/` feeding pure domain usecases.
- `packages/plgg-db-migration/src/domain/model/` - `Migration`, `MigrationDir`,
  `Version`, `Plan`, `SchemaMigrations`, `MigrationError` from the models ticket.

## Implementation Steps

1. `parseMigration(text: SoftStr): Result<{ up: SoftStr; down: Option<SoftStr>;
   upTransaction: Bool; downTransaction: Bool }, MigrationError>` — scan for the
   `-- migrate:up` / `-- migrate:down` marker lines (tolerant of surrounding
   whitespace; keyword case-sensitive); body before/after the markers; honor a
   `transaction:false` directive on a marker line. Missing `-- migrate:up` →
   `Err`. Missing down → `None`.
2. `vendors/fs.ts` — `node:fs`/`node:path` ACL: list a migrations directory,
   read a file's text, write a file (for `newMigration`). Returns
   `PromisedResult` folding fs rejections into `MigrationError`.
3. `readMigrations(dir): PromisedResult<MigrationDir, MigrationError>` — list →
   filter `*.sql` → parse filename into `Version` + `name` → `parseMigration`
   each → build the ordered, unique-checked `MigrationDir`.
4. Unit tests per Implementation Policy `test.md`; coverage > 90%.

## Considerations

- **Statement splitting is out of scope** here: migration bodies are applied as
  a single trusted script via `plgg-sql`'s `execScript`/`runScript` (see the
  apply ticket), so the parser keeps the body text whole and does **not** split
  on `;` — this avoids the string-literal/`BEGIN…END` hazard
  (`packages/plgg-db-migration/src/domain/usecase/parseMigration.ts`).
- Duplicate/unordered-version detection belongs to `MigrationDir`'s construction,
  so the planner (in the apply ticket) can assume a clean ordered input
  (`packages/plgg-db-migration/src/domain/usecase/readMigrations.ts`).
