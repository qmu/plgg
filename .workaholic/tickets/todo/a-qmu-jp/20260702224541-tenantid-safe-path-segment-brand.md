---
created_at: 2026-07-02T22:45:41+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain, DB]
effort:
commit_hash: ebbab75
category: Changed
depends_on: []
---

# Harden the `TenantId` brand into a safe per-tenant SQLite path segment

## Overview

**Security — path traversal / tenant isolation bypass (Medium).**

`TenantId` is documented as *"a branded tenant identifier for the on-demand
per-tenant SQLite path"* (`packages/plgg-db-migration/src/domain/model/TenantId.ts:11-16`)
— i.e. it is the safety boundary that lets a raw string be trusted as the
locator for a tenant's database file. But its refinement
(`TenantId.ts:24-25`) only checks `isSoftStr(v) && v.length > 0`, so it accepts
`../`, `/`, `\`, and NUL bytes. The validated id then flows **unchanged**:

- `asTenantId(unknown)` → `tenantIdString(id)` → the app-supplied
  `resolveTenantDb(id: TenantId)` seam
  (`src/domain/usecase/migrateTenant.ts:41-44`, invoked at `:146`), and
- as the in-process keyed-mutex key (`migrateTenant.ts:156`,
  `inFlight.get(tenantIdString(tenantId))` at `:178`).

A natural `resolveTenantDb` implementation —
`path.join(baseDir, tenantIdString(id) + ".sqlite")` — combined with a tenant id
of `../tenant-victim/db` resolves **outside** `baseDir`, letting tenant A open
and migrate tenant B's SQLite database (isolation bypass), or create/write
SQLite files at arbitrary filesystem locations. A `/`-bearing id also collides
the mutex key namespace. The package ships `TenantId` as the control for exactly
this threat and it does not uphold the contract.

## Vulnerability detail

- **Severity:** Medium
- **Class:** Path traversal (CWE-22) / improper tenant isolation (CWE-1220)
- **Location:** `packages/plgg-db-migration/src/domain/model/TenantId.ts:24-25`
- **Data path:** untrusted tenant id (request-scoped) → `asTenantId` (weak
  refinement) → `tenantIdString` → app `resolveTenantDb` builds the SQLite file
  path; the package never sanitizes it. The brand is the intended chokepoint.
- **Exploit:** tenant id `../tenant-victim/db` → per-tenant DB path escapes the
  base directory → cross-tenant read/write; `../../var/tmp/x` → arbitrary
  SQLite file creation (parent dirs auto-created by downstream fs helpers).

## Fix direction

Constrain the `refinedBrand` predicate to a safe **single path segment**
identifier charset so the brand actually means "safe to use as one path
component":

- Accept only `/^[A-Za-z0-9_-]{1,64}$/` (adjust the length ceiling if a real
  tenant-id format is known — keep it bounded).
- Reject `.`, `..`, `/`, `\`, NUL, and empty (already covered) — verify each
  explicitly in tests.
- Update the `tenantShape` error message from "a tenant id must be a non-empty
  string" to describe the required charset.
- Update `src/domain/model/TenantId.spec.ts` to cover the new rejections and a
  representative accepted id.

House style: keep `refinedBrand` (no bespoke class), **no `as` / `any` /
`ts-ignore`**, Prettier `printWidth: 50`, Option/Result throughout.

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — the fix stays
  inside the existing `refinedBrand` smart constructor; strict no-escape-hatch
  rule (no `as`/`any`/`ts-ignore`); Prettier 50.
- `workaholic:implementation` / `policies/functional-programming.md` — validation
  remains failure-as-value (`asTenantId` returns a `Result`, never throws); the
  brand is the type-level proof the downstream path relies on.
- `workaholic:design` / `policies/per-tenant-database.md` — the branded id is the
  isolation control for the database-per-tenant model; it must guarantee the id
  cannot escape its tenant's storage location.
- `workaholic:implementation` / `policies/test.md` — malicious-input rejection is
  the proof; coverage must stay > 90% across statements/branches/functions/lines.

## Quality Gate

**Verification method** — new unit tests in `TenantId.spec.ts` that assert
`asTenantId` **rejects** each of: `".."`, `"../x"`, `"a/b"`, `"a\\b"`, a
string containing a NUL byte (`"a\\0b"`), a leading-dot `".hidden"`, an
over-length string (> 64 chars), and `""`; and **accepts** a representative id
(e.g. `"tenant_01-AB"`). At least one test exercises the end-to-end intent:
feeding a `../`-bearing id through `asTenantId` yields an `Err`
(`TenantShape` `MigrationError`), never an `Ok`.

**Acceptance criteria (objective, all must hold):**
1. `scripts/tsc-plgg.sh` is clean (no new type errors; zero `as`/`any`/`ts-ignore`
   introduced — grep the diff).
2. `scripts/test-plgg.sh` passes, including the new rejection/acceptance cases.
3. Coverage for `plgg-db-migration` remains > 90% on all four axes.
4. No public API shape change beyond the tightened predicate (still
   `asTenantId` / `isTenantId` / `tenantIdString`); dependent usecases compile
   unchanged.
5. The `tenantShape` error message names the required charset.

**Edge cases to cover:** empty string, single `.`/`..`, mixed-separator
`a/..\\b`, Unicode/percent-looking sequences (`%2e%2e` is *not* decoded here so
it is accepted as literal safe chars only if it matches the charset — confirm
`%` is rejected), and the 64-char boundary (accept 64, reject 65).

**Division of assurance:** the branded-type predicate is the sole fix in scope;
the app-side `resolveTenantDb` seam is out of scope (caller-owned), but the
ticket's guarantee is that a validated `TenantId` is safe to `path.join` as one
segment regardless of the resolver implementation.

## Notes

Found during a repository-wide security review (2026-07-02). Companion ticket:
the lower-severity `newMigration` filename traversal (`newMigration.ts:41-47`).
The rest of the audited surface (plgg-server/http/router, plgg-view/md/highlight,
plgg-fetch/foundry/plggpress/plggmatic/cli) came back clean.
