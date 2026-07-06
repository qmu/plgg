---
created_at: 2026-07-04T18:52:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Config]
effort: 4h
commit_hash: 1e701c8
category: Added
depends_on:
---

# Codify the vendor-boundary policy and enforce it with a TS-API import gate

## Overview

Make the company vendor-isolation policy an explicit, machine-checked rule of this monorepo. The policy (already the qmu.co.jp standard, already realized in `plgg-bundle` and `plgg-db-migration`) is:

1. Each package's `src/` splits three ways: `src/domain/{model,usecase}/` (the pure domain layer), `src/vendors/` (the anti-corruption boundary — the ONLY place third-party code is imported), and `src/entrypoints/` (thin CLI/HTTP shells — the program checkpoint that consumes the domain, i.e. the reverse dependency direction).
2. The domain may call `vendors/` functions directly, but vendor public signatures exchange ONLY: language primitives (string, number, arrays, Date…), domain-declared types, and — the plgg-specific extension — plgg data types (`Option`, `Result`, `Str`, `SoftStr`, `Dict`, `Datum`, `PromisedResult`…). Third-party types never cross into the domain, in params or returns, so any vendor is swappable without touching domain code.
3. "Third-party" here means `node:` builtins, Web-platform APIs, SDKs, and the tsc compiler API (the repo has zero third-party npm runtime deps). plgg-family packages are domain vocabulary, NOT vendors — they may be imported anywhere.
4. Vendor failures are folded into value-level domain errors (`Result`), never thrown across the seam. `index.ts` re-exports domain only, never `vendors/`.
5. Every package's domain must be consumed by at least one program checkpoint outside the domain: a `src/entrypoints/cli.ts` + `bin/` launcher, an HTTP server, or a downstream app package (`example`, `plggmatic-example`, `plggpress`, `guide`, `site`).

This ticket delivers: (a) the codified constraint, (b) an automated boundary gate built on the already-present `typescript` compiler API (zero new dependencies), (c) a full per-package conformance audit with an explicit, justified exemption list covering every package not yet migrated. Migration of the exempted packages is follow-up work (see the two dependent tickets and future per-package tickets).

## Policies

The standard engineering policies — synced from the corporate site (qmu.co.jp) into the `workaholic` policy skills — that govern this ticket. The implementing session MUST read each linked policy hard copy before writing code.

