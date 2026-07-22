import {
  test,
  check,
  toEqual,
} from "plgg-test";
import {
  bearerAuth,
  versionedAuth,
} from "plgg-fetch/index";

test("bearerAuth builds an Authorization: Bearer header", () =>
  check(
    bearerAuth("tok123"),
    toEqual({ authorization: "Bearer tok123" }),
  ));

test("versionedAuth builds key + version headers under caller-named names", () =>
  check(
    versionedAuth(
      "x-api-key",
      "secret",
      "anthropic-version",
      "2026-01-01",
    ),
    toEqual({
      "x-api-key": "secret",
      "anthropic-version": "2026-01-01",
    }),
  ));
