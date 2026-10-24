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
 * A recognized GFM **extended** autolink: the source `text`
 * the scan measured, and the `href` it points at.
 *
 * The two are not always equal, which is the whole reason
 * the href is carried rather than recomputed downstream:
 * GFM implies a protocol for the forms that omit one, so a
 * bare `www.example.com` links to `http://www.example.com`
 * and a bare `ada@example.com` to `mailto:ada@example.com`,
 * while both still *read* exactly as authored.
 */
export type Autolink = Readonly<{
  text: SoftStr;
  href: SoftStr;
}>;

/**
 * The characters that may sit immediately before an
 * extended autolink, besides whitespace. GFM allows the
 * emphasis and strikethrough markers plus an opening paren,
 * so a link survives being wrapped
 * (`(www.example.com)`) or emphasized
 * (`*www.example.com*`).
 */
const OPENERS = "*_~(";

/**
 * The trailing characters GFM refuses to absorb, so a URL
 * ending a sentence does not swallow the period. Exactly
 * the spec's eight; `)` and `;` are handled separately
 * because both are conditional.
 */
const TRAILING = "?!.,:*_~";

/**
 * The schemes the bare-URL form recognizes.
 *
 * GFM also lists `ftp://`, and its protocol form also lists
 * `xmpp:`, but both are deliberately omitted: plgg-view's
 * `safeUrl` admits only `http`, `https`, `mailto` and `tel`
 * in a URL-bearing attribute and rewrites every other
 * scheme to `"#"`. Recognizing a scheme the renderer
 * refuses to emit would turn readable text into an anchor
 * that looks live and goes nowhere — strictly worse than
 * leaving it as text. Widening that policy is a security
 * decision for plgg-view, not a side effect of this
 * scanner.
 */
const URL_SCHEMES: ReadonlyArray<SoftStr> = [
  "http://",
  "https://",
];

/** The schemes the protocol-address form recognizes. */
const PROTOCOL_SCHEMES: ReadonlyArray<SoftStr> = [
  "mailto:",
];

/** The implied-protocol host prefix. */
const WWW = "www.";

/** JavaScript's Unicode whitespace. */
const WHITESPACE = /\s/;

/** Whitespace or `<` — where a bare URL's extent stops. */
const EXTENT_END = /[\s<]/;

/**
 * A trailing run that resembles an HTML entity reference
 * (`&`, alphanumerics, `;`). GFM drops the whole run rather
 * than just the `;`, so `?a=1&amp;` links only `?a=1`.
 */
const ENTITY_TAIL = /&[\p{L}\p{N}]+;$/u;

/**
 * The complement of a host character. Host material is
 * Unicode alphanumeric plus `_`, `-` and the `.` separator:
 * deliberately Unicode-aware, because GFM treats non-ASCII
 * as valid host material, so an internationalized host like
 * `www.ドメイン.jp` autolinks instead of being cut at the
 * first multi-byte character.
 */
const NOT_HOST = /[^\p{L}\p{N}_.-]/u;

/**
 * An email address: a local part of alphanumerics, `.`,
 * `-`, `_` and `+`, an `@`, then two or more `.`-separated
 * segments of alphanumerics, `-` and `_`.
 */
const ADDRESS =
  /^[\p{L}\p{N}.\-_+]+@[\p{L}\p{N}\-_]+(?:\.[\p{L}\p{N}\-_]+)+/u;

/** A trailing `-`/`_`, which disqualifies an address. */
const ADDRESS_TAIL = /[-_]$/;

/** Whether `text` opens with a lowercase `prefix`. */
const opensWith = (
  prefix: SoftStr,
  text: SoftStr,
): boolean =>
  text.slice(0, prefix.length).toLowerCase() ===
  prefix;

/**
 * The length of whichever `schemes` entry `text` opens
 * with, case-insensitively, or `0` for none. A length
 * rather than an `Option` because `0` is already this
 * grammar's "matched nothing", and every caller goes on to
 * measure more of the same string from that offset.
 */
const schemeLength = (
  schemes: ReadonlyArray<SoftStr>,
  text: SoftStr,
): number =>
  schemes.reduce(
    (found: number, scheme: SoftStr): number =>
      found > 0 || !opensWith(scheme, text)
        ? found
        : scheme.length,
    0,
  );

/**
 * The length of `re`'s match at the start of `text`, or `0`
 * when it does not match. Every `re` here is `^`-anchored
 * and carries neither `g` nor `y`, so none holds a
 * `lastIndex` and all are safe to share at module scope.
 */
