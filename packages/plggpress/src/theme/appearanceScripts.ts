import { type SoftStr } from "plgg";
import {
  themeToggleClass,
  appearanceStorageKey,
  injectAppearanceScript,
} from "plgg-ui/style";

/**
 * The appearance-toggle WIRING script, injected at the END
 * of `<body>`. It binds every plggmatic
 * `.${themeToggleClass}` (both the rail and mobile-bar
 * toggles), flips the `dark` class on `<html>` on click,
 * and persists the choice under
 * {@link appearanceStorageKey} — the framework's preserved
 * appearance-storage key, sourced via `JSON.stringify` so
 * the literal is never re-typed here (D16). Nav and content
 * work fully without it; only the dark toggle needs JS.
 *
 * Dependency-free vanilla JS composed from plggmatic's
 * exported constants. **Upstream candidate (ticket 07
 * step 6):** if a second host clones this (the admin UI,
 * qmu.co.jp), lift it into plggmatic beside
 * `appearanceInitScript` / `applyScheme`; kept thin here
 * until then. Contains no `</script` inner sequence and is
 * injected AFTER the SSR escaper, so its `<`/`>` are literal
 * markup, not escaped content.
 */
const bodyWiringScript: SoftStr =
  "<script>(function(){var t=" +
  "document.querySelectorAll(" +
  JSON.stringify("." + themeToggleClass) +
  ");for(var i=0;i<t.length;i++){" +
  "t[i].addEventListener('click',function(){" +
  "var d=document.documentElement.classList" +
  ".toggle('dark');try{localStorage.setItem(" +
  JSON.stringify(appearanceStorageKey) +
  ",d?'dark':'light');}catch(e){}});}})();" +
  "</script>";

/**
 * Inject the appearance scripts into a rendered page at the
 * render-to-string boundary — AFTER the SSR escaper, since
 * the scripts legitimately contain `<`/`>`/`&` and so cannot
 * ride through an escaped `text()` node. The no-FOUC head
 * script is plggmatic's ticket-04 contract
 * ({@link injectAppearanceScript}, inserted before
 * `</head>`); the toggle {@link bodyWiringScript} is
 * inserted before `</body>`. Idempotent guards: a page
 * missing either tag is passed through unchanged (the head
 * guard lives in `injectAppearanceScript`).
 */
export const injectAppearanceScripts = (
  html: SoftStr,
): SoftStr => {
  const withHead = injectAppearanceScript(html);
  return withHead.includes("</body>")
    ? withHead.replace(
        "</body>",
        bodyWiringScript + "</body>",
      )
    : withHead;
};
