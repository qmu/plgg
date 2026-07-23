import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import {
  PossiblyPromise,
  isPromise,
  ok,
  err,
} from "plgg/index";

test("success creates successful Procedural", () =>
  check(ok("test value"), okThen(toBe("test value"))));

test("fail creates failed Procedural", () => {
  const error = new Error("test error");
  return check(err(error), errThen(toBe(error)));
});

test("PossiblyPromise accepts synchronous values", () => {
  const syncValue: PossiblyPromise<string> =
    "hello";
  return check(syncValue, toBe("hello"));
});

test("PossiblyPromise accepts asynchronous values", async () => {
  const asyncValue: PossiblyPromise<string> =
    Promise.resolve("hello");
  return check(await asyncValue, toBe("hello"));
});

test("isPromise correctly identifies Promise objects", () => {
  // Example: Conditional async handling
  const syncValue: PossiblyPromise<number> = 42;
  const asyncValue: PossiblyPromise<number> =
    Promise.resolve(42);

  // Test rejected promise without causing unhandled rejection
  const rejectedPromise = Promise.reject(
    new Error(),
  );
  rejectedPromise.catch(() => {}); // Handle the rejection

  return all([
    check(isPromise(syncValue), toBe(false)),
    check(isPromise(asyncValue), toBe(true)),
    check(
      isPromise(rejectedPromise),
      toBe(true),
    ),
  ]);
});

test("isPromise identifies thenable objects", () => {
  // Example: Testing with actual Promise instances and non-promises
  const actualPromise = Promise.resolve("test");
  const notThenable = { then: "not a function" };
  const objectWithThen = { then: () => {} };

  return all([
    check(isPromise(actualPromise), toBe(true)),
    // This is a thenable
    check(isPromise(objectWithThen), toBe(true)),
    check(isPromise(notThenable), toBe(false)),
    check(isPromise(null), toBe(false)),
    check(isPromise(undefined), toBe(false)),
    check(isPromise("string"), toBe(false)),
    check(isPromise(123), toBe(false)),
  ]);
});

test("isPromise works in async composition patterns", async () => {
  // Example: Conditional async processing
  const processValue = async (
    value: PossiblyPromise<string>,
  ) => {
    if (isPromise(value)) {
      const resolved = await value;
      return `async: ${resolved}`;
    }
    return `sync: ${value}`;
  };

  return all([
    check(
      await processValue("hello"),
      toBe("sync: hello"),
    ),
    check(
      await processValue(
        Promise.resolve("world"),
      ),
      toBe("async: world"),
    ),
  ]);
});