const matchLength = (
  re: RegExp,
  text: SoftStr,
): number =>
  pipe(
    fromNullable(re.exec(text)),
    matchOption(
      (): number => 0,
      (m: RegExpExecArray): number =>
        pipe(
          fromNullable(m[0]),
          getOr<SoftStr>(""),
        ).length,
    ),
  );

/**
 * The index just past a bare URL's extent: everything that
 * is neither whitespace nor `<`. Stopping at `<` is what
 * lets a URL butt against inline HTML
 * (`http://x.example<br>`) without eating the tag.
 */
const extentEnd = (text: SoftStr): number =>
  pipe(
    text.search(EXTENT_END),
    (i: number): number =>
      i < 0 ? text.length : i,
  );

/** The leading host run, up to the first non-host char. */
const hostOf = (text: SoftStr): SoftStr =>
  pipe(
    text.search(NOT_HOST),
    (i: number): SoftStr =>
      i < 0 ? text : text.slice(0, i),
  );

/**
 * GFM's valid-domain test: two or more non-empty
 * `.`-separated segments, with no `_` in the last two.
 *
 * Both halves earn their keep. The underscore rule is what
 * keeps `http://example.com_x/` literal, and the
 * two-segment minimum is what keeps
 * `http://localhost:3000` literal — a port is not host
 * material, so `localhost` stands alone and fails.
 */
const isValidHost = (host: SoftStr): boolean =>
  pipe(
    host.split("."),
    (segments: ReadonlyArray<SoftStr>): boolean =>
      segments.length >= 2 &&
      segments.every(
        (s: SoftStr): boolean => s !== "",
      ) &&
      segments
        .slice(-2)
        .every(
          (s: SoftStr): boolean =>
            !s.includes("_"),
        ),
  );

/** How many times the character `ch` occurs in `text`. */
const occurrences = (
  text: SoftStr,
  ch: SoftStr,
): number => text.split(ch).length - 1;

/** Drops an entity-looking trailing run (the `;` rule). */
const cutEntity = (text: SoftStr): SoftStr =>
  text.replace(ENTITY_TAIL, "");

/** Drops one unconditional trailing punctuation mark. */
const cutPunctuation = (
  text: SoftStr,
): SoftStr =>
  text !== "" &&
  TRAILING.includes(text.slice(-1))
    ? text.slice(0, -1)
    : text;

/**
 * Drops a trailing `)` only when it is unmatched, so
 * `(see http://x.example/a)` keeps the paren out of the
 * link while `http://x.example/a_(b)` keeps it in.
 */
const cutParen = (text: SoftStr): SoftStr =>
  text.endsWith(")") &&
  occurrences(text, ")") >
    occurrences(text, "(")
    ? text.slice(0, -1)
    : text;

/**
 * Strips GFM's trailing punctuation, re-running all three
 * rules after every cut because they compose:
 * `http://x.example/a).` loses the `.` first, and only that
 * exposes the now-unmatched `)`.
 */
const trimTrailing = (text: SoftStr): SoftStr =>
  pipe(
    cutParen(cutPunctuation(cutEntity(text))),
    (cut: SoftStr): SoftStr =>
      cut === text ? text : trimTrailing(cut),
  );

/** Builds an {@link Autolink} under an implied `protocol`. */
const autolinkOf = (
  text: SoftStr,
  protocol: SoftStr,
): Option<Autolink> =>
  some({ text, href: `${protocol}${text}` });

/**
 * Completes a host-bearing form: take the extent, trim the
 * trailing punctuation, and require a valid host at
 * `hostAt`.
 *
 * `protocol` is prepended to the href — empty for a URL
 * that already carries its scheme, `http://` for a bare
 * `www.` host. The `www.` case must not be left
 * protocol-less: the renderer hands every href to an
 * injected link resolver, which would read a bare
 * `www.example.com` as a site-relative path and prefix the
 * deploy base onto it.
 */
const hostedForm = (
  text: SoftStr,
  hostAt: number,
  protocol: SoftStr,
): Option<Autolink> =>
  pipe(
    trimTrailing(
      text.slice(0, extentEnd(text)),
    ),
    (matched: SoftStr): Option<Autolink> =>
      isValidHost(hostOf(matched.slice(hostAt)))
        ? autolinkOf(matched, protocol)
        : none(),
  );

/** `http://…` and `https://…`, href as authored. */
const urlForm = (
  text: SoftStr,
): Option<Autolink> =>
  pipe(
    schemeLength(URL_SCHEMES, text),
    (scheme: number): Option<Autolink> =>
      scheme === 0
        ? none()
        : hostedForm(text, scheme, ""),
  );

