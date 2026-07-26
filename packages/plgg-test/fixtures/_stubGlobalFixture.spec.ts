// Fixture: two tests that stub the SAME process global with different
// values and each assert they see their own. Loaded by Runner.spec.ts.
//
// There is no `@plgg-test-concurrency` directive here on purpose — the
// runner must notice `stubGlobal` from the source and schedule the file
// serially by itself. If that detection regresses, these two tests run
// concurrently, one stubs while the other reads, and at least one of
// them sees the wrong value.
//
// Each body yields to the event loop BETWEEN stubbing and reading, which
// is the window a concurrent sibling would use to overwrite the stub.
import {
  test,
  check,
  toBe,
  vi,
  afterEach,
} from "plgg-test/index";

const yieldTurn = (): Promise<void> =>
  new Promise((resolve) =>
    setTimeout(resolve, 10),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

const readMarker = (): unknown =>
  new Map(Object.entries(globalThis)).get(
    "__plggTestMarker",
  );

test("first stub survives a yield", async () => {
  vi.stubGlobal("__plggTestMarker", "first");
  await yieldTurn();
  return check(readMarker(), toBe<unknown>("first"));
});

test("second stub survives a yield", async () => {
  vi.stubGlobal("__plggTestMarker", "second");
  await yieldTurn();
  return check(
    readMarker(),
    toBe<unknown>("second"),
  );
});
