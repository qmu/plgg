import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  Option,
  match,
  some,
  none,
  pipe,
  matchOption,
} from "plgg";
import {
  sourcePos,
  sourceRange,
} from "plgg-ir-syntax";
import {
  ThesisNode,
  assertionNode,
  frameNode,
  isAssertionNode,
  isFrameNode,
  assertionNode$,
  frameNode$,
  assertion,
  frame,
  concept,
  parseLogicKind,
  parseAttackType,
} from "plgg-ir-thesis/domain/model";

/** A throwaway zero-width range for fixtures. */
const R = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(0, 1, 1),
);

/** A minimal assertion fixture. */
const A = assertion(
  "A",
  "因果的",
  "x",
  none(),
  [
    concept(
      "x",
      none(),
      none(),
      none(),
      false,
      none(),
      R,
    ),
  ],
  [],
  R,
);

/** A minimal frame fixture. */
const F = frame(
  "F",
  some("反論"),
  "A",
  "B",
  none(),
  [],
  [],
  [],
  [],
  R,
);

/**
 * Names a node via the exported `match` patterns —
 * exercises `assertionNode$` / `frameNode$`.
 */
const nameOf = (n: ThesisNode): string =>
  match(n)(
    [
      assertionNode$(),
      ({ content }): string => content.name,
    ],
    [
      frameNode$(),
      ({ content }): string => content.name,
    ],
  );

test("node guards narrow both variants", () =>
  all([
    check(
      isAssertionNode(assertionNode(A)),
      toBe(true),
    ),
    check(
      isFrameNode(assertionNode(A)),
      toBe(false),
    ),
    check(isFrameNode(frameNode(F)), toBe(true)),
    check(
      isAssertionNode(frameNode(F)),
      toBe(false),
    ),
  ]));

test("match patterns dispatch on the node tag", () =>
  all([
    check(nameOf(assertionNode(A)), toBe("A")),
    check(nameOf(frameNode(F)), toBe("F")),
  ]));

test("parseLogicKind accepts the seven and rejects others", () =>
  all([
    check(
      matchedName(parseLogicKind("時間的")),
      toBe("時間的"),
    ),
    check(
      matchedName(parseLogicKind("謎")),
      toBe(""),
    ),
  ]));

test("parseAttackType accepts the three and rejects others", () =>
  all([
    check(
      matchedName(parseAttackType("反駁")),
      toBe("反駁"),
    ),
    check(
      matchedName(parseAttackType("謎")),
      toBe(""),
    ),
  ]));

/**
 * Folds an `Option<string>` to its value or the empty
 * string.
 */
const matchedName = (o: Option<string>): string =>
  pipe(
    o,
    matchOption(
      (): string => "",
      (v: string): string => v,
    ),
  );
