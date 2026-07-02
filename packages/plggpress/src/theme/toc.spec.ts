import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
} from "plgg-test";
import { renderToString } from "plggmatic";
import { type MdHeading } from "plggmatic";
import {
  toc,
  tocHeadings,
} from "plggpress/theme/toc";

const headings: ReadonlyArray<MdHeading> = [
  { level: 1, text: "Title", slug: "title" },
  {
    level: 2,
    text: "First section",
    slug: "first-section",
  },
  {
    level: 3,
    text: "Sub point",
    slug: "sub-point",
  },
  {
    level: 5,
    text: "Too deep",
    slug: "too-deep",
  },
];

const rendered = renderToString(toc(headings));

test("tocHeadings keeps only the h2-h4 section headings", () =>
  all([
    toBe(2)(tocHeadings(headings).length),
    toBe("first-section")(
      tocHeadings(headings)[0]?.slug ?? "",
    ),
  ]));

test("renders a native details/summary 目次 with slug anchors", () =>
  all([
    check(rendered, toContain("<details")),
    check(rendered, toContain('class="vp-toc"')),
    check(rendered, toContain(">目次<")),
    check(
      rendered,
      toContain('href="#first-section"'),
    ),
    check(
      rendered,
      toContain('href="#sub-point"'),
    ),
    check(
      rendered,
      not(toContain('href="#title"')),
    ),
    check(
      rendered,
      not(toContain('href="#too-deep"')),
    ),
  ]));

test("depth-3+ entries indent via vp-toc-sub, inside a labelled nav", () =>
  all([
    check(
      rendered,
      toContain('class="vp-toc-sub"'),
    ),
    check(
      rendered,
      toContain('aria-label="Table of contents"'),
    ),
  ]));
