import { type SoftStr } from "plgg";

/**
 * The no-FOUC appearance script, injected synchronously
 * at the END of `<head>` so the `dark` class lands on
 * `<html>` BEFORE first paint (no flash). It reads the
 * persisted `vp-appearance` choice, falling back to the
 * OS `prefers-color-scheme`. Plain dependency-free
 * vanilla JS — the one deliberate production script the
 * polished chrome needs.
 */
const HEAD_SCRIPT: SoftStr =
  "<script>(function(){try{" +
  "var s=localStorage.getItem('vp-appearance');" +
  "var d=s?s==='dark':window.matchMedia(" +
  "'(prefers-color-scheme: dark)').matches;" +
  "if(d){document.documentElement.classList" +
  ".add('dark');}}catch(e){}})();</script>";

/**
 * The appearance-toggle wiring, injected at the END of
 * `<body>`. It flips the `dark` class on `<html>` when
 * the header `.vp-theme-toggle` is clicked and persists
 * the choice to `localStorage`. Nav and content work
 * fully without it — only the dark toggle needs JS.
 */
const BODY_SCRIPT: SoftStr =
  "<script>(function(){" +
  "var t=document.querySelectorAll('.vp-theme-toggle');" +
  "for(var i=0;i<t.length;i++){" +
  "t[i].addEventListener('click',function(){" +
  "var d=document.documentElement.classList" +
  ".toggle('dark');try{localStorage.setItem(" +
  "'vp-appearance',d?'dark':'light');}" +
  "catch(e){}});}})();</script>";

/**
 * Inject the appearance scripts into a rendered page at
 * the render-to-string boundary — AFTER the SSR escaper,
 * since the scripts legitimately contain `<`/`>`/`&` and
 * so cannot ride through an escaped `text()` node (the
 * same reason the dev live-reload is string-appended).
 * Inserts the no-FOUC script before `</head>` and the
 * toggle script before `</body>`. Idempotent guards: a
 * page missing either tag is passed through unchanged.
 */
export const injectThemeScripts = (
  html: SoftStr,
): SoftStr => {
  const withHead = html.includes("</head>")
    ? html.replace(
        "</head>",
        HEAD_SCRIPT + "</head>",
      )
    : html;
  return withHead.includes("</body>")
    ? withHead.replace(
        "</body>",
        BODY_SCRIPT + "</body>",
      )
    : withHead;
};
