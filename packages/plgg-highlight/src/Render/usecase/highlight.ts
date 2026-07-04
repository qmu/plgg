import {
  SoftStr,
  match,
  pipe,
  matchOption,
} from "plgg";
import {
  Html,
  Phrasing,
  pre,
  code,
  span,
  text,
  class_,
} from "plgg-view";
import { type Highlighter } from "plgg-md";
import {
  Token,
  TokenKind,
  keyword$,
  stringKind$,
  numberKind$,
  comment$,
  identifier$,
  punctuation$,
  regex$,
  template$,
  plain$,
} from "plgg-highlight/Token/model/Token";
import { tokenize } from "plgg-highlight/Token/usecase/tokenize";
import { normalizeLang } from "plgg-highlight/Lang/usecase/normalizeLang";

/**
 * Map a {@link TokenKind} to its CSS class — the single
 * token-class authority, exhaustively `match`ed over the
 * nine kinds so adding a kind is a compile error until it
 * is classed. Tokens carry only a semantic `tok-<kind>`
 * class, NOT an inline colour: the actual colours live in
 * the design system's Style layer (plggmatic's `syntaxCss`
 * emits `--pm-code-*` properties + the `.tok-*` rules per
 * scheme), which can therefore give them DIFFERENT palettes
 * in light and dark mode. (Inline colours could not adapt to
 * `html.dark` and could not be overridden by CSS, which is
 * why highlighting looked flat in dark mode.) The
 * `tok-<kind>` names are a pinned contract with plggmatic's
 * `SyntaxKind` — this package stays color-free and does not
 * depend on plggmatic; a cross-package spec in plggpress
 * (which depends on both) is the executable link. `identifier`
 * and `plain` are intentionally unthemed there (they inherit
 * the code block's default ink).
 */
const tokenClass = (kind: TokenKind): SoftStr =>
  match(kind)(
    [keyword$(), (): SoftStr => "tok-keyword"],
    [stringKind$(), (): SoftStr => "tok-string"],
    [numberKind$(), (): SoftStr => "tok-number"],
    [comment$(), (): SoftStr => "tok-comment"],
    [
      identifier$(),
      (): SoftStr => "tok-identifier",
    ],
    [
      punctuation$(),
      (): SoftStr => "tok-punctuation",
    ],
    [regex$(), (): SoftStr => "tok-regex"],
    [template$(), (): SoftStr => "tok-template"],
    [plain$(), (): SoftStr => "tok-plain"],
  );

/**
 * Fold one {@link Token} into a phrasing span: the
 * verbatim text (escaped at render) wrapped in a `span`
 * carrying the kind's `tok-<kind>` class. The theme
 * stylesheet colours the class per light/dark.
 */
const tokenToHtml = (
  tok: Token,
): Phrasing<never> =>
  span(
    [class_(tokenClass(tok.content.kind))],
    [text(tok.content.text)],
  );

/**
 * Highlight TypeScript-family source: the
 * {@link tokenize} stream folded into classed `span`
 * leaves inside a typed `pre > code`. Carries no `Msg`, so
 * it slots into any `plgg-md` tree.
 */
export const highlightTs = (
  src: SoftStr,
): Html<never> =>
  pre(
    [],
    [code([], tokenize(src).map(tokenToHtml))],
  );

/**
 * The plain fallback: an escaped `pre > code` with no
 * token classes (the body is a single HTML-escaped text
 * leaf — the XSS-safe default of `spike-decisions.md` §2).
 */
export const highlightPlain = (
  src: SoftStr,
): Html<never> =>
  pre([], [code([], [text(src)])]);

/**
 * The `plgg-highlight` implementation of `plgg-md`'s
 * {@link Highlighter} seam: {@link normalizeLang} the raw
 * fence token, then dispatch — any TS-scanner-set language
 * (`ts`/`tsx`/`js`/`jsx`/`json`, all routing to the same
 * scanner today) goes to {@link highlightTs}; an
 * unlabeled/unknown fence (`None`) takes
 * {@link highlightPlain}. The explicit `Highlighter`
 * return type makes the produced function assignable to
 * the seam `plgg-md` injects.
 */
export const asHighlighter =
  (): Highlighter => (lang, src) =>
    pipe(
      normalizeLang(lang),
      matchOption(
        (): Html<never> => highlightPlain(src),
        (): Html<never> => highlightTs(src),
      ),
    );
