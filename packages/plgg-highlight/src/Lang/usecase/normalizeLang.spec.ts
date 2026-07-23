import {
  test,
  check,
  all,
  toEqual,
} from "plgg-test";
import { some, none } from "plgg";
import { normalizeLang } from "plgg-highlight/Lang/usecase/normalizeLang";

test("typescript and ts both normalize to ts", () =>
  all([
    check(
      normalizeLang(some("typescript")),
      toEqual(some("ts")),
    ),
    check(
      normalizeLang(some("ts")),
      toEqual(some("ts")),
    ),
  ]));

test("javascript and js both normalize to js", () =>
  all([
    check(
      normalizeLang(some("javascript")),
      toEqual(some("js")),
    ),
    check(
      normalizeLang(some("js")),
      toEqual(some("js")),
    ),
  ]));

test("tsx / jsx / json keep their forward-compat labels", () =>
  all([
    check(
      normalizeLang(some("tsx")),
      toEqual(some("tsx")),
    ),
    check(
      normalizeLang(some("jsx")),
      toEqual(some("jsx")),
    ),
    check(
      normalizeLang(some("json")),
      toEqual(some("json")),
    ),
  ]));

test("the alias lookup is case-insensitive and trimmed", () =>
  all([
    check(
      normalizeLang(some("TypeScript")),
      toEqual(some("ts")),
    ),
    check(
      normalizeLang(some("  TS  ")),
      toEqual(some("ts")),
    ),
  ]));

test("unknown languages fall back to None", () =>
  all([
    check(
      normalizeLang(some("bash")),
      toEqual(none()),
    ),
    check(
      normalizeLang(some("sh")),
      toEqual(none()),
    ),
    check(
      normalizeLang(some("json5")),
      toEqual(none()),
    ),
    check(
      normalizeLang(some("")),
      toEqual(none()),
    ),
  ]));

test("an unlabeled fence (None) stays None", () =>
  check(normalizeLang(none()), toEqual(none())));
