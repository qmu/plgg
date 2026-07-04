import { Result, InvalidError, ok } from "plgg";
import { Parser } from "plgg-parser/Parse/model/Parser";
import {
  ParseState,
  putUserState,
} from "plgg-parser/Parse/model/ParseState";
import {
  Parsed,
  parsed,
} from "plgg-parser/Parse/model/Parsed";

/**
 * Defer construction of a parser until it is run, so a
 * grammar can refer to itself: `const expr = or(atom,
 * lazy(() => parens))`. The single tool for recursive
 * grammars — without it a self-reference would evaluate to
 * `undefined` at module-load time.
 */
export const lazy =
  <A, S>(
    thunk: () => Parser<A, S>,
  ): Parser<A, S> =>
  (state) =>
    thunk()(state);

/**
 * Read the threaded `userState` as a parser value,
 * consuming nothing — how a grammar branches on context
 * (e.g. "was the last significant token a value?" to decide
 * regex vs division).
 */
export const getUserState = <S>(
  state: ParseState<S>,
): Result<Parsed<S, S>, InvalidError> =>
  ok(parsed(state.userState, state));

/**
 * Update the threaded `userState` with `f`, consuming
 * nothing — how a grammar records context for later parsers
 * (e.g. "remember this token as the last significant one").
 */
export const setUserState =
  <S>(f: (current: S) => S) =>
  (
    state: ParseState<S>,
  ): Result<Parsed<true, S>, InvalidError> =>
    ok(
      parsed(
        true,
        putUserState(f(state.userState))(state),
      ),
    );
