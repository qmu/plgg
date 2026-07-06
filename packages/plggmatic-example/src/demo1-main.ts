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
} from "plggmatic/style";
import { demoCss } from "./demoStyles.ts";
import { app } from "./demo1/bizMenuDemo.ts";

/**
 * CSR entry for Demo 1 (the contract-dev business-
 * management menu). Injects the framework scheme + shell
 * metrics + multi-column chrome and the shared demo
 * stylesheet, runs the appearance boot, then mounts with
 * `application` (URL-aware) so selecting a menu section
 * reflects to the address bar and deep-links. Real-browser
 * proof that the whole navigation is a declaration.
 */
const pageCss = `
body{margin:0;font-family:system-ui,sans-serif;line-height:1.6;background:var(--pm-surface);color:var(--pm-text);}
.bo-root{min-height:100vh;}
.bo-brand{position:fixed;top:0.5rem;left:1rem;z-index:10;font-weight:600;opacity:0.5;font-size:0.8rem;}
.pm-query{width:100%;box-sizing:border-box;padding:0.35rem 0.5rem;margin:0.35rem 0;border:1px solid var(--pm-border);border-radius:6px;background:var(--pm-surface);color:var(--pm-text);}
`;

const style = document.createElement("style");
style.textContent =
  metricCss +
  schemeCss +
  chromeCss +
  demoCss +
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
