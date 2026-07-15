import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { LIVE_RELOAD_SCRIPT } from "../../plgg-bundle/src/Dev/model/Protocol.ts";
import {
  injectPatchClient,
  isHtmlResponse,
  PATCH_SCRIPT,
} from "./inject.ts";

// The rewrite that gets 4c's client into a page it does
// not own — and, in the same move, takes the dev server's
// location.reload() out of the picture. Both halves are
// pinned here because a silent miss would look like a
// working PoC right up until the first edit flickered
// away.

const devPage = (body: string): string =>
  `<!doctype html><html><body>${body}${LIVE_RELOAD_SCRIPT}</body></html>`;

test("the dev server's live-reload script is REPLACED, not merely joined — the competing mechanism must leave", () =>
  all([
    check(
      injectPatchClient(
        devPage("<p>hi</p>"),
      ).includes(LIVE_RELOAD_SCRIPT),
      toBe(false),
    ),
    check(
      injectPatchClient(
        devPage("<p>hi</p>"),
      ).includes(PATCH_SCRIPT),
      toBe(true),
    ),
  ]));

test("no location.reload() survives the rewrite of a dev page", () =>
  check(
    injectPatchClient(
      devPage("<p>hi</p>"),
    ).includes("location.reload"),
    toBe(false),
  ));

test("the page's own content is untouched by the swap", () =>
  check(
    injectPatchClient(
      devPage("<p>the cat sat</p>"),
    ).includes("<p>the cat sat</p>"),
    toBe(true),
  ));

test("a page with no reload script still gets the client, injected before </body>", () =>
  check(
    injectPatchClient(
      "<html><body><p>hi</p></body></html>",
    ),
    toBe(
      `<html><body><p>hi</p>${PATCH_SCRIPT}</body></html>`,
    ),
  ));

test("a fragment with neither reload script nor </body> still gets the client appended", () =>
  check(
    injectPatchClient("<p>hi</p>"),
    toBe(`<p>hi</p>${PATCH_SCRIPT}`),
  ));

test("the injected script is a module served from the shell's own /docs path, so the proxy intercepts it", () =>
  all([
    check(
      PATCH_SCRIPT.includes(
        "/docs/__poc4c/patch.js",
      ),
      toBe(true),
    ),
    check(
      PATCH_SCRIPT.includes('type="module"'),
      toBe(true),
    ),
  ]));

test("only HTML is claimed for rewriting", () =>
  all([
    check(
      isHtmlResponse(
        "text/html; charset=utf-8",
      ),
      toBe(true),
    ),
    check(isHtmlResponse("TEXT/HTML"), toBe(true)),
    check(
      isHtmlResponse("text/javascript"),
      toBe(false),
    ),
    check(isHtmlResponse(""), toBe(false)),
  ]));

test("the SSE reload stream is NOT claimed for rewriting — buffering it would starve the injected client of the very frames it arbitrates", () =>
  check(
    isHtmlResponse("text/event-stream"),
    toBe(false),
  ));
