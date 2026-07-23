import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { parseForm } from "plgg-http/index";

test("parseForm decodes pairs, plus-as-space, and percent-encoding", () =>
  check(
    parseForm(
      "a=1&b=hello+world&c=%E3%81%82&plus=1%2B1",
    ),
    toEqual({
      a: "1",
      b: "hello world",
      c: "あ",
      plus: "1+1",
    }),
  ));

test("parseForm drops empty pairs and maps bare keys to empty string", () =>
  check(
    parseForm("&a&b=2&&"),
    toEqual({ a: "", b: "2" }),
  ));

test("parseForm degrades malformed percent-sequences to the raw token", () =>
  check(
    parseForm("bad=%E0%A4%A"),
    toEqual({ bad: "%E0%A4%A" }),
  ));

test("parseForm lets later duplicates win (parseQuery parity)", () =>
  check(
    parseForm("a=1&a=2"),
    toEqual({ a: "2" }),
  ));

test("parseForm decodes keys too", () =>
  check(
    parseForm("grant%5Ftype=code"),
    toEqual({ grant_type: "code" }),
  ));

test("a __proto__ field cannot pollute the result", () => {
  const parsed = parseForm("__proto__=evil&a=1");
  return all([
    check(
      Object.prototype.hasOwnProperty.call(
        parsed,
        "__proto__",
      ),
      toBe(true),
    ),
    check(
      Object.prototype.hasOwnProperty.call(
        {},
        "evil",
      ),
      toBe(false),
    ),
    check(parsed["a"], toBe("1")),
  ]);
});

test("parseForm of the empty body is the empty Dict", () =>
  check(parseForm(""), toEqual({})));
