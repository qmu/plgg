import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  href,
  unbase,
  hrefFrom,
  samePath,
} from "plggpress/Href/usecase/href";

test("prefixes an internal root-absolute path with base", () =>
  check(
    href("/plgg/")("/getting-started"),
    toBe("/plgg/getting-started"),
  ));

test("leaves an external https:// link untouched", () =>
  check(
    href("/plgg/")("https://github.com/qmu/plgg"),
    toBe("https://github.com/qmu/plgg"),
  ));

test("leaves a protocol-relative link untouched", () =>
  check(
    href("/plgg/")("//cdn.example.com/x.png"),
    toBe("//cdn.example.com/x.png"),
  ));

test("leaves a bare #fragment untouched", () =>
  check(
    href("/plgg/")("#prefer-str-for-strings"),
    toBe("#prefer-str-for-strings"),
  ));

test("normalizes a typedoc .md link and prefixes base", () =>
  check(
    href("/plgg/")("/api/plgg/atomics.md"),
    toBe("/plgg/api/plgg/atomics"),
  ));

test("preserves a fragment on an internal path", () =>
  check(
    href("/plgg/")(
      "/packages/plgg/values-effects#prefer-str-for-strings",
    ),
    toBe(
      "/plgg/packages/plgg/values-effects#prefer-str-for-strings",
    ),
  ));

test("normalizes a directory /index.md link", () =>
  check(
    href("/plgg/")("/concepts/index.md"),
    toBe("/plgg/concepts/"),
  ));

test("handles a base without a trailing slash", () =>
  all([
    check(
      href("/plgg")("/getting-started"),
      toBe("/plgg/getting-started"),
    ),
    check(
      href("/")("/getting-started"),
      toBe("/getting-started"),
    ),
  ]));

test("leaves a file-relative link unprefixed", () =>
  check(
    href("/plgg/")("./neighbour.md"),
    toBe("./neighbour"),
  ));

test("samePath matches a link and the trailing-slash route for the same page", () =>
  all([
    // the discoverPaths route carries a trailing
    // slash the authored link omits
    check(
      samePath("/plgg/")(
        "/getting-started",
        "/getting-started/",
      ),
      toBe(true),
    ),
    // exact-equal links match
    check(
      samePath("/plgg/")(
        "/concepts/",
        "/concepts/",
      ),
      toBe(true),
    ),
    // the bare root stays distinct from a child
    check(
      samePath("/plgg/")(
        "/",
        "/getting-started/",
      ),
      toBe(false),
    ),
    // different pages never match
    check(
      samePath("/plgg/")(
        "/getting-started/",
        "/concepts/",
      ),
      toBe(false),
    ),
  ]));

test("unbase is the inverse of href for a deployed base", () =>
  all([
    // a base-prefixed link becomes the route the router
    // registered
    check(
      unbase("/plgg/")("/plgg/concepts/"),
      toBe("/concepts/"),
    ),
    // the base itself becomes the root route
    check(unbase("/plgg/")("/plgg/"), toBe("/")),
    // a base written without its trailing slash still
    // matches
    check(
      unbase("/plgg")("/plgg/concepts/"),
      toBe("/concepts/"),
    ),
    // a root deploy changes nothing
    check(
      unbase("/")("/concepts/"),
      toBe("/concepts/"),
    ),
    // and neither does a path that never carried the base
    check(
      unbase("/plgg/")("/concepts/"),
      toBe("/concepts/"),
    ),
  ]));

test("hrefFrom resolves a page's relative links from the page's own place", () =>
  all([
    // a sibling and a cousin, from a page inside a folder
    check(
      hrefFrom("/", "/guide/dsl")("./camera.md"),
      toBe("/guide/camera"),
    ),
    check(
      hrefFrom(
        "/",
        "/guide/dsl",
      )("../samples/space.md"),
      toBe("/samples/space"),
    ),
    // a bare relative name is a sibling too
    check(
      hrefFrom("/", "/guide/dsl")("gallery.md#x"),
      toBe("/guide/gallery#x"),
    ),
    // a route that names a directory is that directory
    check(
      hrefFrom("/", "/")("./guide/dsl.md"),
      toBe("/guide/dsl"),
    ),
    check(
      hrefFrom("/", "/guide/")("./dsl.md"),
      toBe("/guide/dsl"),
    ),
    // going above the root stops at the root
    check(
      hrefFrom("/", "/a")("../../b.md"),
      toBe("/b"),
    ),
    // the deployed base is applied after resolving
    check(
      hrefFrom(
        "/plgg/",
        "/guide/dsl",
      )("../samples/space.md"),
      toBe("/plgg/samples/space"),
    ),
    // absolute, fragment-only and external targets are
    // exactly what href makes of them
    check(
      hrefFrom("/plgg/", "/guide/dsl")("/x.md"),
      toBe("/plgg/x"),
    ),
    check(
      hrefFrom("/", "/guide/dsl")("#top"),
      toBe("#top"),
    ),
    check(
      hrefFrom(
        "/",
        "/guide/dsl",
      )("https://example.com/a.md"),
      toBe("https://example.com/a.md"),
    ),
  ]));
