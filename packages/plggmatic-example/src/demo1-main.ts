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
import { makeApp } from "./demo1/bizMenuDemo.ts";

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
.bo-topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:var(--pm-surface);color:var(--pm-text);}
.bo-navleft{display:flex;align-items:center;gap:0.75rem;min-width:0;}
.bo-brand{font-weight:600;white-space:nowrap;}
.pm-query{width:100%;box-sizing:border-box;padding:0.35rem 0.5rem;margin:0.35rem 0;border:1px solid var(--pm-border);border-radius:6px;background:var(--pm-surface);color:var(--pm-text);}
:root{--pm-surface:#ffffff;--pm-surface-2:#ffffff;--pm-text:#000000;--pm-primary-base:#000000;--pm-primary-text:#ffffff;--pm-border:#000000;}
html.dark{--pm-surface:#000000;--pm-surface-2:#000000;--pm-text:#ffffff;--pm-primary-base:#ffffff;--pm-primary-text:#000000;--pm-border:#ffffff;}
.pm-col{border-right:none;}
.pm-colhead{border-bottom:none;background:var(--pm-text);color:var(--pm-surface);border-radius:8px;}
.pm-colhead .pm-colhead-title{color:var(--pm-surface);font-weight:normal;}
.pm-colhead .pm-close{color:var(--pm-surface);}
.bo-topbar>button{width:30px;height:30px;padding:0;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;}
.bo-topbar>button svg{width:15px;height:15px;}
.pm-menu-body{padding:0;border:1px solid var(--pm-border);border-radius:8px;overflow:hidden;}
.pm-menu-body ul{list-style:none;margin:0;padding:0;}
.pm-menu-body li a{display:block;padding:0.5rem 0.65rem;color:var(--pm-text);text-decoration:none;}
.pm-menu-body li+li{border-top:1px solid var(--pm-border);}
.pm-list{margin:0;padding:0;border:1px solid var(--pm-border);border-radius:8px;background:var(--pm-surface);overflow:hidden;}
.pm-list-item{margin:0;}
.pm-list-item+.pm-list-item{margin-top:0;border-top:1px solid var(--pm-border);}
.pm-row-link{display:block;border:none;border-radius:0;background:transparent;padding:0.5rem 0.65rem;color:var(--pm-text);}
.pm-menu-body li a:hover,.pm-row-link:hover{background:color-mix(in oklab,var(--pm-text) 8%,transparent);}
`;

const style = document.createElement("style");
style.textContent =
  metricCss +
  schemeCss +
  chromeCss +
  demoCss +
  pageCss;
document.head.appendChild(style);

const scheme = decideScheme(
  fromNullable(
    window.localStorage.getItem(
      appearanceStorageKey,
    ),
  ),
  window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches,
);

applyScheme(
  scheme,
  document.documentElement,
  window.localStorage,
);

pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: HTMLElement) =>
    application(makeApp(scheme))(root),
  ),
);
