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

### Tests run concurrently by default

Within a spec file, tests and nested `describe` blocks run through a
bounded async pool (4 in flight; `PLGG_TEST_CONCURRENCY` overrides it).
Spec **files** are still loaded and run one at a time — registration
mutates process-global state, so files cannot overlap.

The report is unaffected: results are collected by index, so the
printed order is registration order however execution interleaves.

Two things a concurrent suite can no longer assume:

- **Cross-test ordering.** A test that reads state a *previous* test
  left behind (a shared log, a seeded fixture, a counter) is no longer
  meaningful. Hooks still bracket each test; what is gone is the
  sequence *between* tests.
- **Exclusive access to process globals.** A bound port, a temp file at
  a fixed path — anything one test installs and another expects to still
  be there.

**`vi.stubGlobal` / `vi.stubEnv` are handled for you.** A spec whose
source mentions either is scheduled **serially, automatically** — no
directive to write and none to forget. Behind that sits a runtime
backstop: a stub attempted while sibling tests are in flight **throws**
with a message naming the fix, so the failure mode is a red test, never
a global swapped underneath a concurrent sibling.

### `suite.serial(...)` — the opt-in serial block

A `suite.serial` block runs as **one indivisible unit**: its tests
execute in registration order and nothing else in the file runs beside
them. `beforeEach`/`afterEach` bracket each test as usual, so a shared
fixture sequence is safe:

```ts
suite.serial("orders", () => {
  beforeEach(() => seed(db));
  afterEach(() => truncate(db));

  test("lists what was seeded", async () =>
    check(await listOrders(db), toHaveLength(3)));

  test("removes one", async () =>
    check(await deleteOrder(db, 1), okThen(...)));
});
```

`describe.serial` is the same modifier under the alias. Everything
outside a serial block stays concurrent with no author action.

The block keeps its **registration position** relative to its siblings —
consecutive concurrent suites are batched together and each serial block
runs alone, in order — so adding `.serial` changes isolation, never
where the block runs.

A whole file opts out with a first-lines directive instead:

```ts
// @plgg-test-concurrency 1
```

A file declaring `@plgg-test-environment dom` is serial automatically —
installing a DOM mutates process globals.

**Unhandled rejections.** A fire-and-forget rejection never reads green
in either mode. Serially it fails the exact test that started it.
Concurrently it fails the **file**: tying a process-level
`unhandledRejection` to one of several in-flight tests would need
`async_hooks` (Node-only, and this runner stays cross-runtime), and
guessing would make the blame depend on timing. The failure message says
to re-run with `PLGG_TEST_CONCURRENCY=1` for exact attribution.

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
