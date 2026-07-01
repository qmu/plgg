import {
  test,
  check,
  toBe,
  toEqual,
  okThen,
  errThen,
  toContain,
} from "plgg-test";
import { match, none } from "plgg";
import {
  Block,
  asHeadingLevel,
  isHeadingLevel,
  heading,
  para,
  codeFence,
  list,
  quote,
  table,
  callout,
  thematicBreak,
  isHeading,
  isPara,
  isCodeFence,
  isList,
  isQuote,
  isTable,
  isCallout,
  isThematicBreak,
  heading$,
  para$,
  codeFence$,
  list$,
  quote$,
  table$,
  callout$,
  thematicBreak$,
} from "plgg-md/Block/model/Block";

test("asHeadingLevel accepts 1-6", () =>
  check(asHeadingLevel(3), okThen(toBe(3))));

test("asHeadingLevel rejects out-of-range", () =>
  check(
    asHeadingLevel(7),
    errThen((e) =>
      check(
        e.content.message,
        toContain("out of range"),
      ),
    ),
  ));

test("asHeadingLevel rejects non-integer", () =>
  check(
    asHeadingLevel(2.5),
    errThen((e) =>
      check(
        e.content.message,
        toContain("out of range"),
      ),
    ),
  ));

test("isHeadingLevel guards the range", () =>
  check(
    [
      isHeadingLevel(1),
      isHeadingLevel(6),
      isHeadingLevel(0),
      isHeadingLevel(7),
    ],
    toEqual([true, true, false, false]),
  ));

test("constructors build tagged boxes", () =>
  check(
    heading(2, "Hi"),
    toEqual({
      __tag: "Heading",
      content: { level: 2, text: "Hi" },
    }),
  ));

test("guards recognize their own variant only", () =>
  check(
    [
      isHeading(heading(1, "a")),
      isPara(para("p")),
      isCodeFence(codeFence(none(), "x")),
      isList(list(false, [])),
      isQuote(quote([])),
      isTable(table([], [], [])),
      isCallout(callout("tip", none(), [])),
      isThematicBreak(thematicBreak()),
      isHeading(para("not a heading")),
    ],
    toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
    ]),
  ));

test("the $-matchers fold a block exhaustively", () => {
  const label = (b: Block): string =>
    match(b)(
      [heading$(), (): string => "Heading"],
      [para$(), (): string => "Para"],
      [codeFence$(), (): string => "CodeFence"],
      [list$(), (): string => "List"],
      [quote$(), (): string => "Quote"],
      [table$(), (): string => "Table"],
      [callout$(), (): string => "Callout"],
      [
        thematicBreak$(),
        (): string => "ThematicBreak",
      ],
    );
  return check(
    [
      label(heading(1, "x")),
      label(para("y")),
      label(codeFence(none(), "z")),
      label(list(false, [])),
      label(quote([])),
      label(table([], [], [])),
      label(callout("tip", none(), [])),
      label(thematicBreak()),
    ],
    toEqual([
      "Heading",
      "Para",
      "CodeFence",
      "List",
      "Quote",
      "Table",
      "Callout",
      "ThematicBreak",
    ]),
  );
});
