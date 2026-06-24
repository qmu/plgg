// Fixture: NO environment directive. Proves a spec without
// `@plgg-test-environment` runs under plain Node with no DOM globals —
// so the seam is opt-in and a DOM installed for another file does not
// leak into this one. Loaded by Runner.spec.ts (and, in the leak test,
// loaded immediately AFTER the DOM fixture to prove teardown). Reading a
// possibly-absent global via `globalThis` is the cast-free way to probe
// for `document` without a compile error.
import {
  test,
  check,
  toBe,
} from "plgg-test/index";

test("document is NOT defined under plain Node", () =>
  check("document" in globalThis, toBe(false)));
