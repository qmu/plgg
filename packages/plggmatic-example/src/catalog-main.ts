import {
  pipe,
  fromNullable,
  mapOption,
} from "plgg";
import { application } from "plgg-view/client";
import {
  appearanceStorageKey,
  decideScheme,
  applyScheme,
  defaultTheme,
} from "plggmatic/style";
import {
  kitSystemCss,
  kitAppearanceCss,
  carouselInitScript,
  cssVarRef,
  selector,
  docClass,
} from "plggmatic";
import {
  app,
  LOOK_SHEET,
} from "./catalog/app.ts";

/**
 * CSR entry for the catalog. The whole screen is
 * the kit's two sheets; what follows them is only what the catalog's
 * own pages add — the box an example stands in, the colour
 * chips, the frame a whole screen is shown in.
 */
const doc = selector(docClass);
const pageCss = `
body{margin:0;background:${cssVarRef("surface")};}
.cat-example{margin:1rem 0;padding:1.25rem 1.4rem;border:1px solid ${cssVarRef("text")};}
.cat-example :is(h1,h2,h3):first-child{margin-top:0;}
.cat-example p:last-child{margin-bottom:0;}
.cat-example > * + *{margin-top:.9rem;}
.cat-row{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;}
.cat-split{display:flex;height:7rem;border:1px solid ${cssVarRef("border")};}
.cat-split > div:not([role]){flex:1 1 0;display:grid;place-items:center;}
.cat-swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(11rem,1fr));gap:.6rem;margin:.75rem 0;}
.cat-swatch{display:grid;grid-template-columns:2.25rem 1fr;grid-template-rows:auto auto;column-gap:.7rem;align-items:center;padding:.5rem;border:1px solid ${cssVarRef("border")};}
.cat-chip{grid-row:1 / 3;width:2.25rem;height:2.25rem;border:1px solid ${cssVarRef("text")};}
.cat-swatch strong{font-size:.8125rem;font-weight:600;line-height:1.3;}
.cat-swatch code{font-size:.7rem;padding:0;background:none;color:${cssVarRef("muted")};line-height:1.3;}
.cat-screen{margin:1rem 0;border:1px solid ${cssVarRef("text")};}
.cat-screen-bar{display:flex;align-items:center;justify-content:space-between;gap:1rem;height:2.25rem;padding:0 .4rem 0 .9rem;border-bottom:1px solid ${cssVarRef("text")};font-size:.8125rem;font-weight:600;}
.cat-screen-bar a{font-weight:400;font-size:.75rem;}
.cat-screen iframe{display:block;width:100%;height:min(34rem,62vh);border:0;background:${cssVarRef("surface")};}
${doc} .cat-example table{margin:0;}
`;

// Two sheets, because they are two things: the system
// (where things are, how they behave) never changes; the
// appearance (how they look) is replaced when the reader
// picks another on the "見た目を差し替える" page.
const system = document.createElement("style");
system.textContent = kitSystemCss(defaultTheme);
document.head.appendChild(system);
const look = document.createElement("style");
look.id = LOOK_SHEET;
look.textContent = kitAppearanceCss(defaultTheme);
document.head.appendChild(look);
const own = document.createElement("style");
own.textContent = pageCss;
document.head.appendChild(own);

applyScheme(
  decideScheme(
    fromNullable(
      window.localStorage.getItem(
        appearanceStorageKey,
      ),
    ),
    window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches,
  ),
  document.documentElement,
  window.localStorage,
);

pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: HTMLElement) => {
    application(app)(root);
    // the strip exists now: give it its carousel
    const script =
      document.createElement("script");
    script.textContent = carouselInitScript;
    document.body.appendChild(script);
    return root;
  }),
);
