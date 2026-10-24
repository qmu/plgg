import {
  type SoftStr,
  matchOption,
  pipe,
} from "plgg";
import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Autolink,
  scanAutolink,
} from "plgg-md/Inline/usecase/autolink";

/**
 * What a scan found, rendered as `text -> href` (or `"-"`
 * for no autolink).
 *
 * Collapsing the `Option<Autolink>` to one string is what
 * makes the tables below readable: the two things each rule
 * decides are *how much* was consumed and *what protocol*
 * was implied, and both are visible at a glance — with the
 * `text`/`href` split spelled out wherever they differ.
 */
const found = (
  source: SoftStr,
  position: number = 0,
): SoftStr =>
  pipe(
    scanAutolink(source, position),
    matchOption(
      (): SoftStr => "-",
      (link: Autolink): SoftStr =>
        `${link.text} -> ${link.href}`,
    ),
  );

/** Shorthand for a form whose text and href are equal. */
const same = (url: SoftStr): SoftStr =>
  `${url} -> ${url}`;

test("the url form takes http and https verbatim", () =>
  all([
    check(
      found("http://example.com"),
      toBe(same("http://example.com")),
    ),
    check(
      found("https://example.com/a/b?c=d#e"),
      toBe(
        same("https://example.com/a/b?c=d#e"),
      ),
    ),
  ]));

// GFM also lists `ftp://` and `xmpp:`. Both are omitted on
// purpose: plgg-view's `safeUrl` rewrites every scheme but
// http/https/mailto/tel to `"#"`, so recognizing them would
// only produce anchors that look live and go nowhere.
test("the schemes plgg-view would neutralize are not recognized", () =>
  all([
    check(
      found("ftp://files.example.com/x"),
      toBe("-"),
    ),
    check(
      found("xmpp:ada@example.com"),
      toBe("-"),
    ),
  ]));

test("the url scheme is matched case-insensitively", () =>
  check(
    found("HTTPS://Example.COM/x"),
    toBe(same("HTTPS://Example.COM/x")),
  ));

test("a www host implies http:// in the href but not in the text", () =>
  all([
    check(
      found("www.example.com"),
      toBe(
        "www.example.com -> http://www.example.com",
      ),
    ),
    check(
      found("WWW.example.com"),
      toBe(
        "WWW.example.com -> http://WWW.example.com",
      ),
    ),
  ]));

test("a bare address implies mailto:", () =>
  check(
    found("ada@example.com"),
    toBe(
      "ada@example.com -> mailto:ada@example.com",
    ),
  ));

test("the mailto: form already carries its scheme", () =>
  check(
    found("mailto:ada@example.com"),
    toBe(same("mailto:ada@example.com")),
  ));

// The host must have two or more segments, so a port is
// never mistaken for a TLD and a bare hostname stays text.
test("a host without a dot is not an autolink", () =>
  all([
    check(found("http://localhost:3000"), toBe("-")),
    check(found("http://example"), toBe("-")),
    // the trailing dot comes off first, leaving one segment
    check(found("www."), toBe("-")),
  ]));

test("an underscore in either of the last two host segments disqualifies it", () =>
  all([
    check(
      found("http://example.com_x/a"),
      toBe("-"),
    ),
    check(
      found("http://ex_ample.com/a"),
      toBe("-"),
    ),
    // only the last two segments are restricted
    check(
      found("http://a_b.example.com/a"),
      toBe(same("http://a_b.example.com/a")),
    ),
  ]));

test("a host alone is not an autolink without a scheme or www", () =>
  all([
    check(found("example.com"), toBe("-")),
    check(found("notaurl"), toBe("-")),
  ]));

test("the address form needs a dotted domain and no trailing -/_", () =>
  all([
    check(found("ada@example"), toBe("-")),
    check(found("ada@example.com-"), toBe("-")),
    check(found("ada@example.com_"), toBe("-")),
    check(found("mailto:notanaddress"), toBe("-")),
    check(found("mailto:"), toBe("-")),
  ]));

// A trailing dot needs no rule of its own: every dotted
// segment of the grammar requires a character after its
// `.`, so the match simply stops short.
test("a trailing dot is left out of an address", () =>
  check(
    found("ada@example.com."),
    toBe(
      "ada@example.com -> mailto:ada@example.com",
    ),
  ));

