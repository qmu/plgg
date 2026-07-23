# plgg-test

The family's **own test runner**, built from scratch on
[plgg](/packages/plgg/) so the monorepo can drop its
dependency on a large third-party test framework (and the
recurring Dependabot churn that comes with it).

Unlike a traditional runner, plgg-test is **pipe-style**:
an assertion is a data-last function you pipe a value
through, returning a branded plgg `Result`. A test body
*returns* its assertion and the runner collects it. There
is no fluent `expect(x).toBe(y)` chain and no throw-on-
mismatch — the test API reads exactly like the rest of
plgg.

## Writing a test

The common case is one `check` call — `check(actual, ...matchers)`:

```ts
import { test, check, toBe } from "plgg-test";

test("adds", () => check(2 + 2, toBe(4)));
```

`toBe(4)` is a data-last matcher (`(actual) => Assertion`);
`check` applies it to the actual and returns the verdict.
Several matchers on one value compose — and every failure is
reported, not just the first:

```ts
import { test, check, toBe, toBeGreaterThan } from "plgg-test";

test("checks many properties at once", () =>
  check(42, toBe(42), toBeGreaterThan(10)));
```

For several independent assertions, return them with `all`
(which aggregates every failure as siblings, the way plgg's
`cast` accumulates validation errors). This is a **real,
unedited spec from the `plgg` package**:

```ts
import {
  test,
  check,
  all,
  toBe,
  okThen,
  shouldBeErr,
} from "plgg-test";
import {
  isAlphanumeric,
  asAlphanumeric,
  box,
} from "plgg";

test("isAlphanumeric and asAlphanumeric basic validation", () =>
  all([
    check(
      isAlphanumeric(box("Alphanumeric")("test123")),
      toBe(true),
    ),
    check(
      asAlphanumeric("abc123"),
      okThen((b) => toBe("abc123")(b.content)),
    ),
    check(asAlphanumeric("test-123"), shouldBeErr()),
  ]));
```

## Narrowing is data-flow, not control-flow

The traditional `assert(isOk(r)); r.content` narrows by
*throwing*. plgg-test has no throwing assertion. Instead the
value-carrying matchers (`shouldBeOk`, `shouldBeErr`,
`shouldBeSome`, …) unwrap the inner value **into the
pipeline**, so you keep composing with plgg's own `cast`:

```ts
import { test, shouldBeOk, toBe } from "plgg-test";
import { cast, asInt, int } from "plgg";

test("parses", () =>
  cast(asInt("42"), shouldBeOk(), toBe(int(42))));
```

`shouldBeOk()` yields the unwrapped value on success (and a
`Fail` otherwise), which `toBe(int(42))` then checks — a
single plgg pipeline, no `as`, no escape hatch.

## Combinators

`not` inverts a matcher; `all` aggregates; `allAsync` awaits
a list of async assertions; async bodies are just `proc`
chains. They are functions, not `.not`/`.resolves` chain
segments.

## Running it

The CLI scans source roots for `*.spec.ts`. The `plgg`
package wires it into its npm scripts:

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

The process exits non-zero on any failure (or zero
discovered tests), so it is a correct CI / agent gate.

## Trust by demonstration

An assertion is a **branded** `Result` (tagged with plgg's
own `Box`), so the runner can tell a real verdict from a
domain `Result` a body happens to return: a body that
doesn't return a genuine assertion **fails** rather than
passing vacuously — the false-green hole a return-based
model would otherwise open. The drop-shape cases (forgotten
return, un-awaited promise, swallowed `Err`, …) are each
proven to fail by a plain-`throw` meta-harness that doesn't
trust the code under test.
