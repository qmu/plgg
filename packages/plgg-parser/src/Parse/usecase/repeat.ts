import {
  ok,
  pipe,
  isErr,
  mapResult,
  chainResult,
} from "plgg";
import { Parser } from "plgg-parser/Parse/model/Parser";
import { ParseState } from "plgg-parser/Parse/model/ParseState";
import {
  Parsed,
  parsed,
} from "plgg-parser/Parse/model/Parsed";
import {
  map,
  andThen,
  left,
  right,
} from "plgg-parser/Parse/usecase/sequence";
import { or } from "plgg-parser/Parse/usecase/choice";
import { succeed } from "plgg-parser/Parse/usecase/primitive";

/**
 * Apply `parser` zero or more times, collecting the values;
 * always succeeds (an empty match yields `[]`).
 *
 * Iterative, not recursive: a long `<pre>` block would blow
 * the stack if each element added a frame. A zero-width
 * success is detected (position unchanged) and stops the
 * loop rather than spinning forever.
 */
export const many =
  <A, S>(
    parser: Parser<A, S>,
  ): Parser<ReadonlyArray<A>, S> =>
  (state) => {
    // Imperative seam: repeat until failure without
    // per-element recursion — a local cursor + push
    // accumulator, confined here, is the documented
    // exception to the no-let/no-loop rule (mirrors the
    // grandfathered scanner-cursor seam in plgg-md).
    const values: Array<A> = [];
    let current: ParseState<S> = state;
    for (;;) {
      const result = parser(current);
      if (isErr(result)) {
        return ok(parsed(values, current));
      }
      if (
        result.content.state.position ===
        current.position
      ) {
        // Zero-width success — stop to avoid an infinite
        // loop, keeping the (unchanged) state.
        return ok(
          parsed(values, result.content.state),
        );
      }
      values.push(result.content.value);
      current = result.content.state;
    }
  };

/**
 * Apply `parser` one or more times; fails if it never
 * matches.
 */
export const many1 =
  <A, S>(
    parser: Parser<A, S>,
  ): Parser<ReadonlyArray<A>, S> =>
  (state) =>
    pipe(
      parser(state),
      chainResult((first: Parsed<A, S>) =>
        pipe(
          many(parser)(first.state),
          mapResult(
            (
              rest: Parsed<ReadonlyArray<A>, S>,
            ): Parsed<ReadonlyArray<A>, S> =>
              parsed(
                [first.value, ...rest.value],
                rest.state,
              ),
          ),
        ),
      ),
    );

/**
 * Parse `inner` framed by `open` and `close`, keeping only
 * `inner`'s value (e.g. `between(char("("), char(")"))`).
 */
export const between =
  <O, C, S>(
    open: Parser<O, S>,
    close: Parser<C, S>,
  ) =>
  <A>(inner: Parser<A, S>): Parser<A, S> =>
    left(right(open, inner), close);

/**
 * Parse one or more `parser`s separated by `separator`,
 * keeping the values (not the separators).
 */
export const sepBy1 =
  <B, S>(separator: Parser<B, S>) =>
  <A>(
    parser: Parser<A, S>,
  ): Parser<ReadonlyArray<A>, S> =>
    pipe(
      parser,
      andThen<A, ReadonlyArray<A>, S>(
        (first: A) =>
          pipe(
            many(right(separator, parser)),
            map(
              (
                rest: ReadonlyArray<A>,
              ): ReadonlyArray<A> => [
                first,
                ...rest,
              ],
            ),
          ),
      ),
    );

/**
 * Parse zero or more `parser`s separated by `separator`; an
 * empty input yields `[]`.
 */
export const sepBy =
  <B, S>(separator: Parser<B, S>) =>
  <A>(
    parser: Parser<A, S>,
  ): Parser<ReadonlyArray<A>, S> =>
    or<ReadonlyArray<A>, S>(
      sepBy1(separator)(parser),
      succeed<ReadonlyArray<A>>([]),
    );
