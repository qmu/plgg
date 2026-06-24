import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import {
  isSoftStr,
  asSoftStr,
  isErr,
  concat,
  err,
  ok,
  invalidError,
} from "plgg/index";

test("isSoftStr correctly identifies string values", () =>
  all([
    // Valid strings
    check(isSoftStr("hello"), toBe(true)),
    check(isSoftStr(""), toBe(true)),
    check(isSoftStr("123"), toBe(true)),
    check(
      isSoftStr(" whitespace "),
      toBe(true),
    ),
    check(
      isSoftStr("special chars: !@#$%"),
      toBe(true),
    ),
    // Invalid types
    check(isSoftStr(123), toBe(false)),
    check(isSoftStr(true), toBe(false)),
    check(isSoftStr(null), toBe(false)),
    check(isSoftStr(undefined), toBe(false)),
    check(isSoftStr({}), toBe(false)),
    check(isSoftStr([]), toBe(false)),
    check(
      isSoftStr(Symbol("test")),
      toBe(false),
    ),
  ]));

test("asSoftStr validates and returns string values", () =>
  all([
    // Example: User input validation
    check(
      asSoftStr("user@example.com"),
      okThen(toBe("user@example.com")),
    ),
    check(asSoftStr(""), okThen(toBe(""))),
    // Example: API response validation
    check(
      asSoftStr(123),
      errThen((e) =>
        toBe("123 is not a string")(
          e.content.message,
        ),
      ),
    ),
    check(
      asSoftStr(true),
      errThen((e) =>
        toBe("true is not a string")(
          e.content.message,
        ),
      ),
    ),
    check(
      asSoftStr(null),
      errThen((e) =>
        toBe("null is not a string")(
          e.content.message,
        ),
      ),
    ),
    check(
      asSoftStr(undefined),
      errThen((e) =>
        toBe("undefined is not a string")(
          e.content.message,
        ),
      ),
    ),
  ]));

test("asSoftStr works in validation pipelines", () => {
  // Example: Email validation pipeline
  const validateEmail = (input: unknown) => {
    const strResult = asSoftStr(input);
    if (isErr(strResult)) return strResult;

    const email = strResult.content;
    return email.includes("@") &&
      email.includes(".")
      ? ok(email)
      : err(
          invalidError({
            message: "Invalid email format",
          }),
        );
  };

  return all([
    check(
      validateEmail("user@example.com"),
      okThen(toBe("user@example.com")),
    ),
    check(
      validateEmail(123),
      errThen((e) =>
        toBe("123 is not a string")(
          e.content.message,
        ),
      ),
    ),
    check(
      validateEmail("not-an-email"),
      errThen((e) =>
        toBe("Invalid email format")(
          e.content.message,
        ),
      ),
    ),
  ]);
});

test("concat concatenates strings correctly", () =>
  all([
    // Basic concatenation
    check(
      concat(" world")("hello"),
      toBe("hello world"),
    ),
    check(concat("")("test"), toBe("test")),
    // Concatenating special characters
    check(
      concat("!@#$%")("special"),
      toBe("special!@#$%"),
    ),
    // Concatenating with empty strings
    check(concat("")(""), toBe("")),
    // Concatenating with numbers as strings
    check(concat("123")("456"), toBe("456123")),
  ]));
