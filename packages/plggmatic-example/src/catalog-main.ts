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
} from "plggmatic";
import {
  app,
  LOOK_SHEET,
} from "./catalog/app.ts";

/**
 * CSR entry for the catalog. The whole screen is the
 * kit's two sheets: the catalog adds no part of its own,
 * only the ground the page stands on.
 */
const pageCss = `
body{margin:0;background:${cssVarRef("surface")};}
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
