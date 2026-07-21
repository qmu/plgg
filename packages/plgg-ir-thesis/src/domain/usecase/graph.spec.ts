import { test, check, toEqual } from "plgg-test";
import { pipe, matchOption } from "plgg";
import {
  Edge,
  findCycle,
} from "plgg-ir-thesis/domain/usecase/graph";

/**
 * The cycle a graph has, as its node-name path, or the
 * empty array when it is acyclic.
 */
const cycleOf = (
  nodes: ReadonlyArray<string>,
  edges: ReadonlyArray<Edge>,
): ReadonlyArray<string> =>
  pipe(
    findCycle(nodes, edges),
    matchOption(
      (): ReadonlyArray<string> => [],
      (c: ReadonlyArray<string>) => c,
    ),
  );

const edge = (
  from: string,
  to: string,
): Edge => ({
  from,
  to,
});

test("an acyclic chain has no cycle", () =>
  check(
    cycleOf(
      ["a", "b", "c"],
      [edge("a", "b"), edge("b", "c")],
    ),
    toEqual([]),
  ));

test("a diamond (shared sink) has no cycle", () =>
  check(
    cycleOf(
      ["a", "b", "c", "d"],
      [
        edge("a", "b"),
        edge("a", "c"),
        edge("b", "d"),
        edge("c", "d"),
      ],
    ),
    toEqual([]),
  ));

test("a two-node cycle is found", () =>
  check(
    cycleOf(
      ["x", "y"],
      [edge("x", "y"), edge("y", "x")],
    ),
    toEqual(["x", "y", "x"]),
  ));

test("a self-loop is a cycle", () =>
  check(
    cycleOf(["x"], [edge("x", "x")]),
    toEqual(["x", "x"]),
  ));

test("a cycle is found past a non-cyclic sibling edge", () =>
  check(
    cycleOf(
      ["x", "y", "z"],
      [
        edge("x", "y"),
        edge("y", "x"),
        edge("x", "z"),
      ],
    ),
    toEqual(["x", "y", "x"]),
  ));

test("an isolated already-done node is skipped", () =>
  check(
    cycleOf(["a", "b"], [edge("a", "b")]),
    toEqual([]),
  ));
