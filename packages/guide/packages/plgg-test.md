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

## Writing a test

You import the API from `plgg-test` and write `test` /
`expect` exactly as you would expect. This is a **real,
unedited spec from the `plgg` package** — it runs under
`plgg-test` today:

```ts
import { test, expect, assert } from "plgg-test";
import {
  isAlphanumeric,
  asAlphanumeric,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("isAlphanumeric and asAlphanumeric basic validation", () => {
  expect(
    isAlphanumeric(box("Alphanumeric")("test123")),
  ).toBe(true);

  const result = asAlphanumeric("abc123");
  assert(isOk(result)); // narrows result to the Ok branch
  expect(result.content.content).toBe("abc123");

  assert(isErr(asAlphanumeric("test-123")));
});
```

Two things worth calling out:

- **`assert` is a real `asserts cond` function**, not a
  boolean check. After `assert(isOk(result))` the compiler
  *narrows* `result` to its `Ok` branch, so
  `result.content` type-checks — which is why the codebase
  can keep its no-`as`/no-`any` rule. (`tsc --noEmit` runs
  before the tests as the pre-gate.)
- **`toEqual` deep-equals plgg shapes**, including `Result`
  / `Option` boxes:

```ts
import { test, expect } from "plgg-test";
import { ok, some } from "plgg";

test("toEqual deep-equals nested structures", () => {
  expect({ a: [1, 2] }).toEqual({ a: [1, 2] });
  expect(ok(some(3))).toEqual(ok(some(3)));
});

test("async is awaited; .resolves unwraps", async () => {
  await expect(Promise.resolve(42)).resolves.toBe(42);
});
```

## Test doubles (`vi`)

A scoped `vi` covers the spy/stub surface the corpus uses —
again, a real `plgg-test` self-test:

```ts
import { test, expect, vi } from "plgg-test";

test("vi.spyOn records, calls original, and restores", () => {
  const obj = { greet: (n: unknown) => `hi ${n}` };

  const spy = vi.spyOn(obj, "greet");
  expect(obj.greet("x")).toBe("hi x"); // original still runs
  expect(spy).toHaveBeenCalledWith("x");

  spy.mockRestore(); // original restored, spy stops recording
});
```

## Running it

The CLI takes the source roots to scan for `*.spec.ts`. The
`plgg` package wires it straight into its npm scripts:

```sh
# one-shot run (tsc gate first, then the suite)
plgg-test src

# re-run on every change (a fresh process per run,
# so source edits are always reflected)
plgg-test src --watch

# four-metric V8 coverage (statements/branches/functions/
# lines), gated per package — zero third-party deps
plgg-test src --coverage
```

The process exits non-zero on any failure (or on zero
discovered tests), so it is a correct CI / agent gate.

## Trust by demonstration

`plgg-test` is validated against the previous runner
**test-for-test** on the real `plgg` corpus — **74 spec
files, 465 tests, identical pass/fail verdicts on both
runners, zero divergence**. The switch is proven, not
asserted. It also tests itself, bootstrapped by a tiny
plain-`throw` meta-harness that verifies the primitives
(a failing `expect` really throws, async rejection is
caught, the exit code is right) *without* trusting the code
under test.
