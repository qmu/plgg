import { SoftStr } from "plgg";
import { TokTag } from "plgg-parser/Demo/model/Tok";

/**
 * The user-state slot threaded through the TS-lexer parse.
 * `regexAllowed` records whether a `/` at the cursor should
 * open a regular-expression literal (operator position) or
 * be a division operator (after a value) — the one piece of
 * context that makes TS lexing sensitive, and the reason
 * {@link ParseState} carries a user-state slot at all.
 */
export type LexState = Readonly<{
  regexAllowed: boolean;
}>;

/** The seed state: a regex may open at the start of input. */
export const initLexState: LexState = {
  regexAllowed: true,
};

/** The closing brackets after which `/` is division. */
const isCloser = (text: SoftStr): boolean =>
  text === ")" || text === "]" || text === "}";

/**
 * The `regexAllowed` value AFTER a significant token of
 * `kind`/`text`: false after a value (identifier, number,
 * string, regex, template, or a closing bracket), true after
 * a keyword or any other operator/punctuation. Trivia
 * (whitespace, comments) does not call this — it leaves the
 * flag unchanged.
 */
export const nextRegexAllowed = (
  kind: TokTag,
  text: SoftStr,
): boolean =>
  kind === "Keyword"
    ? true
    : kind === "Punctuation"
      ? !isCloser(text)
      : kind === "Identifier" ||
          kind === "Number" ||
          kind === "String" ||
          kind === "Regex" ||
          kind === "Template"
        ? false
        : true;
