# plgg-test — Run tests

From a package directory, run `npx plgg-test src` to discover `*.spec.ts` files under `src`. Add `--watch` to rerun tests as you edit, or `--coverage` to see which lines ran.

Save this test in `src/copies.spec.ts` and run it. Change the expected count to see how a failed comparison is reported.

```ts
import { check, test, toBe } from "plgg-test";

test("counts the copies", () =>
  check(2 + 2, toBe(4)));
```

## Working with the API

`test(name, body) → void`

Return the verdict from check. Combine several checks with all so each verdict reaches the runner. For DOM tests select the DOM environment with the directive at the start of the spec file.

## Assert on the successful payload

A tag-only test can pass even when the wrong title is saved. Give okThen an assertion on the payload. An `Err` fails immediately and an `Ok` is compared with the expected value. Collect synchronous verdicts with all and promised verdicts with allAsync.

## Check the value produced by a caster

```ts
import { asStr, type Str } from "plgg";
import {
  check,
  test,
  okThen,
  toBe,
} from "plgg-test";

test("preserves the spelling of a title", () =>
  check(
    asStr("Field Notes"),
    okThen((s: Str) =>
      check(s.content, toBe("Field Notes")),
    ),
  ));
```
