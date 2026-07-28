import {
  mkdtemp,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  test,
  check,
  all,
  okThen,
  toBe,
} from "plgg-test";
import { some, none } from "plgg";
import {
  type HttpRequest,
  type HttpResponse,
  handle,
} from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { pressRouter } from "plggpress/router/pressRouter";

// PROGRESSIVE ENHANCEMENT, AS A TEST.
//
// The navigation runtime may fail — a blocked script, an
// old browser, a crawler, a reader who turned JavaScript
// off. When it does, this site must still be a
// documentation site: every link navigates and every
// composition URL renders. That is a property of the
// MARKUP, so it is checkable here, and it fails loudly the
// day someone replaces a link with a click handler.

const config: SiteConfig = {
  title: "S",
  description: "d",
  base: "/",
  nav: [],
  sidebar: [
    {
      text: "Guide",
      items: [
        {
          text: "Foo",
          link: some("/foo/"),
          items: [],
        },
      ],
    },
  ],
  social: [
    {
      icon: "github",
      link: "https://example.com",
    },
  ],
  dev: { allowedHosts: [] },
  models: none(),
  rawHtml: none(),
  slugger: none(),
  srcExclude: none(),
  linkIgnore: none(),
  theme: none(),
};

const req = (
  path: string,
  query: Record<string, string>,
): HttpRequest => ({
  method: "GET",
  path,
  query,
  headers: {},
  params: {},
  body: "",
  bytes: none(),
});

const root = await mkdtemp(
  join(tmpdir(), "plggpress-nojs-"),
);
await mkdir(join(root, "foo"), {
  recursive: true,
});
await writeFile(
  join(root, "index.md"),
  "# Home\n\nRead [Foo](/foo/) next.\n",
  "utf8",
);
await writeFile(
  join(root, "foo", "index.md"),
  "# Foo\n\nBack [Home](/).\n",
  "utf8",
);

const app = pressRouter(root, config, "/", [
  "/",
  "/foo/",
]);

const bodyOf = (res: HttpResponse): string =>
  String(res.body);

/** Every `href` value the page offers, in order. */
const hrefs = (
  html: string,
): ReadonlyArray<string> =>
  (html.match(/href="[^"]*"/g) ?? []).map(
    (raw: string): string =>
      raw.slice('href="'.length, -1),
  );

/**
 * A navigable affordance the browser can follow on its
 * own: a real, non-empty href that is not a script URL.
 */
const followable = (
  html: string,
): ReadonlyArray<string> =>
  hrefs(html).filter(
    (href: string): boolean =>
      href !== "" &&
      !href
        .toLowerCase()
        .startsWith("javascript:"),
  );

test("every navigable affordance is a real link the browser can follow", async () =>
  check(
    await handle(app, req("/", {})),
    okThen((res: HttpResponse) =>
      all([
        // there ARE links…
        toBe(true)(
          followable(bodyOf(res)).length > 0,
        ),
        // …and every href on the page is one of them:
        // nothing is empty, nothing is a javascript: URL
        toBe(hrefs(bodyOf(res)).length)(
          followable(bodyOf(res)).length,
        ),
        // the prose link points at the real route
        toBe(true)(
          followable(bodyOf(res)).includes(
            "/foo/",
          ),
        ),
      ]),
    ),
  ));

test("navigation never depends on a click handler", async () =>
  check(
    await handle(app, req("/", {})),
    okThen((res: HttpResponse) =>
      all([
        toBe(false)(
          bodyOf(res).includes("onclick="),
        ),
        toBe(false)(
          bodyOf(res).includes("onmousedown="),
        ),
      ]),
    ),
  ));

test("a composition URL renders its columns with no script involved", async () =>
  check(
    await handle(
      app,
      req("/", { c: "/foo/", q: "Home" }),
    ),
    okThen((res: HttpResponse) =>
      all([
        // both columns are in the SERVER's bytes
        toBe(2)(
          bodyOf(res).split('class="vp-doc"')
            .length - 1,
        ),
        // …including the highlight
        toBe(true)(
          bodyOf(res).includes(
            '<mark class="vp-mark">Home</mark>',
          ),
        ),
        // …and the whole thing survives deleting every
        // script from the page: the enhancement is
        // additive, never load-bearing
        toBe(2)(
          bodyOf(res)
            .replace(
              /<script>[\s\S]*?<\/script>/g,
              "",
            )
            .split('class="vp-doc"').length - 1,
        ),
      ]),
    ),
  ));

test("a link still works when every script is stripped from the page", async () =>
  check(
    await handle(app, req("/foo/", {})),
    okThen((res: HttpResponse) =>
      toBe(true)(
        followable(
          bodyOf(res).replace(
            /<script>[\s\S]*?<\/script>/g,
            "",
          ),
        ).includes("/"),
      ),
    ),
  ));
