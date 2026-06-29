import {
  test,
  check,
  okThen,
  toEqual,
  errThen,
  toContain,
} from "plgg-test";
import { some, none } from "plgg";
import { parseFrontmatter } from "plgg-md/Frontmatter/usecase/parseFrontmatter";

// The real `index.md` home frontmatter head — only the
// flat `layout: home` marker is detected; the nested
// hero/features YAML is stripped, not parsed (it is
// SiteConfig data, per spike-decisions §6b).
const HOME_SOURCE = [
  "---",
  "layout: home",
  "",
  "hero:",
  '  name: "plgg"',
  '  text: "Web development as one typed pipeline"',
  "features:",
  '  - { title: "Option, not null" }',
  "---",
  "",
  "# Welcome",
  "",
  "Body text.",
].join("\n");

test("flags layout: home and strips the block", () =>
  check(
    parseFrontmatter(HOME_SOURCE),
    okThen((doc) =>
      check(
        doc.frontmatter.layout,
        toEqual(some("home")),
      ),
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

test("a frontmatter-free page is returned verbatim with None layout", () =>
  check(
    parseFrontmatter(
      "# Just a page\n\nNo frontmatter here.",
    ),
    okThen((doc) =>
      check(
        doc.frontmatter.layout,
        toEqual(none()),
      ),
    ),
  ));

test("non-home frontmatter still strips, layout None", () =>
  check(
    parseFrontmatter(
      "---\ntitle: Hello\n---\nbody",
    ),
    okThen((doc) =>
      check(
        doc.frontmatter.layout,
        toEqual(none()),
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
