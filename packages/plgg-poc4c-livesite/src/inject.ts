/**
 * The HTML rewrite that gets PoC 4c's client into a page
 * it does not own — pure, so the one rewrite the whole PoC
 * depends on is unit-tested rather than eyeballed through
 * a proxy.
 *
 * The dev server decorates every HTML response with
 * {@link LIVE_RELOAD_SCRIPT}: an EventSource that reloads
 * the page on every pushed frame. That script is PoC 4c's
 * direct competitor — the agent's edit writes `content/`,
 * the watcher fires, and the page reloads out from under
 * the patch mid-animation. It cannot be reasoned with from
 * outside either: `location.reload()` is called by a
 * script we do not control, and `window.location` is
 * unforgeable, so there is nothing to monkey-patch.
 *
 * So the reload is not fought, it is REPLACED. This swaps
 * the dev server's reload client for our own injected
 * bundle, which opens the SAME stream and honours the same
 * frames — but arbitrates them (see reloadPolicy.ts): our
 * own edit's reload is absorbed, everyone else's still
 * reloads. PoC 4's proven hot-reload verdict keeps holding
 * because the mechanism is still there; it just answers to
 * a policy now.
 *
 * The literal is IMPORTED from plgg-bundle's own protocol
 * module rather than re-spelled here, so the day the dev
 * server changes its snippet this swap cannot silently
 * start missing (it would fall through to the append path,
 * still injecting the client, and the reload would simply
 * stop being absorbed — a visible flicker, not a corrupt
 * page). Relative, like every other cross-package source
 * seam here ({@link ./poc1.ts}): plgg-bundle is a bin-only
 * package with no export map, and its Protocol module is
 * zero-dependency pure constants.
 */
import { type SoftStr } from "plgg";
import { LIVE_RELOAD_SCRIPT } from "../../plgg-bundle/src/Dev/model/Protocol.ts";

/** Where the shell serves the injected bundle. */
export const PATCH_SCRIPT_PATH =
  "/docs/__poc4c/patch.js";

export const PATCH_SCRIPT = `<script type="module" src="${PATCH_SCRIPT_PATH}"></script>`;

/**
 * Splice the injected client into one proxied page.
 *
 * Three cases, in order of what actually happens:
 * - the dev server's reload script is there (every dev
 *   HTML response): swap it for ours — the client is
 *   installed AND the reload comes under policy;
 * - no reload script but a `</body>`: inject before it.
 *   The client works; nothing needed absorbing anyway;
 * - neither: append. A fragment response is still better
 *   served with the client than without.
 */
export const injectPatchClient = (
  html: SoftStr,
): SoftStr =>
  html.includes(LIVE_RELOAD_SCRIPT)
    ? html.replace(
        LIVE_RELOAD_SCRIPT,
        PATCH_SCRIPT,
      )
    : html.includes("</body>")
      ? html.replace(
          "</body>",
          `${PATCH_SCRIPT}</body>`,
        )
      : html + PATCH_SCRIPT;

/**
 * Whether a proxied response is a page to rewrite. Only
 * HTML is buffered and spliced; everything else — assets,
 * and above all the `/__plgg_reload` SSE stream — must
 * stream through untouched, or the reload frames the
 * injected client listens for would sit in a buffer
 * forever.
 */
export const isHtmlResponse = (
  contentType: SoftStr,
): boolean =>
  contentType
    .toLowerCase()
    .includes("text/html");
