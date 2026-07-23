import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { some } from "plgg";
import {
  asHighlighter,
  renderToString,
} from "plggpress/framework";
import { syntaxKinds } from "plggpress/themeSupport/styleEntry";

// The cross-package seam pin (ticket 08). plgg-highlight
// emits `tok-<kind>` classes and plggmatic themes them
// through `--pm-code-*`, but NEITHER imports the other — the
// name agreement is nominal. plggpress is the one package
// that depends on both sides, so this is the only executable
// link: a rename on either side now fails here instead of
// silently shipping uncolored code.

// A fixture exercising all nine plgg-highlight TokenKinds:
// const/let (keyword), x/s/re (identifier), 1 (number),
// // c (comment), "a" (string), `t${x}` (template),
// /ab+/g (regex), =/;/+ (punctuation), and whitespace (plain).
const CODE: string =
  "const x = 1; // c\n" +
  'let s = "a" + `t${x}`;\n' +
  "const re = /ab+/g;\n";

const emitted: ReadonlyArray<string> = [
  ...new Set(
    [
      ...renderToString(
        asHighlighter()(some("ts"), CODE),
      ).matchAll(/tok-[a-z]+/g),
    ].map((m) => m[0]),
  ),
].sort();

// The classes plggmatic paints, derived from its kind array.
const themed: ReadonlyArray<string> =
  syntaxKinds.map((k) => "tok-" + k);

test("every themed syntax kind round-trips from highlighter output by class name", () =>
  check(
    themed.every((c) => emitted.includes(c)),
    toBe(true),
  ));

test("the only emitted classes plggmatic leaves unthemed are exactly tok-identifier and tok-plain", () => {
  const unthemed = emitted
    .filter((c) => !themed.includes(c))
    .sort();
  return all([
    check(unthemed.length, toBe(2)),
    check(
      unthemed.join(","),
      toBe("tok-identifier,tok-plain"),
    ),
  ]);
});
