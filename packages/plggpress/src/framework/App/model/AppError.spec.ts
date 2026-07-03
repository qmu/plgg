import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type InvalidError,
  isSome,
  isNone,
  isErr,
  asSoftStr,
} from "plgg";
import {
  configLoadError,
  configLoadError$,
} from "plggpress/framework/App/model/AppError";

// A real InvalidError, harvested from a failed cast, to
// populate the optional `cause`.
const anInvalidError = (): InvalidError => {
  const r = asSoftStr(42);
  if (!isErr(r)) {
    throw new Error("expected a cast failure");
  }
  return r.content;
};

test("configLoadError without a cause is a tagged box with no cause", () => {
  const e = configLoadError({ message: "boom" });
  return all([
    check(e.__tag, toBe("ConfigLoadError")),
    check(e.content.message, toBe("boom")),
    check(isNone(e.content.cause), toBe(true)),
  ]);
});

test("configLoadError with a cause carries it as Some", () => {
  const e = configLoadError({
    message: "invalid",
    cause: anInvalidError(),
  });
  return check(
    isSome(e.content.cause),
    toBe(true),
  );
});

test("configLoadError$ builds a matcher pattern for the tag", () =>
  check(
    configLoadError$() !== undefined,
    toBe(true),
  ));
