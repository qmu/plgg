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
  metricCss,
  schemeCss,
  chromeCss,
  workspaceCss,
  workspaceOptions,
  sidebarNavCss,
  pragmaticTheme,
} from "plggmatic/style";
import {
  cssVarRef,
  selector,
  pinnedClass,
  menuClass,
  menuCompactAttr,
  navGroupTitleClass,
  navLinkClass,
} from "plggmatic";
import { app } from "./demo4/workspaceDemo.ts";

/**
 * CSR entry for Demo 4 (the workspace). The framework's
 * scheme, chrome, workspace and sidebar stylesheets do the
 * layout; the page's own CSS below is only what a product
 * would also write — its rows, its panel's type.
 */
const pageCss = `
body{margin:0;font-family:system-ui,sans-serif;line-height:1.6;background:${cssVarRef("surface")};color:${cssVarRef("text")};}
#root{height:100dvh;}
.w4-panel{padding:1rem 1.25rem;overflow:auto;}
.w4-brand{font-weight:600;}
.w4-facts{font-family:ui-monospace,monospace;font-size:.8rem;color:${cssVarRef("muted")};}
.w4-note{margin:0;padding:.75rem;color:${cssVarRef("muted")};border-bottom:1px solid ${cssVarRef("border")};}
.w4-row{display:block;padding:.5rem .75rem;border-bottom:1px solid ${cssVarRef("border")};color:${cssVarRef("text")};text-decoration:none;font-size:.875rem;transition:background-color .15s ease,color .15s ease;}
.w4-row:hover{background:${cssVarRef("surface-2")};}
.w4-row[aria-current]{background:${cssVarRef("primary-base")};color:${cssVarRef("surface")};}
.w4-rail{display:block;width:100%;height:40px;border:0;border-bottom:1px solid ${cssVarRef("border")};background:${cssVarRef("surface-2")};color:${cssVarRef("text")};cursor:pointer;font:inherit;}
.w4-rail:hover{background:${cssVarRef("primary-base")};color:${cssVarRef("surface")};}
${selector(pinnedClass)}{z-index:5;}
[${menuCompactAttr}] ${selector(menuClass)} ${selector(navGroupTitleClass)}{display:none;}
[${menuCompactAttr}] ${selector(menuClass)} ${selector(navLinkClass)}{padding-inline:.5rem;font-size:.7rem;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
`;

const style = document.createElement("style");
style.textContent =
  metricCss(pragmaticTheme) +
  schemeCss(pragmaticTheme) +
  chromeCss(pragmaticTheme) +
  workspaceCss(pragmaticTheme)(workspaceOptions) +
  sidebarNavCss(pragmaticTheme) +
  pageCss;
document.head.appendChild(style);

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
  mapOption((root: HTMLElement) =>
    application(app)(root),
  ),
);
