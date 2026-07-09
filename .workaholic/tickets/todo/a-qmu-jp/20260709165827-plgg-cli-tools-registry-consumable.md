---
created_at: 2026-07-09T16:58:27+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure, Config]
effort:
commit_hash:
category:
depends_on:
mission:
---

# Make the run-from-source plgg CLIs registry-consumable (plgg-bundle, plgg-test, plggpress)

## Overview

The in-house CLIs `plgg-bundle` (the bundler/build), `plgg-test` (the test
runner), and `plggpress` (the SSG `build`) all run from their **TypeScript
source**: each `bin/*.mjs` launcher `await import()`s (or spawns) a
`src/**/*.ts` entry and relies on Node 24 stripping types on load. This works
**only inside the plgg monorepo**, where the packages are `file:`-linked and
their realpath is OUTSIDE `node_modules`.

When any of these tools is installed from the npm registry into a consumer's
`node_modules`, Node 24 **refuses to strip types for `.ts` files under
`node_modules/`** (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), so `build`,
`test`, and the SSG `build` all fail immediately. No standalone plgg consumer
can build or test against published packages.

This blocks the plggmatic extraction (`20260709103916` /
`plggmatic-extraction-cut`): `../plggmatic` is populated and `tsc`-clean, but
`scripts/check-all.sh` cannot go green until the tooling is registry-consumable.

## Discovery context

Found while driving the plggmatic populate. In `../plggmatic`:
- `npm install` of the published plgg family resolves fine.
- `tsc --noEmit` passes clean standalone.
- `plgg-bundle` (build) and `plgg-test` (test) both fail with
  `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` (running `src/*.ts` from under
  `node_modules`).
- `plggpress` shares the exact launcher pattern (`bin/plggpress.mjs` →
  `import("../src/cli.ts")`), so `plggpress build` (the `site` build) fails the
  same way.

The publish smoke test in `scripts/publish-npm.sh` did NOT catch this: its bin
check matches only `ERR_MODULE_NOT_FOUND`/"Cannot find", so a type-stripping
failure reads as "bin ok".

## Policies

- `workaholic:operation` / `policies/ci-cd.md` — the published packages ARE the
  release product; a package that cannot run when installed is not shippable.
  The publish smoke test must also catch this class of failure.
- `workaholic:implementation` / `policies/command-scripts.md` — the canonical
  runners stay the single interface; the fix lives in the tools, not per-consumer
  workarounds.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; the launchers stay plain `.mjs`; Prettier printWidth 50.
- `workaholic:design` / `policies/vendor-neutrality.md` — no new third-party
  dependency; the fix uses only Node built-ins.
- `workaholic:design` / `policies/sacrificial-architecture.md` — the tools are
  durable-core infrastructure; the fix must be robust, not a hack that silently
  degrades.

## Proposed approach — relocate-out-of-node_modules and re-exec

Preserve the authors' run-from-source design (do NOT introduce a parallel
compiled `dist` runtime for the tools). Add a small preamble to each `bin/*.mjs`
launcher (plain `.mjs`, runs at process entry, Node built-ins only):

1. Resolve the launcher's own package root realpath. If it is NOT under a
   `node_modules` path segment (the monorepo `file:` case), run in place —
   unchanged behaviour.
2. If it IS under `node_modules`, copy the package (`src`, `bin`,
   `package.json`) to a version-stamped dir OUTSIDE `node_modules` (e.g.
   `os.tmpdir()/<name>-<version>/`), idempotently (a `.ready` marker skips the
   re-copy). Symlink `<dest>/node_modules` to the tool's containing
   `node_modules` so the tool's own deps (`typescript`; `plgg` for plgg-test)
   resolve from the relocated copy.
3. Re-exec `<dest>/bin/<launcher>.mjs` with the same argv, stdio inherited, cwd
   inherited (so a tool that reads the TARGET package's tsconfig/specs at cwd is
   unaffected — the target's `.ts` live in the repo, outside `node_modules`, and
   strip fine). Exit with the child's status.

Because the relocated copy's realpath is under `os.tmpdir()` (no `node_modules`
segment), the preamble self-terminates — no re-exec loop — and the existing
launcher logic runs verbatim from the relocated source.

Apply the identical preamble to all three launchers:
`packages/plgg-bundle/bin/plgg-bundle.mjs`,
`packages/plgg-test/bin/plgg-test.mjs`,
`packages/plggpress/bin/plggpress.mjs`. Audit the other `bin/*.mjs` launchers in
the family for the same run-from-source pattern and fix any that a published
consumer would invoke.

## Implementation Steps

1. Reproduce in `../plggmatic` (already installed): `plgg-bundle` and
   `plgg-test` fail under `node_modules`; confirm `plggpress build` fails the
   same way.
2. Prototype the relocation preamble directly in the installed
   `../plggmatic/.../node_modules/plgg-bundle/bin/plgg-bundle.mjs` and confirm
   `plggmatic` build goes green; repeat for `plgg-test` (test green).
3. Port the finalized preamble into the three monorepo launchers. Keep it a
   plain `.mjs`, Node built-ins only, no new deps.
4. Harden the publish smoke test (`scripts/publish-npm.sh`) to also fail on
   `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` (and, ideally, actually run the
   bin end-to-end from the scratch install rather than only `--help`).
5. Bump the three packages (`plgg-bundle`, `plgg-test`, `plggpress`) and run the
   monorepo `scripts/check-all.sh` fresh green (the tools still run in place in
   the monorepo — the preamble is a no-op there).
6. Publish (developer-run) `plgg-bundle`, `plgg-test`, and `plggpress@0.0.2`.
7. In `../plggmatic`, `npm install` the fixed tooling and run
   `scripts/check-all.sh` to full green (build + tsc + tests), unblocking the
   extraction.

## Quality Gate

**Acceptance criteria:**

- `plgg-bundle`, `plgg-test`, and `plggpress` run correctly when installed from
  the registry into a consumer's `node_modules` (build/test/SSG-build succeed).
- The monorepo `scripts/check-all.sh` stays green (the preamble is a no-op on
  `file:` links — the tools run in place).
- The publish smoke test fails on a type-stripping error instead of passing it.
- No new runtime dependency; launchers remain plain `.mjs`; no
  `as`/`any`/`ts-ignore`; Prettier printWidth 50.
- `../plggmatic/scripts/check-all.sh` passes fully green against the published,
  fixed tooling.

**Verification method:**

- From a clean scratch install of each tool, invoke its bin end-to-end (not just
  `--help`) and confirm no `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`.
- `../plggmatic` check-all green standalone.
- Monorepo check-all green.

**Gate:**

- All three tools registry-consumable AND both repos green AND the smoke test
  catches the failure class AND no escape hatches / new deps.

## Considerations

- Prerequisite for `20260709103916` (plggmatic publish boundary) reaching a green
  standalone check-all, and therefore for ticket C (`20260708195657`).
- The relocation copy is version-stamped and idempotent; concurrent first-runs
  race only on populating the cache and converge (last-writer-wins on the
  `.ready` marker; acceptable — the copy is deterministic).
- Alternative considered and rejected for now: ship a compiled `dist` runtime and
  run the tools from it under `node_modules`. Cleaner npm convention but changes
  the tools' run model (src↔dist divergence risk; plgg-bundle self-hosting its
  own emit) — heavier and less faithful to the deliberate run-from-source design.
  Revisit if relocation proves fragile.
