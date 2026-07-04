import { SoftStr } from "plgg";

/**
 * The user-state slot threaded through the TS tokenizer's
 * plgg-parser grammar. `regexAllowed` records whether a `/`
 * at the cursor opens a regular-expression literal (operator
 * position) or is a division operator (after a value) — the
 * one context that makes TS lexing sensitive, and what the
 * old `ts.createScanner` tracked internally. Carried in
 * `ParseState`'s user-state slot so the grammar stays a pure
 * data-last composition.
 */
export type LexState = Readonly<{
  regexAllowed: boolean;
}>;

/** Seed state: a regex may open at the start of input. */
export const initLexState: LexState = {
  regexAllowed: true,
};

/**
 * The regex-context category a significant lexeme leaves
 * behind. Trivia (whitespace, comments) is NOT significant —
 * it leaves `regexAllowed` unchanged and never carries a
 * category.
 */
export type Category =
  | "keyword"
  | "punct"
  | "value";

/** The closing brackets after which `/` is division. */
const isCloser = (text: SoftStr): boolean =>
  text === ")" || text === "]" || text === "}";

/**
 * The `regexAllowed` value AFTER a significant token: false
 * after a value (identifier, number, string, regex,
 * template, or a closing bracket), true after a keyword or
 * any other operator/punctuation.
 */
export const nextRegexAllowed = (
  category: Category,
  text: SoftStr,
): boolean =>
  category === "keyword"
    ? true
    : category === "punct"
      ? !isCloser(text)
      : false;