/** `www.…`, linked through an implied `http://`. */
const wwwForm = (
  text: SoftStr,
): Option<Autolink> =>
  opensWith(WWW, text)
    ? hostedForm(text, 0, "http://")
    : none();

/**
 * The length of the address at the start of `text`, or `0`.
 *
 * GFM's address grammar is narrower than the host grammar
 * above: segments take alphanumerics, `-` and `_` only, at
 * least one `.` is required, and a trailing `-`/`_`
 * disqualifies the address outright rather than being
 * trimmed — so `ada@x.example-` stays literal text. A
 * trailing `.` needs no rule at all: every dotted segment
 * requires a character after its `.`, so `ada@x.example.`
 * matches just `ada@x.example`.
 */
const addressLength = (
  text: SoftStr,
): number =>
  pipe(
    matchLength(ADDRESS, text),
    (length: number): number =>
      length > 0 &&
      !ADDRESS_TAIL.test(text.slice(0, length))
        ? length
        : 0,
  );

/**
 * The length of a `mailto:` match, or `0`. The scheme alone
 * is not enough — a bare `mailto:` with no address after it
 * links nothing.
 */
const protocolLength = (
  text: SoftStr,
): number =>
  pipe(
    schemeLength(PROTOCOL_SCHEMES, text),
    (scheme: number): number =>
      scheme === 0
        ? 0
        : pipe(
            addressLength(text.slice(scheme)),
            (address: number): number =>
              address === 0 ? 0 : scheme + address,
          ),
  );

/** `mailto:…`, already carrying its scheme. */
const protocolForm = (
  text: SoftStr,
): Option<Autolink> =>
  pipe(
    protocolLength(text),
    (length: number): Option<Autolink> =>
      length === 0
        ? none()
        : autolinkOf(text.slice(0, length), ""),
  );

/** A bare address, linked through an implied `mailto:`. */
const addressForm = (
  text: SoftStr,
): Option<Autolink> =>
  pipe(
    addressLength(text),
    (length: number): Option<Autolink> =>
      length === 0
        ? none()
        : autolinkOf(
            text.slice(0, length),
            "mailto:",
          ),
  );

/**
 * The four forms, in the order GFM lists them. The order is
 * documentation rather than precedence: they are disjoint
 * on their opening characters, and a `mailto:` target can
 * never satisfy {@link addressForm}, whose local part
 * admits no `:`.
 */
const FORMS: ReadonlyArray<
  (text: SoftStr) => Option<Autolink>
> = [urlForm, wwwForm, protocolForm, addressForm];

/**
 * GFM's opening condition: an extended autolink may begin
 * only at the start of the input, after whitespace, or
 * after one of {@link OPENERS}.
 *
 * This is a look BEHIND the cursor — the reason the scan
 * takes the whole `source` and an index rather than just
 * the remaining text — and it is what keeps the address in
 * `see-ada@x.example` and the URL inside
 * `href="http://x.example"` from linking mid-token.
 */
const canOpen = (
  source: SoftStr,
  position: number,
): boolean =>
  position === 0 ||
  pipe(
    source.slice(position - 1, position),
    (previous: SoftStr): boolean =>
      WHITESPACE.test(previous) ||
      OPENERS.includes(previous),
  );

/**
 * Scans `source` at `position` for one GFM **extended**
 * autolink — the delimiter-less forms (`http://…`, `www.…`,
 * `mailto:…`, a bare address) that GFM recognizes in
 * running prose, as opposed to the `<scheme:…>` form that
 * wears angle brackets and is NOT handled here.
 *
 * Pure and positional, so the inline scanner can try it at
 * every cursor without threading any parser state: `None`
 * answers both "no form matches" and "the cursor is
 * mid-token", where GFM forbids an autolink from opening. A
 * `Some` always carries a non-empty `text`, because every
 * form requires at least a valid host or address — which is
 * what lets the caller consume it and make progress.
 */
export const scanAutolink = (
  source: SoftStr,
  position: number,
): Option<Autolink> =>
  canOpen(source, position)
    ? pipe(
        source.slice(position),
        (text: SoftStr): Option<Autolink> =>
          FORMS.reduce<Option<Autolink>>(
            (
              matched: Option<Autolink>,
              form: (
                t: SoftStr,
              ) => Option<Autolink>,
            ): Option<Autolink> =>
              isSome(matched)
                ? matched
                : form(text),
            none(),
          ),
      )
    : none();
