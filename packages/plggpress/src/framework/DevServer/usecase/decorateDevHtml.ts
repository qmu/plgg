import { type SoftStr } from "plgg";
import { LIVE_RELOAD_SCRIPT } from "plggpress/framework/DevServer/model/DevChannel";

/**
 * The DEV-ONLY HTML decoration: string-append the
 * {@link LIVE_RELOAD_SCRIPT} just before `</body>` (or at the
 * very end when the document has none). Pure string surgery
 * on rendered HTML OUTPUT — never inside a typed render tree
 * (which would escape the `<script>`), and never in a
 * production `build` path — so the reload client can only
 * ever reach a page the dev server itself served.
 */
export const decorateDevHtml = (
  html: SoftStr,
): SoftStr =>
  html.includes("</body>")
    ? html.replace(
        "</body>",
        `${LIVE_RELOAD_SCRIPT}</body>`,
      )
    : html + LIVE_RELOAD_SCRIPT;
