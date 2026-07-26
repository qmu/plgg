# plgg-test

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

The monorepo's **in-house minimal test runner** — the
`plgg-test` bin every package's `test` and `coverage` scripts
call. Built from scratch on [plgg](../plgg/), its only other
dependency is the project's own `typescript`; there is no
`vitest` / `jest` in the tree.

## Why this package exists

The family runs its own tests the same way it runs everything
else: on plgg, with no heavy external toolchain. plgg-test
discovers `*.spec.ts` files, runs them, and reports —
including coverage with a threshold gate.

## Usage

Each package wires it into its scripts:

```json
{
  "scripts": {
    "test": "plgg-test src",
    "test:watch": "plgg-test src --watch",
    "coverage": "plgg-test src --coverage"
  }
}
```

### `test` is lean; `coverage` is the gate

`test` runs the specs and nothing else — one child process, no
type-checking, no coverage instrumentation. That is the
developer's inner loop, and it is deliberately cheap.

Two things it no longer does, both on purpose:

- **It does not typecheck.** Specs execute through the
  runtime's native type-stripping and never needed `tsc`.
  Typechecking is one whole-repo gate
  (`node scripts/typecheck.ts` at the monorepo root), where the
  shared type graph is parsed once instead of once per package.
- **It does not collect coverage.** Collection plus the fold
  used to run on *every* invocation and measured **57% of the
  entire repo's test phase** — it more than doubled each
  package's run. It now happens under `--coverage` only.

`--coverage` still applies the same four-metric threshold gate,
and still exits non-zero when a package falls below it. What
changed is where the fold happens: the run's own process
flushes its V8 dump (`v8.takeCoverage()`) and folds it inline,
instead of a third process being spawned to read it. The
reported numbers are unchanged.

**So a coverage regression is caught by `coverage`, not by
`test`.** Run it before a release, and keep it in whatever
gate certifies the tree.

Per-package options live in `plgg-test.config.json`:

```json
{
  "coverage": {
    "threshold": 90,
    "exclude": ["/index.ts"]
  }
}
```

## How it's organized

- **Cli** — the `argv` → run entrypoint (`--watch`,
  `--coverage`).
- **Discovery** / **Resolve** — find spec files and resolve
  their imports.
- **Core** — the run loop.
- **Expect** / **Matchers** — the assertion surface.
- **Mock** — test doubles.
- **Coverage** — instrumentation, the fold, and the threshold
  gate (`report.ts` holds both, shared by the CLI's in-process
  fold and the standalone `gate.ts` entry).
- **Env** — the runtime seam.

Requires Node `>=22.6` (it runs TypeScript specs directly).

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root
  `CLAUDE.md`).
- Coverage thresholds are strict (>90%) across the family; a
  package's `plgg-test.config.json` sets its exclusions.
