import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { invalidError } from "plgg";
import {
  expired,
  joseErrorKind,
  joseErrorFromThrown,
  joseErrorFromInvalid,
  liftJose,
  joseError$,
} from "plgg-auth/index";

test("constructors stamp the discriminating kind", () =>
  check(
    joseErrorKind(expired("too late")),
    toBe("Expired"),
  ));

test("joseErrorFromThrown preserves an Error's message", () =>
  all([
    check(
      joseErrorKind(
        joseErrorFromThrown("KeyFailure")(
          new Error("bad modulus"),
        ),
      ),
      toBe("KeyFailure"),
    ),
    check(
      joseErrorFromThrown("KeyFailure")(
        new Error("bad modulus"),
      ).content.message,
      toBe("bad modulus"),
    ),
  ]));

test("joseErrorFromThrown folds a non-Error throw to the generic message", () =>
  check(
    joseErrorFromThrown("SignFailure")(
      "raw string failure",
    ).content.message,
    toBe("crypto operation failed"),
  ));

test("joseErrorFromInvalid re-tags a boundary InvalidError", () => {
  const e = joseErrorFromInvalid("DecodeFailure")(
    invalidError({ message: "not base64url" }),
  );
  return all([
    check(
      joseErrorKind(e),
      toBe("DecodeFailure"),
    ),
    check(
      e.content.message,
      toBe("not base64url"),
    ),
  ]);
});

test("liftJose returns Ok for a resolving operation", async () =>
  check(
    await liftJose<number>("KeyFailure")(
      async () => 42,
    ),
    okThen((n: number) => toBe(42)(n)),
  ));

test("liftJose folds a rejection into a JoseError", async () =>
  check(
    await liftJose<number>("KeyFailure")(
      async () => {
        throw new Error("subtle exploded");
      },
    ),
    errThen((e) =>
      all([
        check(e.__tag, toBe("JoseError")),
        check(
          e.content.message,
          toBe("subtle exploded"),
        ),
      ]),
    ),
  ));

test("joseError$ is a usable pattern matcher", () =>
  check(typeof joseError$, toBe("function")));
