import { LIVE_RELOAD_SCRIPT } from "plgg-bundle/Dev/model/Protocol";

/**
 * The DEV-ONLY HTML decoration: string-append the
 * {@link LIVE_RELOAD_SCRIPT} just before `</body>` (or at
 * the very end when the document has none). Pure string
 * surgery on rendered HTML OUTPUT — never inside a typed
 * render tree (which would escape the `<script>`), and
 * never in a production build path. This is the plgg-free
 * toolchain counterpart to plggpress's old
 * `decorateDevHtml`.
 */
export const decorateDevHtml = (
  html: string,
): string =>
  html.includes("</body>")
    ? html.replace(
        "</body>",
        `${LIVE_RELOAD_SCRIPT}</body>`,
      )
    : html + LIVE_RELOAD_SCRIPT;
