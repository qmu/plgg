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
  attr,
} from "plgg-view";
import {
  type Styles,
  type Color,
} from "plgg-view/style";
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
 * The concrete value of each `plgg-view` {@link Color}
 * token. A boundary mirror of
 * `plgg-view/Style/model/token.ts`'s palette: `plgg-view`'s
 * Style RUNTIME (`color`/`colorValue`/`style_`) lives only
 * on the `plgg-view/style` SUBPATH, which the in-house
 * bundler — externals matched by exact bare name, no
 * subpaths — cannot externalize from a bundled sibling. So
 * the {@link Color} type is imported type-only (erased at
 * build) and its value re-resolved here. Keep in sync with
 * plgg-view; a drift is caught by `highlight.spec.ts`,
 * which asserts against plgg-view's own `color()`.
 */
const COLOR_VALUE: Readonly<
  Record<Color, SoftStr>
> = {
  surface: "#fffdf7",
  "surface-2": "#f0e9d8",
  primary: "#1f6b54",
  "primary-text": "#fbfaf3",
  text: "#2a241d",
  muted: "#8a8073",
  border: "#e6dcc8",
  danger: "#b23a2a",
};

/**
 * Map a {@link TokenKind} to its `plgg-view` {@link Color}
 * token — the single token-color authority, exhaustively
 * `match`ed over the nine kinds so adding a kind is a
 * compile error until it is colored.
 */
const tokenColor = (kind: TokenKind): Color =>
  match(kind)(
    [keyword$(), (): Color => "primary"],
    [stringKind$(), (): Color => "danger"],
    [numberKind$(), (): Color => "danger"],
    [comment$(), (): Color => "muted"],
    [identifier$(), (): Color => "text"],
    [punctuation$(), (): Color => "muted"],
    [regex$(), (): Color => "danger"],
    [template$(), (): Color => "danger"],
    [plain$(), (): Color => "text"],
  );

/**
 * The `plgg-view` {@link Styles} for a {@link TokenKind} —
 * a single `color` declaration on the kind's
 * {@link tokenColor}. Takes the kind because `Styles` is a
 * flat declaration list and cannot carry the per-kind
 * selectors a whole stylesheet would need; the
 * `plgg-press` theme calls it per kind to merge token
 * colors into the page stylesheet.
 */
export const highlightCss = (
  kind: TokenKind,
): Styles => [
  {
    prop: "color",
    value: COLOR_VALUE[tokenColor(kind)],
  },
];

/** One token kind's {@link highlightCss} as an inline `style` value. */
const inlineStyle = (
  kind: TokenKind,
): SoftStr =>
  highlightCss(kind)
    .map((d) => `${d.prop}:${d.value}`)
    .join(";");

/**
 * Fold one {@link Token} into a styled phrasing span: the
 * verbatim text (escaped at render) wrapped in a `span`
 * carrying the kind's color as an inline `style`. (Inline
 * `style` — `plgg-view`'s documented attribute hatch —
 * because its atomic `style_`/`collectCss` system is on the
 * un-bundleable `plgg-view/style` subpath; see
 * {@link COLOR_VALUE}.)
 */
const tokenToHtml = (
  tok: Token,
): Phrasing<never> =>
  span(
    [attr("style", inlineStyle(tok.content.kind))],
    [text(tok.content.text)],
  );

/**
 * Highlight TypeScript-family source: the
 * {@link tokenize} stream folded into styled `span` leaves
 * inside a typed `pre > code`. Carries no `Msg`, so it
 * slots into any `plgg-md` tree.
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
 * token coloring (the body is a single HTML-escaped text
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
