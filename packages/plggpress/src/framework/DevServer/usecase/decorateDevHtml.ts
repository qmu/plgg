import { type SoftStr } from "plgg";
import { LIVE_RELOAD_SCRIPT } from "plggpress/framework/DevServer/model/DevChannel";
import { VOICE_CLIENT_SCRIPT } from "plggpress/framework/DevServer/model/VoiceProtocol";

/**
 * The DEV-ONLY HTML decoration: string-append the dev client
 * scripts just before `</body>` (or at the very end when the
 * document has none). Pure string surgery on rendered HTML
 * OUTPUT — never inside a typed render tree (which would
 * escape the `<script>`), and never in a production `build`
 * path — so a dev client can only ever reach a page the dev
 * server itself served.
 *
 * Two clients, one seam: {@link LIVE_RELOAD_SCRIPT} always,
 * and the voice client only when `voice` is true — i.e. only
 * when this surface actually holds a minter. A keyless
 * `plggpress dev` therefore emits byte-for-byte what it
 * emitted before the assistant existed.
 */
export const decorateDevHtml = (
  html: SoftStr,
  voice: boolean,
): SoftStr =>
  appendToBody(
    html,
    voice
      ? LIVE_RELOAD_SCRIPT + VOICE_CLIENT_SCRIPT
      : LIVE_RELOAD_SCRIPT,
  );

const appendToBody = (
  html: SoftStr,
  scripts: SoftStr,
): SoftStr =>
  html.includes("</body>")
    ? html.replace("</body>", `${scripts}</body>`)
    : html + scripts;
