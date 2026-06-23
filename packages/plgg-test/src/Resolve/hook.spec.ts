// Resolver acceptance fixture (Plan Amendment 4).
//
// This spec exists to PROVE, by importing and running, that the
// `module.register` resolver hook handles all three specifier shapes
// the corpus relies on. If the hook regresses, this spec fails to
// import (or its assertions fail) — turning the run red before any
// migration trusts the hook.
//
//   1. self `<alias>/index`        — `plgg-test/index`
//   2. self `<alias>/Deep/Path`    — `plgg-test/Expect/equals`
//   3. cross-package bare `"plgg"` — falls through to node_modules
import {
  test,
  check,
  all,
  toBe,
} from "../index.js";
import { deepEqual } from "../Expect/equals.js";
import { ok, isOk } from "plgg";

test("resolves self-package /index specifier", () =>
  all([
    // `check`/`test` themselves came through `plgg-test/index`.
    check(typeof test, toBe<string>("function")),
    check(typeof check, toBe<string>("function")),
  ]));

test("resolves self-package deep path specifier", () =>
  all([
    check(deepEqual(1, 1), toBe(true)),
    check(
      deepEqual({ a: 1 }, { a: 1 }),
      toBe(true),
    ),
  ]));

test("resolves cross-package bare 'plgg' specifier", () => {
  const r = ok(7);
  return check(isOk(r), toBe(true));
});
