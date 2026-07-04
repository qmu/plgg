import { SoftStr } from "plgg";

/**
 * The immutable cursor a {@link Parser} threads through a
 * parse: the whole `source`, the current `position` into
 * it, and a caller-defined `userState` slot `S`.
 *
 * The `userState` slot is what makes context-sensitive
 * grammars expressible without a class or mutation — a TS
 * lexer parks its "last significant token" there so `/` can
 * be disambiguated as a regex literal versus a division
 * operator. A context-free grammar simply picks a trivial
 * `S` (e.g. an empty record) and never reads it.
 */
export type ParseState<S> = Readonly<{
  source: SoftStr;
  position: number;
  userState: S;
}>;

/**
 * Builds the initial {@link ParseState} at position 0 for a
 * `source` and a seed `userState`.
 */
export const initState = <S>(
  source: SoftStr,
  userState: S,
): ParseState<S> => ({
  source,
  position: 0,
  userState,
});

/**
 * Returns a new {@link ParseState} advanced `by` characters
 * — never mutates; the old state stays valid so a failed
 * branch backtracks for free (its holder still owns the
 * pre-advance state).
 */
export const advance =
  (by: number) =>
  <S>(state: ParseState<S>): ParseState<S> => ({
    ...state,
    position: state.position + by,
  });

/**
 * Returns a new {@link ParseState} with the `userState`
 * replaced — the seam a grammar uses to carry context
 * forward (last significant token, nesting depth, …).
 */
export const putUserState =
  <S>(userState: S) =>
  (state: ParseState<S>): ParseState<S> => ({
    ...state,
    userState,
  });

/**
 * True when the cursor has reached (or passed) the end of
 * the source.
 */
export const isAtEnd = <S>(
  state: ParseState<S>,
): boolean =>
  state.position >= state.source.length;
