import { isSome, none, some } from "plgg";
import {
  all,
  check,
  test,
  toBe,
  toEqual,
} from "plgg-test";
import { urlFor } from "plgg-view/Html/usecase/urlFor";

test("URL uses distinguish navigation, embedded media and HTTPS reports", () => {
  const base = "https://app.example/page";
  const local = urlFor("same-origin", base);
  const report = urlFor("https-link", base);
  const web = urlFor("web-link", base);
  return all([
    check(
      local("/media/1"),
      toEqual(some("/media/1")),
    ),
    check(
      local("?page=2"),
      toEqual(some("?page=2")),
    ),
    check(
      local("https://other.example/media"),
      toEqual(none()),
    ),
    check(
      report("http://other.example/post"),
      toEqual(none()),
    ),
    check(
      isSome(
        report("https://other.example/post"),
      ),
      toBe(true),
    ),
    check(
      isSome(web("http://other.example/post")),
      toBe(true),
    ),
    ...[
      "",
      "//other.example",
      "file:/document",
      "/x y",
      "https://name@app.example",
    ].map((value) =>
      check(isSome(web(value)), toBe(false)),
    ),
    check(
      isSome(
        urlFor("same-origin", "invalid")("/x"),
      ),
      toBe(false),
    ),
  ]);
});
