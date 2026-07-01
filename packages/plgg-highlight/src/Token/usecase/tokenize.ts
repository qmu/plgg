import * as ts from "typescript";
import { SoftStr } from "plgg";
import {
  Token,
  TokenKind,
  token,
  keyword,
  stringKind,
  numberKind,
  comment,
  identifier,
  punctuation,
  regex,
  template,
  plain,
} from "plgg-highlight/Token/model/Token";

/**
 * Classify one `ts.SyntaxKind` into a {@link TokenKind} by
 * comparing against the compiler's named members and range
 * markers (`FirstKeyword..LastKeyword`, etc.) — never a
 * numeric literal and never a cast. Any kind outside the
 * colored groups (trivia, JSX text, `Unknown`, …) folds to
 * {@link plain}, so the classifier is total.
 */
const classify = (
  kind: ts.SyntaxKind,
): TokenKind =>
  kind ===
    ts.SyntaxKind.SingleLineCommentTrivia ||
  kind === ts.SyntaxKind.MultiLineCommentTrivia
    ? comment()
    : kind === ts.SyntaxKind.StringLiteral
      ? stringKind()
      : kind === ts.SyntaxKind.NumericLiteral ||
          kind === ts.SyntaxKind.BigIntLiteral
        ? numberKind()
        : kind ===
            ts.SyntaxKind.RegularExpressionLiteral
          ? regex()
          : kind >=
                ts.SyntaxKind.FirstTemplateToken &&
              kind <=
                ts.SyntaxKind.LastTemplateToken
            ? template()
            : kind >= ts.SyntaxKind.FirstKeyword &&
                kind <= ts.SyntaxKind.LastKeyword
              ? keyword()
              : kind ===
                    ts.SyntaxKind.Identifier ||
                  kind ===
                    ts.SyntaxKind.PrivateIdentifier
                ? identifier()
                : kind >=
                      ts.SyntaxKind
                        .FirstPunctuation &&
                    kind <=
                      ts.SyntaxKind.LastPunctuation
                  ? punctuation()
                  : plain();

/**
 * Tokenize source into a classified token stream by
 * driving the TypeScript compiler's `createScanner` —
 * lexical-only (single file, no type-check), so
 * isolated-transpilation edge cases never bite and exotic
 * TSX only mis-colors cosmetically (`spike-decisions.md`).
 * `skipTrivia=false` keeps whitespace and comments, so the
 * tokens' `text` concatenates back to the exact input.
 * Never throws: an irregular `SyntaxKind` is classified as
 * {@link plain} rather than rejected.
 */
export const tokenize = (
  code: SoftStr,
): ReadonlyArray<Token> => {
  // Imperative seam: `createScanner` is a stateful cursor
  // — `scan()` advances and mutates the scanner's current
  // token, which `getTokenText()` then reads. Draining a
  // stateful external iterator has no pure-expression
  // form, so this is the documented exception to the
  // no-`let`/no-loop rule (a local cursor + a push
  // accumulator, both confined to this function).
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
  );
  scanner.setText(code);
  const tokens: Array<Token> = [];
  let kind = scanner.scan();
  while (kind !== ts.SyntaxKind.EndOfFileToken) {
    tokens.push(
      token(
        classify(kind),
        scanner.getTokenText(),
      ),
    );
    kind = scanner.scan();
  }
  return tokens;
};
