import {
  Result,
  InvalidError,
  ok,
  err,
  pipe,
  mapResult,
  matchResult,
} from "plgg";
import { Parser } from "plgg-parser/Parse/model/Parser";
import {
  Parsed,
  parsed,
} from "plgg-parser/Parse/model/Parsed";
import { parseError } from "plgg-parser/Parse/model/ParseError";

/**
 * Positive lookahead: run `parser` for its value but
 * consume nothing — the cursor is reset to where it started
 * on success. Propagates failure unchanged.
 */
export const lookahead =
  <A, S>(parser: Parser<A, S>): Parser<A, S> =>
  (state) =>
    pipe(
      parser(state),
      mapResult(
        (p: Parsed<A, S>): Parsed<A, S> =>
          parsed(p.value, state),
      ),
    );

/**
 * Negative lookahead: succeed (consuming nothing) exactly
 * when `parser` would fail, and fail when it would succeed.
 * The `!` PEG predicate — e.g. "a keyword not followed by
 * an identifier character".
 */
export const notFollowedBy =
  <A, S>(parser: Parser<A, S>): Parser<true, S> =>
  (state) =>
    pipe(
      parser(state),
      matchResult(
        (): Result<
          Parsed<true, S>,
          InvalidError
        > => ok(parsed(true, state)),
        (): Result<
          Parsed<true, S>,
          InvalidError
        > =>
          err(
            parseError(
              "unexpected match",
              state.position,
            ),
          ),
      ),
    );
