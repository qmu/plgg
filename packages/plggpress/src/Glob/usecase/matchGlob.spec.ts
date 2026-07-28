import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  matchGlob,
  matchesAnyGlob,
} from "plggpress/Glob/usecase/matchGlob";

test("matchGlob: ** spans path separators", () =>
  all([
    check(
      matchGlob("**/drafts/**")(
        "/a/b/drafts/x/y",
      ),
      toBe(true),
    ),
    check(
      matchGlob("**/drafts/**")("/a/b/pages/x"),
      toBe(false),
    ),
  ]));

test("matchGlob: * stays within a path segment", () =>
  all([
    check(
      matchGlob("/downloads/*")(
        "/downloads/report",
      ),
      toBe(true),
    ),
    check(
      matchGlob("/downloads/*")(
        "/downloads/2024/report",
      ),
      toBe(false),
    ),
  ]));

test("matchGlob: literals are literal and ? is one non-slash char", () =>
  all([
    check(
      matchGlob("/data/foo.json")(
        "/data/foo.json",
      ),
      toBe(true),
    ),
    check(
      matchGlob("/data/foo.json")(
        "/data/fooXjson",
      ),
      toBe(false),
    ),
    check(matchGlob("/v?")("/v1"), toBe(true)),
    check(matchGlob("/v?")("/v12"), toBe(false)),
  ]));

test("matchesAnyGlob: matches on any pattern; empty list matches nothing", () =>
  all([
    check(
      matchesAnyGlob(["/a/**", "/b/**"])("/b/x"),
      toBe(true),
    ),
    check(
      matchesAnyGlob(["/a/**"])("/c/x"),
      toBe(false),
    ),
    check(
      matchesAnyGlob([])("/anything"),
      toBe(false),
    ),
  ]));
