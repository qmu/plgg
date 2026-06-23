# plgg-test

The family's **own test runner**, built from scratch on
[plgg](/packages/plgg/) so the monorepo can drop its
dependency on a large third-party test framework (and the
recurring Dependabot churn that comes with it). The public
API is deliberately close to the traditional one
(`describe`/`it`/`expect`), so migrating a spec is mostly
changing its import source.

::: tip Full API reference
For every export with its signature, see the
**[plgg-test API reference](/api/plgg-test/)**.
:::

## Why it exists

The test runner decides every green/red verdict, yet a
third-party runner sits at the centre of the workflow
outside the family's control and drags a large dependency
subtree. `plgg-test` removes that maintenance tax: its only
runtime dependency is `plgg` itself — everything effectful
rides Node built-ins (`node:fs`, `node:module`,
`node:child_process`, …), and TypeScript is used only to
transpile test files, never shipped.

It is intentionally **minimum but real**: the surface is
dictated by what the existing test corpus actually uses, not
by a runner's full catalogue.

## What it provides

- **Authoring**: `describe`, `it` / `test` (+ `.skip`),
  `beforeEach` / `afterEach`.
- **Assertions**: `expect` with the matchers the corpus
  uses (`toBe`, `toEqual`, `toContain`, `toThrow`,
  `.resolves` / `.rejects`, `.not`, …) and `assert` as a
  real `asserts cond` narrowing function.
- **Test doubles**: a scoped `vi` (`fn`, `spyOn`,
  `stubGlobal` / `stubEnv` and their restores).
- **Running**: automatic `*.spec.ts` discovery, an
  async-aware runner, a plain reporter, and a correct
  process exit code (zero only when everything passes).
- **`--watch`**: re-runs on file change (a fresh process per
  run, so source edits are always reflected).
- **`--coverage`**: zero-dependency V8 coverage
  (`NODE_V8_COVERAGE`) reporting statements, branches,
  functions, and lines, gated per package.

## Trust by demonstration

`plgg-test` is validated against the previous runner
**test-for-test** on the real `plgg` corpus — identical
discovered files and identical per-test verdicts — so the
switch is proven, not asserted. It also tests itself,
bootstrapped by a tiny plain-`throw` meta-harness that
verifies the primitives without trusting the code under
test.
