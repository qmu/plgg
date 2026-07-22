import { ok, none } from "plgg";
import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
  okThen,
} from "plgg-test";
import {
  type Context,
  type Next,
  type HttpResponse,
  htmlResponse,
  jsonResponse,
  streamResponse,
  statusOf,
} from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import {
  injectReloadClient,
  reloadHandler,
  devWeb,
} from "plggpress/framework/DevServer/usecase/devWeb";
import { makeReloadHub } from "plggpress/framework/DevServer/usecase/reloadHub";

// A throwaway context — the injector never reads it, it only
// threads it through `next`.
const ctx: Context = {
  req: {
    method: "GET",
    path: "/",
    query: {},
    headers: {},
    params: {},
    body: "",
    bytes: none(),
  },
  state: {},
};

const nextWith =
  (res: HttpResponse): Next =>
  () =>
    Promise.resolve(ok(res));

const bodyText = (res: HttpResponse): string =>
  typeof res.body === "string" ? res.body : "";

const emptyStream = (): AsyncIterable<Uint8Array> => ({
  [Symbol.asyncIterator]:
    async function* (): AsyncGenerator<Uint8Array> {},
});

const config: SiteConfig = {
  title: "T",
  description: "D",
  base: "/",
  nav: [],
  sidebar: [],
  social: [],
  dev: { allowedHosts: [] },
  models: none(),
  rawHtml: none(),
  slugger: none(),
  srcExclude: none(),
  linkIgnore: none(),
  theme: none(),
};

test("injects the reload client into an HTML response", async () =>
  check(
    await injectReloadClient(
      ctx,
      nextWith(htmlResponse("<body>hi</body>")),
    ),
    okThen((res) =>
      toContain("EventSource")(bodyText(res)),
    ),
  ));

test("leaves a JSON response untouched", async () =>
  check(
    await injectReloadClient(
      ctx,
      nextWith(jsonResponse({ a: 1 })),
    ),
    okThen((res) =>
      not(toContain("EventSource"))(bodyText(res)),
    ),
  ));

test("leaves a streamed response untouched", async () =>
  check(
    await injectReloadClient(
      ctx,
      nextWith(streamResponse(emptyStream())),
    ),
    okThen((res) =>
      toBe(false)(typeof res.body === "string"),
    ),
  ));

test("leaves a body with no content-type untouched", async () =>
  check(
    await injectReloadClient(
      ctx,
      nextWith({
        status: statusOf(200),
        headers: {},
        body: "plain",
      }),
    ),
    okThen((res) => toBe("plain")(bodyText(res))),
  ));

test("reloadHandler answers a text/event-stream body", async () => {
  const hub = makeReloadHub();
  return check(
    await reloadHandler(hub)(ctx),
    okThen((res) =>
      all([
        check(
          res.headers["content-type"] ?? "",
          toContain("text/event-stream"),
        ),
        check(
          typeof res.body === "string",
          toBe(false),
        ),
      ]),
    ),
  );
});

test("devWeb registers the reload route and an injector middleware", () => {
  const hub = makeReloadHub();
  const w = devWeb(
    "content",
    config,
    "/",
    ["/", "/guide"],
    hub,
  );
  return all([
    check(
      w.routes.some((r) =>
        r.pattern.includes("plggpress_reload"),
      ),
      toBe(true),
    ),
    check(
      w.middlewares.length >= 1,
      toBe(true),
    ),
  ]);
});
