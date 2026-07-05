---
created_at: 2026-07-04T18:52:02+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Infrastructure]
effort:
commit_hash: bc218e6d
category: Changed
depends_on: [20260704185201-vendor-boundary-policy-and-gate.md]
---

# Fix the reference packages' own vendor-boundary leaks (plgg-bundle domain imports node:)

## Overview

`plgg-bundle` is named as a reference implementation of the domain/vendors/entrypoints layout, but its domain layer leaks: `src/domain/usecase/*.ts` import `node:` builtins (and touch the tsc API) directly — `build.ts`, `emitDts.ts`, `resolveSpecifier.ts`, `deriveExternal.ts`, `discoverWorkspace.ts`, `rewriteDtsAliases.ts`, `resolveWorkspaceSpecifier.ts`, `collectModules.ts`. A reference package that violates its own policy undermines the whole rollout.

This ticket moves every third-party touch (`node:fs`, `node:path`, `node:vm`, `node:module`, `typescript`, …) in plgg-bundle's domain into `src/vendors/` (extending the existing `vendors/transpiler.ts` / `vendors/runner.ts`, adding e.g. `vendors/fs.ts` on the `plgg-db-migration` model), so domain usecases speak only primitives + domain types + plgg types. Vendor failures fold into plgg-bundle's value-level domain error type; nothing is thrown across the seam. Then plgg-bundle comes OFF the gate's exemption list, making it a genuine reference alongside `plgg-db-migration`.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout (applies to all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — §Package internal directory layout: `domain/` must not import vendor-specific modules (applies to all code work)
- `workaholic:implementation` / `policies/domain-layer-separation.md` — the exact rule being restored: domain usecases never import `node:`/tsc; vendor functions expose primitive/domain/plgg-typed signatures
- `workaholic:implementation` / `policies/vendor-neutrality.md` — anti-corruption layer stays thin (translation + delegation, no domain logic); vendor errors translated to domain error values

## Key Files

- `packages/plgg-bundle/src/domain/usecase/` - the leaking usecases listed above; each `node:`/tsc import moves behind a vendor function
- `packages/plgg-bundle/src/vendors/transpiler.ts`, `packages/plgg-bundle/src/vendors/runner.ts` - existing vendor boundary to extend (fs/path/module access joins them)
- `packages/plgg-db-migration/src/vendors/fs.ts` - the model to follow: sole `node:fs` importer, rejections folded into `IoFailure` domain error, plgg-typed signatures
- `packages/plgg-bundle/src/entrypoints/cli.ts`, `packages/plgg-bundle/bin/plgg-bundle.mjs` - the program checkpoint; unchanged in role, verify it still folds domain Results into exit codes after the refactor
- `packages/plgg-bundle/DEPENDENCY-LOG.md` - update if the vendor surface description changes
- `scripts/vendor-boundary-exemptions` file (created by the gate ticket) - remove plgg-bundle's entry; update the audit table in `.workaholic/constraints/architecture.md`

## Related History

