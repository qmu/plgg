// @plgg-test-environment happy-dom
//
// Fixture: proves the DOM-environment seam installs happy-dom BEFORE
// the spec module evaluates. The element below is built at MODULE-EVAL
// time (top level), so if `document` were not already on `globalThis`
// the file would fail to load — exactly the guarantee a real DOM spec
// (which reads `window.happyDOM` at the top level) depends on. Loaded by
// Runner.spec.ts.
import {
  test,
  check,
  all,
  toBe,
} from "plgg-test/index";

// Module-eval-time DOM access — the load-before-import guarantee.
const eager = document.createElement("div");
eager.textContent = "hi";

test("document is available inside a test body", () =>
  all([
    check(
      typeof document.createElement,
      toBe<string>("function"),
    ),
    check(eager.textContent, toBe("hi")),
  ]));

test("window points at the happy-dom window", () =>
  check(
    typeof window.document,
    toBe<string>("object"),
  ));

test("an element has getBoundingClientRect", () => {
  const el = document.createElement("span");
  return check(
    typeof el.getBoundingClientRect,
    toBe<string>("function"),
  );
});
