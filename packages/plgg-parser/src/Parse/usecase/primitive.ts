import {
  SoftStr,
  Result,
  InvalidError,
  ok,
  err,
  pipe,
  fromNullable,
  matchOption,
} from "plgg";
import {
  ParseState,
  advance,
  isAtEnd,
} from "plgg-parser/Parse/model/ParseState";
import {
  Parsed,
  parsed,
} from "plgg-parser/Parse/model/Parsed";
import { parseError } from "plgg-parser/Parse/model/ParseError";

/**
 * The atomic parser: consume the current character when it
 * satisfies `predicate`, else fail with `label` in the
 * message. Every other character-level primitive
 * ({@link char}, {@link oneOf}, {@link digit}, …) is a
 * `satisfy` with a different predicate. End-of-input is a
 * failure, never a throw.
 */
export const satisfy =
  (
    label: SoftStr,
    predicate: (ch: SoftStr) => boolean,
  ) =>
  <S>(
    state: ParseState<S>,
  ): Result<Parsed<SoftStr, S>, InvalidError> =>
    pipe(
      fromNullable(state.source[state.position]),
      matchOption(
        (): Result<
          Parsed<SoftStr, S>,
          InvalidError
        > =>
          err(
            parseError(
              `expected ${label} but reached end of input`,
              state.position,
            ),
          ),
        (
          ch: SoftStr,
        ): Result<
          Parsed<SoftStr, S>,
          InvalidError
        > =>
          predicate(ch)
            ? ok(parsed(ch, advance(1)(state)))
            : err(
                parseError(
                  `expected ${label} but found ${JSON.stringify(ch)}`,
                  state.position,
                ),
              ),
      ),
    );

/**
 * Consume any single character; fails only at end of input.
 */
export const anyChar = satisfy(
  "any character",
  (): boolean => true,
);

/**
 * Succeed only at end of input, consuming nothing.
 */
export const eof = <S>(
  state: ParseState<S>,
): Result<Parsed<true, S>, InvalidError> =>
  isAtEnd(state)
    ? ok(parsed(true, state))
    : err(
        parseError(
          "expected end of input",
          state.position,
        ),
      );

/**
 * A parser that always succeeds with `value`, consuming
 * nothing — the `of`/`pure` of the parser applicative.
 */
export const succeed =
  <A>(value: A) =>
  <S>(
    state: ParseState<S>,
  ): Result<Parsed<A, S>, InvalidError> =>
    ok(parsed(value, state));

/**
 * A parser that always fails with `message`, consuming
 * nothing.
 */
export const fail =
  (message: SoftStr) =>
  <S>(
    state: ParseState<S>,
  ): Result<Parsed<never, S>, InvalidError> =>
    err(parseError(message, state.position));

/**
 * Match the exact string `expected` at the cursor.
 */
export const literal =
  (expected: SoftStr) =>
  <S>(
    state: ParseState<S>,
  ): Result<Parsed<SoftStr, S>, InvalidError> =>
    state.source.startsWith(
      expected,
      state.position,
    )
      ? ok(
          parsed(
            expected,
            advance(expected.length)(state),
          ),
        )
      : err(
          parseError(
            `expected ${JSON.stringify(expected)}`,
            state.position,
          ),
        );

/**
 * Match one specific character.
 */
export const char = (expected: SoftStr) =>
  satisfy(
    JSON.stringify(expected),
    (ch: SoftStr): boolean => ch === expected,
  );

/**
 * Match any one character contained in `chars`.
 */
export const oneOf = (chars: SoftStr) =>
  satisfy(
    `one of ${JSON.stringify(chars)}`,
    (ch: SoftStr): boolean => chars.includes(ch),
  );

/**
 * Match any one character NOT contained in `chars`.
 */
export const noneOf = (chars: SoftStr) =>
  satisfy(
    `none of ${JSON.stringify(chars)}`,
    (ch: SoftStr): boolean => !chars.includes(ch),
  );

/**
 * Match one ASCII decimal digit `0`–`9`.
 */
export const digit = satisfy(
  "digit",
  (ch: SoftStr): boolean =>
    ch >= "0" && ch <= "9",
);

/**
 * Match one ASCII letter `a`–`z` / `A`–`Z`.
 */
export const letter = satisfy(
  "letter",
  (ch: SoftStr): boolean =>
    (ch >= "a" && ch <= "z") ||
    (ch >= "A" && ch <= "Z"),
);

/**
 * Match one ASCII letter or digit.
 */
export const alphaNum = satisfy(
  "letter or digit",
  (ch: SoftStr): boolean =>
    (ch >= "a" && ch <= "z") ||
    (ch >= "A" && ch <= "Z") ||
    (ch >= "0" && ch <= "9"),
);

/**
 * Match one whitespace character (space, tab, newline,
 * carriage return).
 */
export const whitespace = satisfy(
  "whitespace",
  (ch: SoftStr): boolean =>
    ch === " " ||
    ch === "\t" ||
    ch === "\n" ||
    ch === "\r",
);
