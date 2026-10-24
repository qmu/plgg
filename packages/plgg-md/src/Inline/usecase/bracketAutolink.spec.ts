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
  type BracketAutolink,
  scanBracketAutolink,
} from "plgg-md/Inline/usecase/bracketAutolink";

/**
 * What a scan found, rendered as `text -> href (n)` — `n`
 * the source length consumed — or `"-"` for no match.
 */
const found = (
  source: SoftStr,
  position: number = 0,
): SoftStr =>
  pipe(
    scanBracketAutolink(source, position),
    matchOption(
      (): SoftStr => "-",
      (
        link: BracketAutolink,
      ): SoftStr =>
        `${link.text} -> ${link.href} (${link.length})`,
    ),
  );

/** Shorthand for a form whose text and href are equal. */
const same = (
  url: SoftStr,
  length: number,
): SoftStr => `${url} -> ${url} (${length})`;

test("an absolute-URI autolink keeps its scheme verbatim and drops the brackets", () =>
  all([
    check(
      found("<http://example.com>"),
      toBe(same("http://example.com", 20)),
    ),
    check(
      found("<https://example.com/a/b?c=d>"),
      toBe(
        same(
          "https://example.com/a/b?c=d",
          29,
        ),
      ),
    ),
  ]));

test("the scheme is matched case-insensitively and kept as authored", () =>
  check(
    found("<HTTPS://Example.COM>"),
    toBe(same("HTTPS://Example.COM", 21)),
  ));

// Unlike the extended form, there is no domain check at
// all: the closing `>` is itself the whole extent rule.
test("a single-label host is a valid absolute-URI autolink", () =>
  check(
    found("<http://x>"),
    toBe(same("http://x", 10)),
  ));

// Unlike the extended form, nothing trailing is trimmed:
// the bracket already says exactly where the link ends.
test("trailing punctuation and an unmatched paren both stay inside the link", () =>
  check(
    found("<http://example.com/a).>"),
    toBe(
      same("http://example.com/a).", 24),
    ),
  ));

test("the mailto scheme is an absolute-URI match, not the email form, so the text is not doubled", () =>
  check(
    found("<mailto:ada@example.com>"),
    toBe(
      same("mailto:ada@example.com", 24),
    ),
  ));

test("the tel scheme is recognized", () =>
  check(
    found("<tel:+1-555-0100>"),
    toBe(same("tel:+1-555-0100", 17)),
  ));

// plgg-view's safeUrl neutralizes every scheme but
// http/https/mailto/tel to `href="#"`; recognizing one
// here would only produce a link that looks live and
// goes nowhere, so it is left as literal text instead.
test("a scheme plgg-view would neutralize is not recognized", () =>
  all([
    check(
      found("<ftp://files.example.com/x>"),
      toBe("-"),
    ),
    check(
      found("<javascript:alert(1)>"),
      toBe("-"),
    ),
  ]));

test("a space inside the brackets is not an absolute-URI autolink", () =>
  check(
    found("<https://example.com/a b>"),
    toBe("-"),
  ));

test("an unterminated absolute-URI form is not an autolink", () =>
  check(found("<https://example.com"), toBe("-")));

test("an email autolink gains an implied mailto: while the text stays bare", () =>
  check(
    found("<ada@example.com>"),
    toBe(
      "ada@example.com -> mailto:ada@example.com (17)",
    ),
  ));

// CommonMark names the HTML5 spec's lenient address
// regex explicitly: unlike the extended address form, no
// dotted domain is required.
test("the email form accepts a single-label domain, unlike the extended address form", () =>
  check(
    found("<a@b>"),
    toBe("a@b -> mailto:a@b (5)"),
  ));

test("the email form admits the HTML5 regex's local-part symbols", () =>
  check(
    found("<a.b+c_d-e!f#g%h@example.com>"),
    toBe(
      "a.b+c_d-e!f#g%h@example.com -> mailto:a.b+c_d-e!f#g%h@example.com (29)",
    ),
  ));

test("the host and address grammars accept non-ASCII bodies through the URI form", () =>
  check(
    found("<https://例え.テスト/パス>"),
    toBe(same("https://例え.テスト/パス", 19)),
  ));

// Unlike the extended address form, CommonMark's bracketed
// email autolink names the HTML5 regex explicitly, which is
// ASCII-only: a non-ASCII local part or domain is not an
// email match, and (lacking a `:`) not a URI match either.
test("the email form, unlike the extended address form, does not accept non-ASCII", () =>
  check(
    found("<アダ@例え.テスト>"),
    toBe("-"),
  ));

test("neither form matches text without a colon or an @", () =>
  all([
    check(found("<notaurl>"), toBe("-")),
    check(found("<example.com>"), toBe("-")),
  ]));

// `<` is itself the opening boundary: unlike the extended
// forms, nothing need precede it, so it opens mid-token
// just as readily as at the start of a line.
test("the form opens with no look-behind condition at all", () =>
  all([
    check(
      found("x<http://example.com>", 1),
      toBe(same("http://example.com", 20)),
    ),
    check(
      found("see<ada@example.com>", 3),
      toBe(
        "ada@example.com -> mailto:ada@example.com (17)",
      ),
    ),
  ]));

test("a real HTML tag is not mistaken for a scheme", () =>
  all([
    check(found("<div>"), toBe("-")),
    check(found('<a href="x">'), toBe("-")),
  ]));

test("not opening with < is never a match", () =>
  check(found("http://example.com"), toBe("-")));
