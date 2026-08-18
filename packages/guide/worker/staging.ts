/**
 * The **staging** environment's Worker entry.
 *
 * Production is deliberately script-free: it is an
 * assets-only Worker, because serving a pre-rendered
 * tree needs no code (see `wrangler.jsonc`). Staging
 * needs exactly two things production must never have —
 * to stay out of search results, and to be unmistakable
 * for the published guide — and both are properties of
 * the RESPONSE, not of the content. So they live here,
 * in the one environment that wants them, rather than in
 * the build both environments share: `dist/` is byte-
 * identical on both surfaces, which is the whole point
 * of a staging surface.
 *
 * This file sits at the Fetch/Workers vendor boundary.
 * It carries no domain model and holds no state; its
 * nullable reads (`Headers.get`) and its one mutable
 * `Headers` copy are the WHATWG API's shape, kept here
 * so nothing downstream inherits them.
 */

/**
 * The static-asset binding wrangler gives the staging
 * environment (`assets.binding`): the production
 * behaviour — directory URLs, the rendered `404.html` —
 * reached as a function, so this Worker decorates that
 * behaviour instead of reimplementing it.
 */
type AssetFetcher = Readonly<{
  fetch: (request: Request) => Promise<Response>;
}>;

type StagingEnv = Readonly<{
  ASSETS: AssetFetcher;
}>;

/**
 * Belt and braces with the `X-Robots-Tag` below: a
 * crawler that never requests `/robots.txt` still gets
 * the header, and one that reads only `robots.txt` still
 * gets the rule.
 */
const ROBOTS_TXT = "User-agent: *\nDisallow: /\n";

/**
 * Fixed, not `dist`-relative, because the banner must
 * survive on a page the build did not produce (the
 * `404.html`), and must not depend on the guide's theme
 * — which is the very thing being previewed.
 */
const BANNER =
  '<div role="status" style="position:fixed;' +
  "left:0;right:0;bottom:0;z-index:2147483647;" +
  "padding:.5rem 1rem;font:600 14px/1.4 " +
  "system-ui,sans-serif;text-align:center;" +
  "color:#111;background:#ffd400;" +
  'box-shadow:0 -1px 0 rgba(0,0,0,.2)">' +
  "STAGING — this is a pre-production build of the " +
  "plgg guide, not the published site." +
  "</div>";

const ROBOTS_TAG = "noindex, nofollow, noarchive";

const isHtml = (response: Response): boolean =>
  (
    response.headers.get("content-type") ?? ""
  ).includes("text/html");

/**
 * Vendor seam: `Headers` is a mutable WHATWG object with
 * no copy-with-extra constructor, so the one
 * copy-then-set in this file lives here and nothing else
 * mutates.
 */
const stagingHeaders = (
  source: Headers,
): Headers => {
  const headers = new Headers(source);
  headers.set("x-robots-tag", ROBOTS_TAG);
  return headers;
};

/**
 * Injected before `</body>` so the banner is the last
 * thing in the document and cannot be covered by the
 * page's own layout; appended when a response somehow
 * carries no closing tag, so the marking is never
 * silently dropped.
 */
const withBanner = (html: string): string =>
  html.includes("</body>")
    ? html.replace("</body>", `${BANNER}</body>`)
    : `${html}${BANNER}`;

const marked = async (
  response: Response,
): Promise<Response> =>
  new Response(
    withBanner(await response.text()),
    {
      status: response.status,
      statusText: response.statusText,
      headers: stagingHeaders(response.headers),
    },
  );

const unmarked = (response: Response): Response =>
  new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: stagingHeaders(response.headers),
  });

const robots = (): Response =>
  new Response(ROBOTS_TXT, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-robots-tag": ROBOTS_TAG,
    },
  });

/**
 * `/robots.txt` is answered here rather than shipped in
 * `dist/`: a file in the build would reach production
 * too, and telling crawlers to stay off the published
 * guide is the opposite of what production wants.
 */
export default {
  fetch: (
    request: Request,
    env: StagingEnv,
  ): Promise<Response> =>
    new URL(request.url).pathname === "/robots.txt"
      ? Promise.resolve(robots())
      : env.ASSETS.fetch(request).then(
          (response: Response) =>
            isHtml(response)
              ? marked(response)
              : unmarked(response),
        ),
};
