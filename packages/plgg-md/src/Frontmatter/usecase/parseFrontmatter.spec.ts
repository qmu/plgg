import {
  test,
  check,
  all,
  toBe,
  okThen,
  toEqual,
  errThen,
  toContain,
} from "plgg-test";
import { some, none, isErr } from "plgg";
import { parseFrontmatter } from "plgg-md/Frontmatter/usecase/parseFrontmatter";

// A valid YAML-SUBSET home frontmatter (D8): the block is
// now PARSED, not stripped, and `layout` is derived from
// the parsed `layout` key.
const HOME_SOURCE = [
  "---",
  "layout: home",
  "title: plgg",
  "tags:",
  "  - option",
  "  - result",
  "---",
  "",
  "# Welcome",
  "",
  "Body text.",
].join("\n");

test("derives layout from the parsed block and carries the data", () =>
  check(
    parseFrontmatter(HOME_SOURCE),
    okThen((doc) =>
      all([
        check(
          doc.frontmatter.layout,
          toEqual(some("home")),
        ),
        // the full block is parsed into `data`, not stripped
        check(
          doc.frontmatter.data.__tag,
          toBe("Some"),
        ),
      ]),
    ),
  ));

test("returns the body after the closing fence", () =>
  check(
    parseFrontmatter(HOME_SOURCE),
    okThen((doc) =>
      check(
        doc.body,
        toEqual("\n# Welcome\n\nBody text."),
      ),
    ),
  ));

test("a frontmatter-free page is returned verbatim with None data", () =>
  check(
    parseFrontmatter(
      "# Just a page\n\nNo frontmatter here.",
    ),
    okThen((doc) =>
      all([
        check(
          doc.frontmatter.layout,
          toEqual(none()),
        ),
        check(
          doc.frontmatter.data,
          toEqual(none()),
        ),
      ]),
    ),
  ));

test("a non-home layout is now derived too (not only 'home')", () =>
  check(
    parseFrontmatter(
      "---\nlayout: docs\ntitle: Hello\n---\nbody",
    ),
    okThen((doc) =>
      check(
        doc.frontmatter.layout,
        toEqual(some("docs")),
      ),
    ),
  ));

test("an unterminated frontmatter fence is an error", () =>
  check(
    parseFrontmatter(
      "---\nlayout: home\nno close here",
    ),
    errThen((e) =>
      check(
        e.content.message,
        toContain("Unterminated frontmatter"),
      ),
    ),
  ));

test("a malformed block is now a positioned error, not silently stripped", () =>
  check(
    isErr(
      parseFrontmatter(
        "---\nfeatures:\n  - { title: x }\n---\nbody",
      ),
    ),
    toBe(true),
  ));
