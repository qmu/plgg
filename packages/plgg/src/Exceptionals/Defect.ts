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
 * The bottom error: an *unexpected* throw, normalized to data at a
 * throw-boundary (`proc`'s catch, `tryCatch`'s default). Domain code returns
 * `err(typedError)` and never produces a `Defect` itself. `cause` is a
 * serializable {@link Cause} snapshot of the thrown value (name/message/stack) —
 * so a bug stays debuggable and survives a wire boundary, while expected
 * failures carry no cause (locked decision A: typed errors are stackless).
 */
export type Defect = Box<
  "Defect",
  { message: SoftStr; cause: Option<Cause> }
>;

/**
 * Constructs a {@link Defect}. `cause` is snapshotted through {@link Cause} —
 * absent when the throw carried no value.
 */
export const defect = (
  message: SoftStr,
  cause?: unknown,
): Defect =>
  box("Defect")({
    message,
    cause: toCauseOption(cause),
  });

/**
 * Pattern matcher for folding a {@link Defect} with `match` by tag.
 */
export const defect$ = () => pattern("Defect")();
