import { Box, box, pattern } from "plgg";
import { Assertion } from "plgg-ir-thesis/domain/model/Assertion";
import { Frame } from "plgg-ir-thesis/domain/model/Frame";

/**
 * One analyzed top-level thesis node — the `N` the
 * language pipeline produces per top-level form. A closed
 * union: an assertion (主張) or a frame (フレーム). The
 * structure-level (ストラクチャー) survival judgment
 * (ticket 5) reads a whole node list, so it needs no node
 * of its own.
 */
export type ThesisNode =
  AssertionNode | FrameNode;

/**
 * A `(主張 ...)` node.
 */
export type AssertionNode = Box<
  "AssertionNode",
  Assertion
>;

/**
 * A `(フレーム ...)` node.
 */
export type FrameNode = Box<"FrameNode", Frame>;

/**
 * Builds an {@link AssertionNode}.
 */
export const assertionNode = (
  value: Assertion,
): AssertionNode => box("AssertionNode")(value);

/**
 * Builds a {@link FrameNode}.
 */
export const frameNode = (
  value: Frame,
): FrameNode => box("FrameNode")(value);

/**
 * Type guard: is this node an {@link AssertionNode}?
 */
export const isAssertionNode = (
  node: ThesisNode,
): node is AssertionNode =>
  node.__tag === "AssertionNode";

/**
 * Type guard: is this node a {@link FrameNode}?
 */
export const isFrameNode = (
  node: ThesisNode,
): node is FrameNode =>
  node.__tag === "FrameNode";

/** `match` pattern for an {@link AssertionNode}. */
export const assertionNode$ = () =>
  pattern("AssertionNode")();

/** `match` pattern for a {@link FrameNode}. */
export const frameNode$ = () =>
  pattern("FrameNode")();
