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
  pragmaticTheme,
} from "plggmatic/style";
import { demoCss } from "./demoStyles.ts";
import { demo1Css } from "./demo1/styles.ts";
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

const style = document.createElement("style");
style.textContent =
  metricCss(pragmaticTheme) +
  schemeCss(pragmaticTheme) +
  chromeCss(pragmaticTheme) +
  demoCss +
  demo1Css;
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
