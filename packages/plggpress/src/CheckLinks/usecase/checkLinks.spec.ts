import {
  test,
  check,
  all,
  toBe,
  toContain,
  toHaveLength,
  shouldBeOk,
  errThen,
} from "plgg-test";
import {
  type PageLinks,
  pageLinks,
} from "plggpress/CheckLinks/model/CheckLinks";
import { checkLinks } from "plggpress/CheckLinks/usecase/checkLinks";

const BASE = "/plgg/";

// A two-page corpus. `guide` links out to `option`; the
// `option` page carries two heading slugs. Links are stored
// base-prefixed, exactly as the `href` resolver emits them.
const guide = (
  links: ReadonlyArray<string>,
): PageLinks => pageLinks("/guide/", [], links);

const option: PageLinks = pageLinks(
  "/concepts/option/",
  ["overview", "usage"],
  [],
);

const run = (page: PageLinks) =>
  checkLinks(BASE)([page, option]);

test("passes a valid path link (trailing-slash equivalence)", () =>
  // emitted without a trailing slash; the route set has one
  check(
    run(guide(["/plgg/concepts/option"])),
    shouldBeOk(),
  ));

test("fails a link to a non-existent route", () =>
  check(
    run(guide(["/plgg/concepts/nope"])),
    errThen((e) =>
      all([
        toBe("BrokenLinks")(e.__tag),
        toHaveLength(1)(e.content.broken),
        toContain("/plgg/concepts/nope")(
          e.content.broken.map((b) => b.href),
        ),
      ]),
    ),
  ));

test("the link-ignore predicate skips a link to a non-page path", () =>
  all([
    // A page linking to an existing non-page file (a
    // download at an extensionless path) is not a route —
    // without an ignore it fails the build.
    check(
      run(guide(["/plgg/downloads/report"])),
      errThen((e) =>
        toBe("BrokenLinks")(e.__tag),
      ),
    ),
    // With an ignore predicate matching it, the same link
    // is skipped and the corpus passes.
    check(
      checkLinks(BASE, (href: string): boolean =>
        href.startsWith("/plgg/downloads/"),
      )([
        guide(["/plgg/downloads/report"]),
        option,
      ]),
      shouldBeOk(),
    ),
  ]));

test("passes a link to an existing #anchor on the target page", () =>
  check(
    run(guide(["/plgg/concepts/option#usage"])),
    shouldBeOk(),
  ));

test("fails a link to a non-existent #anchor on the target page", () =>
  check(
    run(guide(["/plgg/concepts/option#missing"])),
    errThen((e) =>
      all([
        toBe("BrokenLinks")(e.__tag),
        toHaveLength(1)(e.content.broken),
      ]),
    ),
  ));

test("excludes the synthetic 404 page from route expectations", () =>
  all([
    check(
      run(guide(["/plgg/404.html"])),
      shouldBeOk(),
    ),
    check(
      run(guide(["/plgg/404"])),
      shouldBeOk(),
    ),
  ]));

test("treats a trailing '#' as no fragment", () =>
  check(
    run(guide(["/plgg/concepts/option#"])),
    shouldBeOk(),
  ));

test("ignores a base-mismatched / file-relative link", () =>
  check(
    run(guide(["neighbour/", "/elsewhere"])),
    shouldBeOk(),
  ));

test("validates against the route set under the root base", () =>
  all([
    check(
      checkLinks("/")([
        pageLinks(
          "/guide/",
          [],
          ["/concepts/option"],
        ),
        pageLinks("/concepts/option/", [], []),
      ]),
      shouldBeOk(),
    ),
    // root base: a non-root-absolute link is ignored
    check(
      checkLinks("/")([
        pageLinks("/guide/", [], ["relative"]),
      ]),
      shouldBeOk(),
    ),
    // root base: a root-absolute miss still fails
    check(
      checkLinks("/")([
        pageLinks("/guide/", [], ["/ghost"]),
      ]),
      errThen((e) =>
        toBe("BrokenLinks")(e.__tag),
      ),
    ),
  ]));

test("validates a bare in-page #anchor against the source page's own slugs", () =>
  all([
    check(
      checkLinks(BASE)([
        pageLinks(
          "/concepts/option/",
          ["overview", "usage"],
          ["#usage"],
        ),
      ]),
      shouldBeOk(),
    ),
    check(
      checkLinks(BASE)([
        pageLinks(
          "/concepts/option/",
          ["overview", "usage"],
          ["#nope"],
        ),
      ]),
      errThen((e) =>
        toBe("BrokenLinks")(e.__tag),
      ),
    ),
  ]));

test("ignores external links and image assets", () =>
  check(
    run(
      guide([
        "https://example.com/x",
        "//cdn.example.com/y.png",
        "/plgg/logo.png",
      ]),
    ),
    shouldBeOk(),
  ));

test("collects every offender across the corpus", () =>
  check(
    run(
      guide([
        "/plgg/concepts/nope",
        "/plgg/concepts/option#missing",
      ]),
    ),
    errThen((e) =>
      toHaveLength(2)(e.content.broken),
    ),
  ));
