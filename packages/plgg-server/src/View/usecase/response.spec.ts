import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { p, main_, text } from "plgg-view";
import {
  viewResponse,
  pageResponse,
  javascriptResponse,
} from "plgg-server/index";

test("viewResponse is a text/html response carrying the rendered markup", () => {
  const r = viewResponse(p([], [text("hi")]));
  return all([
    check(r.status.content, toBe(200)),
    check(
      r.headers["content-type"],
      toBe("text/html; charset=utf-8"),
    ),
    check(r.body, toBe("<p>hi</p>")),
  ]);
});

test("pageResponse renders a full document", () => {
  const r = pageResponse({
    title: "T",
    root: main_([], [text("m")]),
  });
  return all([
    check(
      r.headers["content-type"],
      toBe("text/html; charset=utf-8"),
    ),
    check(
      typeof r.body === "string" &&
        r.body.includes(
          '<div id="root"><main>m</main></div>',
        ),
      toBe(true),
    ),
  ]);
});

test("javascriptResponse serves a text/javascript body", () => {
  const r = javascriptResponse("console.log(1)");
  return all([
    check(
      r.headers["content-type"],
      toBe("text/javascript; charset=utf-8"),
    ),
    check(r.body, toBe("console.log(1)")),
    check(r.status.content, toBe(200)),
  ]);
});
