import {
  Box,
  SoftStr,
  Option,
  box,
  pattern,
  fromNullable,
} from "plgg/index";

/**
 * The bottom error: an *unexpected* throw, normalized to data at a
 * throw-boundary (`proc`'s catch, `tryCatch`'s default). Domain code returns
 * `err(typedError)` and never produces a `Defect` itself. `cause` keeps the
 * original thrown value — usually a JS `Error` with a stack — so a bug stays
 * debuggable while expected failures carry no stack noise (locked decision A:
 * typed errors are stackless, only `Defect` holds an origin stack).
 */
export type Defect = Box<
  "Defect",
  { message: SoftStr; cause: Option<unknown> }
>;

/**
 * Constructs a {@link Defect}. `cause` is lifted through `Option` — absent when
 * the throw carried no value.
 */
export const defect = (
  message: SoftStr,
  cause?: unknown,
): Defect =>
  box("Defect")({
    message,
    cause: fromNullable(cause),
  });

/**
 * Pattern matcher for folding a {@link Defect} with `match` by tag.
 */
export const defect$ = () => pattern("Defect")();