- `workaholic:implementation` / `policies/directory-structure.md` — code under `packages/`, one dir per package; the internal domain/entrypoints/vendors split is delegated to the language coding standards (applies to all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — §Package internal directory layout defines the exact `src/domain/` · `src/entrypoints/` · `src/vendors/` split this ticket enforces (applies to all code work)
- `workaholic:implementation` / `policies/domain-layer-separation.md` — the boundary rule verbatim: vendor public functions accept and return only primitive or domain types; entry points are thin shells reused across HTTP/CLI; this ticket adds the plgg-types extension and the enforcement
- `workaholic:implementation` / `policies/vendor-neutrality.md` — anti-corruption layer discipline: thin wrapper, no domain logic, unidirectional dependence (ours → ACL → theirs), vendor errors translated into domain error types
- `workaholic:design` / `policies/vendor-neutrality.md` — 消極的ベンダー依存 (Passive Vendor Dependence): the design-pillar rationale; plgg itself is the named in-house foundation
- `workaholic:operation` / `policies/ci-cd.md` — the gate must run identically in `scripts/check-all.sh` and the run-tests CI workflow (one source of truth)

## Key Files

- `packages/plgg-db-migration/src/vendors/fs.ts` - reference-implementation vendor boundary: sole importer of `node:fs`, folds rejections into value-level `MigrationError`, signatures use only plgg + domain types
- `packages/plgg-db-migration/src/entrypoints/cli.ts` - reference program checkpoint: "the only place `process`/`throw` live"; folds a domain `Result` into an exit code
- `packages/plgg-bundle/src/` - second reference layout (`domain/`, `vendors/transpiler.ts`, `vendors/runner.ts`, `entrypoints/cli.ts`, `bin/`) — but its `domain/usecase/*.ts` currently import `node:` directly, so it starts ON the exemption list (fixed by the dependent leak-fix ticket)
- `packages/plgg-kit/src/LLMs/vendor/` - naming drift to reconcile: per-feature singular `vendor/` vs the canonical top-level plural `src/vendors/`
- `packages/plgg-fetch/src/Http/usecase/seam.ts` - the `seam.ts` variant of the discipline (sole toucher of Web `Request`/`Response`); seam files are conformant in spirit but migrate to `vendors/` per package (pilot ticket)
- `scripts/gate-vite.sh`, `scripts/gate-happy-dom.sh` - the established gate idiom the new gate script follows (exit non-zero on violation; shared verbatim between check-all and CI)
- `scripts/check-all.sh` - master gate runner; the new gate registers here alongside the existing gates
- `.github/workflows/` (run-tests workflow) - CI must run the same gate script
- `.workaholic/constraints/architecture.md` - already holds two prose instances of this policy ("verifiable via static import analysis" with no implementation); the codified constraint text extends this file
- `packages/plgg/src/` - defines the sanctioned boundary-crossing plgg types (`Option`, `Result`, `Str`, `SoftStr`, `Dict`, `Datum`, `PromisedResult`); plgg itself is zero-dep and needs no `vendors/`

## Related History

The vendor-isolation discipline has been converging in this repo for weeks — driver/adapter contracts, runtime seams, and the two reference packages — but no ticket has ever rolled it out monorepo-wide or enforced it.

Past and adjacent tickets that touched similar areas:

- [20260704143031-durable-core-sacrificial-shell-boundary.md](.workaholic/tickets/todo/a-qmu-jp/20260704143031-durable-core-sacrificial-shell-boundary.md) - D18: enforces the orthogonal durable-core vs sacrificial-shell axis; shares the machine-checkable-boundary philosophy — coexist and cross-reference, do not merge
- [20260627210152-example-readme-and-db-adapter-contract.md](.workaholic/tickets/archive/work-20260627-205005/20260627210152-example-readme-and-db-adapter-contract.md) - prior art: a DB driver/adapter contract keeping a dependency swappable behind a plgg-typed boundary
- [20260529000006-support-non-node-runtimes.md](.workaholic/tickets/archive/work-20260528-143038/20260529000006-support-non-node-runtimes.md) - prior art: runtime specifics abstracted behind a seam so implementations swap without touching consumers

## Implementation Steps

1. **Codify the constraint.** Extend `.workaholic/constraints/architecture.md` with the vendor-boundary constraint stated in the Overview (three-part layout; allowed boundary types = primitives + domain types + plgg types; plgg-family = domain vocabulary, not vendor; error folding; index.ts exports domain only; program-checkpoint requirement). Name the two reference packages and state the criterion as "verified by `scripts/gate-vendor-boundary.sh`" — turning the existing "verifiable via static import analysis" prose into a pointer at a real check.
2. **Build the analyzer.** A small checker program using the already-installed `typescript` package's compiler API (`import ts from "typescript"`; the repo's `erasableSyntaxOnly` tsconfig means a TS script can run under node's type stripping, or write it as `.mjs` — decide at drive time). For every `packages/*/src/**/*.ts` it classifies each import specifier: `node:*` builtin / bare third-party (incl. `typescript`) / plgg-family (`plgg`, `plgg-*`, `plggmatic*`, self-alias) / relative. Rules:
   - Files under `src/domain/**` may import only plgg-family, relative in-package modules, and the package's own `vendors/`.
   - `node:*`, `typescript`, and any other non-plgg bare specifier may appear only under `src/vendors/**` and `src/entrypoints/**` (plus `bin/` plain-JS launchers, which are outside `src/`).
   - Packages without a `src/domain/` directory yet (legacy `Feature/{model,usecase}` layout) must be listed in the exemption file — an unlisted non-conformant package fails the gate, a listed-but-conformant package also fails (stale exemption).
3. **Exemption list + audit table.** A machine-readable exemption file next to the gate (e.g. `scripts/vendor-boundary-exemptions.txt`, one package per line with a `# reason`), seeded from a full audit of all ~22 packages. Record the human-readable audit table (package / layout / boundary location / conform-or-exempt-with-reason) in the same constraints doc. `plgg-bundle` starts exempted (domain `node:` leaks), as do all legacy-layout packages; `plgg-db-migration` and `plgg` must pass unexempted from day one.
4. **Gate script.** `scripts/gate-vendor-boundary.sh` in the exact `gate-vite.sh` idiom: runs the analyzer, prints violations with file:line, exits non-zero on any. Register it in `scripts/check-all.sh` alongside the existing gates and in the run-tests CI workflow (same script, one source of truth).
5. **Self-test.** The gate proves itself red and green: a self-test mode or spec seeds a violation fixture (a scratch domain file importing `node:fs`, and separately a stale-exemption case) and asserts non-zero exit; asserts zero exit on the clean tree. Follow how existing scripts are tested; at minimum a `--self-test` flag exercised by check-all.
6. **Docs.** Note the boundary vocabulary (domain / vendors / entrypoints / program checkpoint) where package layout is documented, so per-package READMEs converge on one vocabulary as packages migrate.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `scripts/gate-vendor-boundary.sh` exits non-zero on a seeded violation (a `src/domain/**` file importing `node:fs`) and on a stale exemption (an exempted package that actually conforms); exits zero on the clean tree with the recorded exemption list.
- The analyzer uses only the already-present `typescript` package: `git diff` over all `package.json` files shows zero new dependencies.
- The gate is registered in `scripts/check-all.sh` and in the run-tests CI workflow, invoking the same script.
- The audit table in `.workaholic/constraints/architecture.md` covers every package under `packages/` (currently ~22) — each row either conforms or carries an explicit exemption reason; no silent omissions.
- `plgg` and `plgg-db-migration` pass the gate unexempted.

**Verification method** — the commands/tests/probes that prove them:

- Run the gate's self-test (seeded red fixtures + clean-tree green) in-session and show both exit codes.
- Run `scripts/check-all.sh` fresh (full rebuild, per the stale-dist lesson) — fully green including the new gate.
- Cross-check the audit table row count against `ls packages/`.

**Gate** — what must pass before approval:

- Gate self-test red/green proven in-session; `scripts/check-all.sh` green end-to-end; audit table complete with every exemption justified; zero new dependencies confirmed.

## Considerations

- Zero new dependencies is a hard rule: no eslint, no dependency-cruiser — the analyzer must be built on the `typescript` package already present as a devDependency (`packages/plgg-bundle/package.json`, root tooling).
- Web-platform globals (`fetch`, `Request`, `Response`, DOM) are ambient, not imported, so import analysis cannot fully catch them; v1 enforces import-location only. A future upgrade can add signature-level checking (no third-party types in vendor public params/returns) — note that the CLAUDE.md no-escape-hatch rule already makes leaked vendor types surface in `tsc`, since the domain cannot cast them away.
- Spec files sit beside sources; domain specs must stay pure too (the injectable-seam pattern means they run with fakes — `packages/plgg-kit/src/LLMs/usecase/generateObject.ts`'s `post` seam is the model). Decide at drive time whether `*.spec.ts` under `domain/` get any relaxation; default is no.
- Follow the established gate idiom, not a bespoke runner: one `gate-*.sh` shared verbatim by `scripts/check-all.sh` and CI (`scripts/gate-vite.sh` is the template).
- Naming is canonicalized as top-level plural `src/vendors/` (per `coding-standards` §Package internal directory layout); `plgg-kit`'s per-feature singular `src/LLMs/vendor/` and the `seam.ts` files are exemption-listed until their packages migrate (pilot ticket first).
- The program-checkpoint requirement is satisfied at monorepo level today (`bin/` CLIs of plgg-bundle/plgg-db-migration/plgg-test/plggpress; the `example` and `plggmatic-example` apps; `plgg-server`'s HTTP adapter) — the constraint text should state where each package's checkpoint lives, not force a CLI into every library package.
- Do not restructure packages in this ticket; `plggmatic` is under active work on this branch — it stays exemption-listed here.
- Cross-reference: the D18 durable-core/sacrificial-shell ticket (`.workaholic/tickets/todo/a-qmu-jp/20260704143031-durable-core-sacrificial-shell-boundary.md`) enforces a different axis of the same sacrificial-architecture pillar; keep vocabulary (seam / boundary / checkpoint) consistent between the two constraint texts.

## Final Report

Landed in feat `1e701c8` (5 files, +493), archived in this housekeeping commit.
The company vendor-isolation policy is now a machine-checked monorepo rule.

### What shipped
- **`scripts/vendor-boundary-analyzer.mjs`** — classifies every
  `packages/*/src/**/*.ts` import via the already-present `typescript` compiler
  API (`ts.preProcessFile`, resolved from plgg-bundle through `createRequire` —
  **zero new deps**). A third-party import (`node:*`, the tsc API, any bare
  non-`plgg` specifier) in PRODUCTION code outside `src/vendors/`/`entrypoints/`
  is a violation. Modes: `--gate` (default, exit 1 on a violation / stale
  exemption), `--audit` (per-package table), `--self-test` (red/green logic
  proof).
- **`scripts/vendor-boundary-exemptions.txt`** — 6 packages with production
  leaks, each with a reason; derived from a real audit, not guessed.
- **`scripts/gate-vendor-boundary.sh`** — the `gate-vite.sh` idiom: runs the
  self-test then the gate; bootstraps plgg-bundle's `typescript` if absent (so
  it works before build.sh). Registered in `check-all.sh` (which the run-tests
  CI workflow invokes — one source of truth).
- **`.workaholic/constraints/architecture.md`** — the codified `## Vendor
  Boundary` constraint (turning the two prior "verifiable via static import
  analysis" prose stubs into a pointer at a real check) + the full 23-package
  audit table.

### Decisions (recorded)
- **plgg-family (`/^plgg/`) is domain vocabulary**, importable anywhere; only
  the classifier's one-line prefix test distinguishes it from third-party. So
  self-aliases (`plggpress/…`, `plgg-sql/…`) and cross-package plgg imports are
  all allowed everywhere.
- **v1 governs PRODUCTION code; test code (`*.spec.ts`, `testkit/`) is
  EXCLUDED.** This was the ticket's explicit "decide at drive time" point. The
  audit first showed plgg-db-migration with 7 violations and plgg-sql with 1 —
  all in test files (domain specs creating temp dirs; `testkit/sqliteDb.ts`
  opening `node:sqlite`; ticket-15's `fts5Engine.spec.ts`). Since the reference
  package plgg-db-migration MUST pass unexempted and the "test against the real
  engine" policy legitimately needs real vendors in tests (the anti-corruption
  layer's tests connect to the vendor), the gate checks production structure
  only. The no-`as`/`any` rule already surfaces a leaked vendor TYPE in a
  production signature through `tsc`; signature-level + Web-global checking is
  future work.
- **plggmatic is NOT exempted** despite the ticket suggesting it (under active
  work) — the audit shows it is clean (0 violations), and a clean exemption is a
  stale-exemption failure. "Under active work" meant don't restructure it, which
  this ticket doesn't.

### Audit outcome (23 packages)
- **15 conformant, unexempted**: plgg, plgg-db-migration (reference),
  plgg-cli/fetch/foundry/highlight/http/kit/md/parser/router/sql/view/auth,
  plggmatic.
- **6 exempted** (production leaks pending migration): plgg-bundle (domain
  leaks → ticket 185202), plgg-server, plgg-test, plggpress, example,
  plggmatic-example.
- **2 content apps** (no `src/`, program checkpoints): guide, site.

### Verification (all ACs)
- Fresh `scripts/check-all.sh` **EXIT 0** with the gate registered and passing.
- `--self-test`: 11 cases PASS (RED on a seeded `node:fs`-in-domain violation +
  a stale exemption; GREEN on a clean unexempted package + an exempted-dirty
  one; boundary + test-code locations correct); exit 0.
- **Zero new dependencies** — `git diff` over all `package.json` is empty.
- The audit table covers every package under `packages/`; `plgg` and
  `plgg-db-migration` pass unexempted.

### Follow-ups
- Ticket 20260704185202 fixes plgg-bundle's domain `node:` leaks (removing its
  exemption); ticket 20260704185203 pilots plgg-fetch into the explicit
  domain/vendors/entrypoints layout (it is already boundary-clean).
- Per-package READMEs converge on the domain/vendors/entrypoints/checkpoint
  vocabulary as packages migrate.
- v2: signature-level checking (no third-party type in a vendor public
  param/return) and Web-global (`fetch`/`Request`) detection.
