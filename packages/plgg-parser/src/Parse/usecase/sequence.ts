import {
  Result,
  InvalidError,
  ok,
  pipe,
  mapResult,
  chainResult,
} from "plgg";
import { Parser } from "plgg-parser/Parse/model/Parser";
import {
  Parsed,
  parsed,
} from "plgg-parser/Parse/model/Parsed";

/**
 * Transform a parser's result value with `f`, leaving the
 * consumed input untouched — the functor `map`. Data-last:
 * `pipe(digit, map(Number))`.
 */
export const map =
  <A, B>(f: (a: A) => B) =>
  <S>(parser: Parser<A, S>): Parser<B, S> =>
  (state) =>
    pipe(
      parser(state),
      mapResult(
        (p: Parsed<A, S>): Parsed<B, S> =>
          parsed(f(p.value), p.state),
      ),
    );

/**
 * Monadic bind: run `parser`, then feed its value to `f` to
 * choose the next parser, threading the advanced state.
 * Short-circuits on the first `Err` like `cast`. Data-last:
 * `pipe(p, andThen(next))`.
 */
export const andThen =
  <A, B, S>(f: (a: A) => Parser<B, S>) =>
  (parser: Parser<A, S>): Parser<B, S> =>
  (state) =>
    pipe(
      parser(state),
      chainResult((p: Parsed<A, S>) =>
        f(p.value)(p.state),
      ),
    );

/**
 * Run a list of same-typed parsers in order, threading the
 * state and collecting every value; short-circuits on the
 * first failure (the `cast` shape lifted over parsers).
 */
export const seq =
  <A, S>(
    parsers: ReadonlyArray<Parser<A, S>>,
  ): Parser<ReadonlyArray<A>, S> =>
  (state) =>
    parsers.reduce<
      Result<
        Parsed<ReadonlyArray<A>, S>,
        InvalidError
      >
    >(
      (acc, parser) =>
        pipe(
          acc,
          chainResult(
            (p: Parsed<ReadonlyArray<A>, S>) =>
              pipe(
                parser(p.state),
                mapResult(
                  (
                    next: Parsed<A, S>,
                  ): Parsed<
                    ReadonlyArray<A>,
                    S
                  > =>
                    parsed(
                      [...p.value, next.value],
                      next.state,
                    ),
                ),
              ),
          ),
        ),
      ok(parsed([], state)),
    );

/**
 * Run `first` then `second`, keeping `second`'s value (the
 * `*>` combinator) — discard a leading delimiter.
 */
export const right =
  <A, B, S>(
    first: Parser<A, S>,
    second: Parser<B, S>,
  ): Parser<B, S> =>
  (state) =>
    pipe(
      first(state),
      chainResult((a: Parsed<A, S>) =>
        second(a.state),
      ),
    );

/**
 * Run `first` then `second`, keeping `first`'s value (the
 * `<*` combinator) — discard a trailing delimiter.
 */
export const left =
  <A, B, S>(
    first: Parser<A, S>,
    second: Parser<B, S>,
  ): Parser<A, S> =>
  (state) =>
    pipe(
      first(state),
      chainResult((a: Parsed<A, S>) =>
        pipe(
          second(a.state),
          mapResult(
            (b: Parsed<B, S>): Parsed<A, S> =>
              parsed(a.value, b.state),
          ),
        ),
      ),
    );
