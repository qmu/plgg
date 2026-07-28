import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  href,
  unbase,
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
