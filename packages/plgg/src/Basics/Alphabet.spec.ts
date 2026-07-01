import {
  test,
  check,
  all,
  toBe,
  okThen,
  shouldBeErr,
} from "plgg-test";
import {
  isAlphabet,
  asAlphabet,
  box,
} from "plgg/index";

test("isAlphabet and asAlphabet basic validation", () =>
  all([
    check(
      isAlphabet(box("Alphabet")("hello")),
      toBe(true),
    ),
    check(
      asAlphabet("test"),
      okThen((b) => toBe("test")(b.content)),
    ),
    check(asAlphabet("123"), shouldBeErr()),
  ]));