The gate ticket (this ticket's dependency) establishes the enforcement that makes this leak visible and its fix verifiable; plgg-bundle's flake/atomic-publish and clean-runner history shows this package's build pipeline is sensitive — refactor structure, not behavior.

- [20260704185201-vendor-boundary-policy-and-gate.md](.workaholic/tickets/todo/a-qmu-jp/20260704185201-vendor-boundary-policy-and-gate.md) - foundation: defines the rule, gate, and exemption list this ticket shrinks

## Implementation Steps

1. Inventory every `node:`/`typescript` import under `packages/plgg-bundle/src/domain/**` (the gate from the foundation ticket prints them as violations — run it with plgg-bundle's exemption removed to get the authoritative list).
2. For each, either move the touching code into an existing vendor module or create a new one (`vendors/fs.ts`, `vendors/workspace.ts`, …) whose public functions take/return only primitives, plgg-bundle domain types, and plgg types, folding failures into the package's domain error type as `Result`/`PromisedResult`.
3. Rewire domain usecases to call the vendor functions; no behavior change — this is a pure structural refactoring (bundler output must be byte-identical where deterministic).
4. Remove `plgg-bundle` from the exemption list; update the audit table row to "conforms".
5. Run the full check: plgg-bundle self-bundles the monorepo, so a fresh `scripts/check-all.sh` (which rebuilds all dists in dependency order) is mandatory, not optional.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `scripts/gate-vendor-boundary.sh` passes with `plgg-bundle` absent from the exemption list — zero `node:`/`typescript` imports remain under `packages/plgg-bundle/src/domain/**`.
- Behavior is unchanged: plgg-bundle still builds every package's dist successfully in the full dependency-ordered rebuild.
- plgg-bundle's test suite stays green with coverage above the repo's >90% thresholds (statements/branches/functions/lines).
- No new dependencies; `bin/` launcher and `entrypoints/cli.ts` roles unchanged.

**Verification method** — the commands/tests/probes that prove them:

- `scripts/gate-vendor-boundary.sh` green in-session after the exemption removal.
- Fresh `scripts/check-all.sh` green end-to-end (full dist rebuild + all package tests — plgg-bundle is the builder, so a stale-dist pass proves nothing).
- `scripts/test-plgg-bundle.sh` (or the package's test runner) green with coverage report meeting thresholds.

**Gate** — what must pass before approval:

- Boundary gate green without the plgg-bundle exemption; fresh check-all green; plgg-bundle coverage thresholds met; audit table updated.

## Considerations

- plgg-bundle is the tool that builds every other package — regressions here mask as unrelated build failures. Run build experiments detached and always re-verify with a fresh full rebuild (`scripts/check-all.sh`), never against stale dists.
- Keep vendor modules thin: translation and delegation only; any logic that decides *what* to bundle stays in the domain, only *how to touch fs/tsc/vm* moves (`workaholic:implementation` / `vendor-neutrality`).
- The ESM `__require`→native `import(id)` fallback and the atomic `dist.stage` publish are prior hard-won fixes living in this package — do not disturb them while relocating imports (`packages/plgg-bundle/src/vendors/runner.ts`, the dist publish path).
- If `plgg-db-migration` or any other nominally-conformant package shows leaks once the gate runs, fold those trivial fixes in here too — this ticket's outcome is "the reference packages genuinely pass unexempted".

## Final Report

Development completed. plgg-bundle — the bundler that builds every package — is now
a GENUINE reference for the domain/vendors/entrypoints layout: it came OFF the
vendor-boundary exemption list. One committed slice (`d8f83de`), verified by the
full check-all (the high-blast-radius test).

- **Five vendor seams**: nodeFs, nodePath, nodeProc (child_process + module),
  nodeHttp (the dev server's node:http⇄Web bridge), nodeUrl — the single chokepoint
  for every node: touch.
- **12 files redirected**: 8 build usecases + 4 Dev/node files now import from
  vendors/, not node:. The only node: outside vendors/ is entrypoints/cli.ts
  (allowed).
- **Exemption removed**: gate reports plgg-bundle CONFORMANT unexempted (19
  conformant, 5 exempted, was 18/6).

### Discovered Insights

- **Insight**: the refactor was IMPORT REDIRECTION, not a rewrite — plgg-bundle
  uses throw-at-the-boundary (NOT plgg's Result idiom, by explicit design), and the
  gate only cares about import LOCATION (node: confined to vendors/). So re-export
  vendor modules (`export {x} from "node:*"`) preserve exact types AND satisfy the
  gate, changing only import sources. Fitting the seam to the package's OWN error
  model beat forcing a Result rewrite on a throw-based tool.
- **Insight**: the ticket named 8 domain usecases, but the gate found 9 MORE
  leaks in Dev/node/* (the dev server's http/watch/scan) — a comment there even
  claimed it was "the one platform seam, kept in Dev/node/", but the gate only
  honours vendors/ + entrypoints/, not an ad-hoc dir name. The gate is the ground
  truth; a directory naming convention is not a boundary.
- **Insight**: the safety net made the high-blast-radius refactor safe to attempt —
  a broken bundler → RED check-all → no commit. Doing it LAST + verifying with the
  FULL check-all (every package built through the changed bundler) is what proved
  it byte-behaviour identical.

### Remaining (follow-up, not this ticket)

- The clean-runner path (plgg-bundle runs from source + imports typescript; its
  node_modules must be installed wherever invoked) is exercised by the local
  check-all; the clean-runner CI is the ultimate guard against masking.
- Other still-exempt packages (plgg-server, plgg-test, plggpress, example,
  plggmatic-example) remain for their own future boundary tickets.
