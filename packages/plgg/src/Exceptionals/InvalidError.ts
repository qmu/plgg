import {
  Box,
  SoftStr,
  Option,
  Cause,
  box,
  pattern,
  toCauseOption,
} from "plgg/index";

/**
 * Validation failure as pure tagged data — a `Box`, not an `Error` subclass.
 * `sibling` carries the nested per-field failures aggregated during a `cast`.
 * `cause` is a serializable {@link Cause} snapshot, set only when an *unexpected*
 * throw inside a validation step is caught (normal validation failures have
 * none). Stackless otherwise: an expected validation failure is control flow.
 */
export type InvalidError = Box<
  "InvalidError",
  {
    message: SoftStr;
    sibling: ReadonlyArray<InvalidError>;
    cause: Option<Cause>;
  }
>;

/**
 * Constructs an {@link InvalidError}. Object-arg (mirroring the former class
 * constructor) so existing call sites migrate by dropping `new`. `cause` is an
 * unexpected thrown value, snapshotted through {@link Cause}.
 */
export const invalidError = ({
  message,
  sibling = [],
  cause,
}: {
  message: SoftStr;
  sibling?: ReadonlyArray<InvalidError>;
  cause?: unknown;
}): InvalidError =>
  box("InvalidError")({
    message,
    sibling,
    cause: toCauseOption(cause),
  });

/**
 * Pattern matcher for folding an {@link InvalidError} with `match` by tag.
 */
export const invalidError$ = () =>
  pattern("InvalidError")();
