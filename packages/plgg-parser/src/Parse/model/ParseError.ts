import {
  SoftStr,
  InvalidError,
  invalidError,
} from "plgg";

/**
 * Builds the {@link InvalidError} a parser fails with:
 * plgg's standard failure value, with the failing
 * `position` folded into the message and any per-branch
 * failures carried as `sibling`s (how {@link or} aggregates
 * the reasons every alternative was rejected). Stackless
 * data — an expected parse failure is control flow, never a
 * throw.
 */
export const parseError = (
  message: SoftStr,
  position: number,
  sibling: ReadonlyArray<InvalidError> = [],
): InvalidError =>
  invalidError({
    message: `${message} (at position ${position})`,
    sibling,
  });
