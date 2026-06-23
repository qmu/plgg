// The public authoring façade — the symbols specs import. Migration
// from vitest is an import-source rewrite to this module (Plan
// Amendment 2): `import { test, expect } from "plgg-test"`.
export {
  describe,
  it,
  test,
  beforeEach,
  afterEach,
} from "plgg-test/Core/Registry";

export { expect } from "plgg-test/Expect/expect";

export { assertWithFail as assert } from "plgg-test/Assert/assert";

export { vi } from "plgg-test/Mock/vi";

export {
  AssertionError,
} from "plgg-test/Core/AssertionError";
