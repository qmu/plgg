import {
  test,
  check,
  all,
  toBe,
  toHaveLength,
  okThen,
  errThen,
} from "plgg-test";
import { pipe, ok, box } from "plgg";
import {
  web,
  get,
  textResponse,
  statusOf,
  HttpResponse,
} from "plgg-server/index";
import {
  renderPath,
  renderRoutes,
  toPage,
} from "plgg-server/Ssg/usecase/renderRoutes";

const app = pipe(
  web(),
  get("/", async () =>
    ok(textResponse("<h1>home</h1>")),
  ),
  get("/missing", async () =>
    ok(textResponse("gone", statusOf(404))),
  ),
);

test("toPage folds a 2xx string body into a page", () => {
  const response: HttpResponse = {
    status: statusOf(200),
    headers: {},
    body: "<p>hi</p>",
  };
  return check(
    toPage("/x")(response),
    okThen((page) =>
      all([
        check(page.path, toBe("/x")),
        check(page.html, toBe("<p>hi</p>")),
      ]),
    ),
  );
});

test("toPage rejects a non-2xx status as NonOkStatus", () => {
  const response: HttpResponse = {
    status: statusOf(500),
    headers: {},
    body: "boom",
  };
  return check(
    toPage("/x")(response),
    errThen((e) =>
      check(e.__tag, toBe("NonOkStatus")),
    ),
  );
});

test("toPage rejects a non-string body as NonHtmlBody", () => {
  const response: HttpResponse = {
    status: statusOf(200),
    headers: {},
    body: box("Bytes")(new Uint8Array([1, 2])),
  };
  return check(
    toPage("/x")(response),
    errThen((e) =>
      check(e.__tag, toBe("NonHtmlBody")),
    ),
  );
});

test("renderPath renders a real route to a page", async () =>
  check(
    await renderPath(app)("/"),
    okThen((page) =>
      check(page.html, toBe("<h1>home</h1>")),
    ),
  ));

test("renderPath folds a 404 route to NonOkStatus", async () =>
  check(
    await renderPath(app)("/missing"),
    errThen((e) =>
      check(e.__tag, toBe("NonOkStatus")),
    ),
  ));

test("renderPath folds an unmatched path to RenderFailed", async () =>
  check(
    await renderPath(app)("/nope"),
    errThen((e) =>
      check(e.__tag, toBe("RenderFailed")),
    ),
  ));

test("renderRoutes collects every page in order", async () =>
  check(
    await renderRoutes(app)(["/"]),
    okThen((pages) =>
      all([
        check(pages, toHaveLength(1)),
        check(
          pages[0]?.html,
          toBe("<h1>home</h1>"),
        ),
      ]),
    ),
  ));

test("renderRoutes short-circuits to the first failure", async () =>
  check(
    await renderRoutes(app)(["/", "/missing"]),
    errThen((e) =>
      check(e.__tag, toBe("NonOkStatus")),
    ),
  ));