test("the host and address grammars accept non-ASCII", () =>
  all([
    check(
      found("www.ドメイン.jp"),
      toBe(
        "www.ドメイン.jp -> http://www.ドメイン.jp",
      ),
    ),
    check(
      found("https://例え.テスト/パス"),
      toBe(same("https://例え.テスト/パス")),
    ),
    check(
      found("アダ@例え.テスト"),
      toBe(
        "アダ@例え.テスト -> mailto:アダ@例え.テスト",
      ),
    ),
  ]));

test("trailing punctuation is left out of the link", () =>
  all([
    check(
      found("https://example.com/a."),
      toBe(same("https://example.com/a")),
    ),
    check(
      found("https://example.com/a!"),
      toBe(same("https://example.com/a")),
    ),
    check(
      found("www.example.com, x"),
      toBe(
        "www.example.com -> http://www.example.com",
      ),
    ),
    // the rules re-run, so a whole run comes off
    check(
      found("https://example.com/a?b=1..."),
      toBe(same("https://example.com/a?b=1")),
    ),
  ]));

test("the same punctuation is kept in the interior", () =>
  check(
    found("https://example.com/a.b/c!d"),
    toBe(same("https://example.com/a.b/c!d")),
  ));

test("a trailing entity reference is left out, a bare semicolon is not", () =>
  all([
    check(
      found("https://example.com/?q=a&amp;"),
      toBe(same("https://example.com/?q=a")),
    ),
    // no `&…` run, so the `;` is ordinary path material
    check(
      found("https://example.com/a;"),
      toBe(same("https://example.com/a;")),
    ),
    check(
      found("https://example.com/?q=a&b=1"),
      toBe(same("https://example.com/?q=a&b=1")),
    ),
  ]));

test("a trailing paren comes off only when it is unmatched", () =>
  all([
    // balanced: the parens belong to the URL
    check(
      found("https://example.com/a_(b)"),
      toBe(same("https://example.com/a_(b)")),
    ),
    // unmatched: the URL was wrapped in parens
    check(
      found("(https://example.com/a)", 1),
      toBe(same("https://example.com/a")),
    ),
    check(
      found("https://example.com/a))"),
      toBe(same("https://example.com/a")),
    ),
    // the paren rule only becomes visible after the dot
    // rule has run, which is why the cuts are re-applied
    check(
      found("https://example.com/a)."),
      toBe(same("https://example.com/a")),
    ),
  ]));

test("an autolink opens at the start, after whitespace, or after *_~(", () =>
  all([
    check(
      found("x www.example.com", 2),
      toBe(
        "www.example.com -> http://www.example.com",
      ),
    ),
    check(
      found("*www.example.com*", 1),
      toBe(
        "www.example.com -> http://www.example.com",
      ),
    ),
    check(
      found("~www.example.com", 1),
      toBe(
        "www.example.com -> http://www.example.com",
      ),
    ),
    check(
      found("_www.example.com", 1),
      toBe(
        "www.example.com -> http://www.example.com",
      ),
    ),
  ]));

// The look-behind is the whole defence against linking a
// fragment of some larger token.
test("an autolink does not open mid-token", () =>
  all([
    check(found("see-ada@example.com", 4), toBe("-")),
    check(found("xhttp://example.com", 1), toBe("-")),
    check(found("a.www.example.com", 2), toBe("-")),
    // the URL inside an attribute must stay untouched
    check(
      found('href="http://example.com"', 6),
      toBe("-"),
    ),
  ]));

test("a bare URL's extent stops at a < so it cannot eat a tag", () =>
  check(
    found("http://example.com<br>"),
    toBe(same("http://example.com")),
  ));

// Scope line: the angle-bracketed autolink is a separate
// GFM form, queued separately, and deliberately NOT
// recognized here — `<` is not an opening boundary, so the
// scan declines rather than half-matching the inside.
test("the angle-bracketed <scheme:…> form is not this scanner's business", () =>
  all([
    check(
      found("<https://example.com>", 1),
      toBe("-"),
    ),
    check(found("<https://example.com>"), toBe("-")),
  ]));
