import { Box } from "plgg/index";

/**
 * Tag for untagged values wrapped as Box.
 */
export const UNTAGGED_TAG =
  "__untagged__" as const;

/**
 * A Box variant for values that were not originally tagged.
 */
export type UntaggedBox<CONTENT> = Box<
  typeof UNTAGGED_TAG,
  CONTENT
>;

/**
 * Creates a new UntaggedBox wrapping the given content.
 */
export const untaggedBox = <CONTENT>(
  content: CONTENT,
): UntaggedBox<CONTENT> => ({
  __tag: UNTAGGED_TAG,
  content,
});
