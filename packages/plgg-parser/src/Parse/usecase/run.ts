import {
  SoftStr,
  Result,
  InvalidError,
  pipe,
  mapResult,
} from "plgg";
import { Parser } from "plgg-parser/Parse/model/Parser";
import { Parsed } from "plgg-parser/Parse/model/Parsed";
import { initState } from "plgg-parser/Parse/model/ParseState";

/**
 * Run a parser over a `source` string with a seed
 * `userState`, returning just the produced value (the
 * consumed-state bookkeeping is dropped at the boundary).
 * The result is a `Result` — a failed parse is an
 * {@link InvalidError}, never a throw.
 *
 * `run` does NOT require the whole input to be consumed;
 * compose the parser with `eof` (e.g.
 * `left(grammar, eof)`) when a full match is required.
 */
export const run = <A, S>(
  parser: Parser<A, S>,
  source: SoftStr,
  userState: S,
): Result<A, InvalidError> =>
  pipe(
    parser(initState(source, userState)),
    mapResult((p: Parsed<A, S>): A => p.value),
  );
