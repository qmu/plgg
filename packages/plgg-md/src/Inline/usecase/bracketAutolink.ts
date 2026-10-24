import {
  type Option,
  type SoftStr,
  fromNullable,
  getOr,
  isSome,
  matchOption,
  none,
  pipe,
  some,
} from "plgg";

/**
 * A recognized CommonMark **bracketed** autolink:
 * `<scheme:body>` or `<email>`.
 *
 * Unlike {@link Autolink} in `autolink.ts`, the source
 * `length` consumed (the brackets included) and the
 * rendered `text` (the brackets excluded, per
 * CommonMark: "parsed as a link … with the
 * URI/address as the link's label") are not the same
 * number of characters, so both are carried rather
 * than one being derived from the other.
 */
export type BracketAutolink = Readonly<{
  text: SoftStr;
  href: SoftStr;
  length: number;
}>;

/**
 * `<scheme:body>` — CommonMark's absolute-URI
 * autolink, case-insensitively.
 *
 * CommonMark's own grammar admits any 2–32 character
 * scheme (a letter, then 1–31 more letters, digits,
 * `+`, `.` or `-`), which is why the reference spec
 * example `<ftp://foo.bar.baz>` autolinks. This scanner
 * narrows that to the schemes plgg-view's `safeUrl`
 * (`packages/plgg-view/src/Html/usecase/escape.ts`)
 * actually renders live — `http`, `https`, `mailto`,
 * `tel` — for the same reason {@link URL_SCHEMES} and
 * {@link PROTOCOL_SCHEMES} narrow the extended forms:
 * every other scheme gets neutralized to `href="#"` at
 * render time, so recognizing it here would only turn
 * readable text into an anchor that looks live and goes
 * nowhere.
 *
 * The body is zero or more characters other than an
 * ASCII whitespace or control character, `<` or `>` —
 * `\x00`-`\x20` already covers every ASCII control
 * character *and* the space, since none of them exceeds
 * `0x20`.
 *
 * There is no domain check at all here, unlike the
 * extended forms {@link scanAutolink} implements:
 * `<http://x>` autolinks even though the bare
 * `http://x` extended form would fail the two-segment
 * host rule, and no trailing punctuation is trimmed,
 * because the closing `>` already says exactly where
 * the link ends — `<http://x.example/a).>` keeps its
 * `).` where the equivalent bare URL would not.
 */
const BRACKET_URI =
  /^(https?|mailto|tel):([^\x00-\x20\x7F<>]*)>/i;

/**
 * `<email>` — CommonMark's email autolink, matched
 * against the HTML5 spec's lenient address regex that
 * the CommonMark spec names explicitly. It is
 * deliberately not a real email grammar: a
 * single-label domain like `<a@b>` autolinks, same as
 * an HTML5 `type="email"` input would accept it, even
 * though it fails the extended address form's
 * dotted-domain requirement in `autolink.ts`.
 */
const BRACKET_EMAIL =
  /^([A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*)>/;

/**
 * A capture group of `m`, or `""` when it did not
 * participate.
 */
const group = (
  m: RegExpExecArray,
  index: number,
): SoftStr =>
  pipe(
    fromNullable(m[index]),
    getOr<SoftStr>(""),
  );

/** The absolute-URI form at the start of `rest`. */
const uriFrom = (
  rest: SoftStr,
): Option<BracketAutolink> =>
  pipe(
    fromNullable(BRACKET_URI.exec(rest)),
    matchOption(
      (): Option<BracketAutolink> => none(),
      (
        m: RegExpExecArray,
      ): Option<BracketAutolink> =>
        pipe(
          `${group(m, 1)}:${group(m, 2)}`,
          (
            uri: SoftStr,
          ): Option<BracketAutolink> =>
            some({
              text: uri,
              href: uri,
              length: group(m, 0).length + 1,
            }),
        ),
    ),
  );

/** The email form at the start of `rest`. */
const emailFrom = (
  rest: SoftStr,
): Option<BracketAutolink> =>
  pipe(
    fromNullable(BRACKET_EMAIL.exec(rest)),
    matchOption(
      (): Option<BracketAutolink> => none(),
      (
        m: RegExpExecArray,
      ): Option<BracketAutolink> =>
        pipe(
          group(m, 1),
          (
            address: SoftStr,
          ): Option<BracketAutolink> =>
            some({
              text: address,
              href: `mailto:${address}`,
              length: group(m, 0).length + 1,
            }),
        ),
    ),
  );

/**
 * Scans `source` at `position` for a CommonMark
 * **bracketed** autolink — `<scheme:body>` or
 * `<email>` — trying the absolute-URI form first,
 * which is also why `<mailto:a@b.co>` carries its text
 * through verbatim rather than gaining a second
 * `mailto:` from the email form: the URI form already
 * matches it (`mailto` is a valid scheme), so the email
 * form is never tried.
 *
 * Unlike {@link scanAutolink}, this form carries no
 * look-behind condition — the leading `<` is itself the
 * open boundary GFM's extended forms otherwise need a
 * look-behind to approximate — so it may be tried at
 * any position that opens with `<`.
 */
export const scanBracketAutolink = (
  source: SoftStr,
  position: number,
): Option<BracketAutolink> =>
  source.slice(position, position + 1) !== "<"
    ? none()
    : pipe(
        source.slice(position + 1),
        (
          rest: SoftStr,
        ): Option<BracketAutolink> =>
          pipe(
            uriFrom(rest),
            (
              found: Option<BracketAutolink>,
            ): Option<BracketAutolink> =>
              isSome(found)
                ? found
                : emailFrom(rest),
          ),
      );
