import {
  Box,
  SoftStr,
  box,
  pattern,
} from "plgg/index";

/**
 * Validation failure as pure tagged data — a `Box`, not an `Error` subclass.
 * `sibling` carries the nested per-field failures aggregated during a `cast`
 * (so a `match` arm reads the structured failure, not just a string). Stackless
 * by design: an expected validation failure is control flow, not a bug.
 */
export type InvalidError = Box<
  "InvalidError",
  {
    message: SoftStr;
    sibling: ReadonlyArray<InvalidError>;
  }
>;

/**
 * Constructs an {@link InvalidError}. Object-arg (mirroring the former class
 * constructor) so existing call sites migrate by dropping `new`.
 */
export const invalidError = ({
  message,
  sibling = [],
}: {
  message: SoftStr;
  sibling?: ReadonlyArray<InvalidError>;
}): InvalidError =>
  box("InvalidError")({ message, sibling });

/**
 * Pattern matcher for folding an {@link InvalidError} with `match` by tag.
 */
export const invalidError$ = () =>
  pattern("InvalidError")();
