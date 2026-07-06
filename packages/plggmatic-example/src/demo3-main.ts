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
import { app } from "./demo3/queryUrlDemo.ts";

/**
 * CSR entry for Demo 3 (scheduler query + derived URL
 * codec). Injects the framework scheme + shell metrics +
 * multi-column chrome and the shared demo stylesheet, runs
 * the appearance boot, then mounts with `application` (NOT
 * `sandbox`) so the runtime owns the URL: the query and the
 * selection reflect to the address bar and seed back from a
 * deep link, and back/forward walk the history.
 */
const pageCss = `
body{margin:0;font-family:system-ui,sans-serif;line-height:1.6;background:var(--pm-surface);color:var(--pm-text);}
.q3-root{min-height:100vh;}
.q3-bar{display:flex;align-items:baseline;gap:1rem;flex-wrap:wrap;padding:0.6rem 1rem;border-bottom:1px solid var(--pm-border);}
.q3-brand{font-weight:600;}
.q3-url-label{font-size:0.85rem;color:var(--pm-muted);}
.q3-url{font-family:ui-monospace,monospace;color:var(--pm-text);}
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
