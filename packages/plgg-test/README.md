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
    "test": "tsc --noEmit && plgg-test src",
    "test:watch": "plgg-test src --watch",
    "coverage": "tsc --noEmit && plgg-test src --coverage"
  }
}
```

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
- **Coverage** — instrumentation + the threshold gate.
- **Env** — the runtime seam.

Requires Node `>=22.6` (it runs TypeScript specs directly).

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root
  `CLAUDE.md`).
- Coverage thresholds are strict (>90%) across the family; a
  package's `plgg-test.config.json` sets its exclusions.
