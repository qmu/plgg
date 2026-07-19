import {
  test,
  check,
  toBe,
  toEqual,
} from "plgg-test";
import {
  none,
  pipe,
  matchOption,
} from "plgg";
import {
  Relation,
  relation,
} from "plgg-ir-thesis";
import { sourceRange, sourcePos } from "plgg-ir-syntax";
import {
  Path,
  findPath,
  renderPath,
} from "plgg-ir-thesis-proof/domain/usecase/reachablePath";

const RANGE = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(0, 1, 1),
);

/**
 * A relation edge `from →name→ to` with the inert
 * attributes left empty — enough for reachability.
 */
const rel = (
  name: string,
  from: string,
  to: string,
): Relation =>
  relation(
    name,
    from,
    to,
    none(),
    none(),
    none(),
    RANGE,
  );

/**
 * The trace of the first path found, or `"∅"` when none.
 */
const traceOf = (
  relations: ReadonlyArray<Relation>,
  starts: ReadonlyArray<string>,
  goal: string,
): string =>
  pipe(
    findPath(relations, starts, goal),
    matchOption(
      (): string => "∅",
      (p: Path) => renderPath(p),
    ),
  );

test("finds a direct one-edge path", () =>
  check(
    traceOf([rel("e", "A", "B")], ["A"], "B"),
    toBe("A →e→ B"),
  ));

test("backtracks past a dead-end edge to the reaching path", () =>
  check(
    traceOf(
      [
        rel("dead", "A", "B"),
        rel("e1", "A", "C"),
        rel("e2", "C", "D"),
      ],
      ["A"],
      "D",
    ),
    toBe("A →e1→ C →e2→ D"),
  ));

test("avoids a cycle and still reaches the goal", () =>
  check(
    traceOf(
      [
        rel("back", "A", "B"),
        rel("loop", "B", "A"),
        rel("e", "A", "G"),
      ],
      ["A"],
      "G",
    ),
    toBe("A →e→ G"),
  ));

test("a start that already is the goal is an empty path", () =>
  check(
    traceOf([rel("e", "A", "B")], ["G"], "G"),
    toBe("G"),
  ));

test("an unreachable goal yields no path", () =>
  check(
    pipe(
      findPath(
        [rel("e", "A", "B")],
        ["A"],
        "Z",
      ),
      matchOption(
        (): boolean => true,
        (): boolean => false,
      ),
    ),
    toBe(true),
  ));

test("tries later premises when the first reaches nothing", () =>
  check(
    traceOf(
      [rel("e", "B", "G")],
      ["A", "B"],
      "G",
    ),
    toEqual("B →e→ G"),
  ));

test("keeps the first path when a later sibling edge also could reach the goal", () =>
  check(
    traceOf(
      [rel("e1", "A", "G"), rel("e2", "A", "G")],
      ["A"],
      "G",
    ),
    toBe("A →e1→ G"),
  ));

test("keeps the first premise's path when a later premise also reaches the goal", () =>
  check(
    traceOf(
      [rel("e", "A", "G"), rel("f", "B", "G")],
      ["A", "B"],
      "G",
    ),
    toBe("A →e→ G"),
  ));
