import {
  test,
  check,
  all,
  toBe,
  shouldBeSome,
} from "plgg-test";
import { invalidError, isSome } from "plgg";
import {
  notImplementedError,
  notImplementedError$,
  configLoadError,
  configLoadError$,
} from "plgg-press/Press/model/PressError";

test("notImplementedError carries its message", () =>
  all([
    check(
      notImplementedError("nope").__tag,
      toBe("NotImplementedError"),
    ),
    check(
      notImplementedError("nope").content
        .message,
      toBe("nope"),
    ),
    check(
      notImplementedError$().__tag,
      toBe("NotImplementedError"),
    ),
  ]));

test("configLoadError carries message and optional cause", () =>
  all([
    check(
      configLoadError({ message: "bad" })
        .content.message,
      toBe("bad"),
    ),
    check(
      isSome(
        configLoadError({
          message: "bad",
        }).content.cause,
      ),
      toBe(false),
    ),
    check(
      configLoadError({
        message: "bad",
        cause: invalidError({
          message: "field",
        }),
      }).content.cause,
      shouldBeSome(),
    ),
    check(
      configLoadError$().__tag,
      toBe("ConfigLoadError"),
    ),
  ]));
