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
  slotCss,
  runwayCss,
} from "plggmatic/style";
import { demoCss } from "./demoStyles.ts";
import { demo1Css } from "./demo1/styles.ts";
import {
  demo1Theme,
  demo1Runway,
} from "./demo1/theme.ts";
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

// The demo restyles the framework chrome through its Theme's
// component slots (`demo1Theme.slots`, emitted by `slotCss`)
// and enables the framework's unbounded-depth runway
// (`runwayCss`) — both injected AFTER `chromeCss` + `demoCss`
// so they win the cascade at equal specificity, the exact
// position the old by-name `pm-*` overrides held.
const style = document.createElement("style");
style.textContent =
  metricCss(demo1Theme) +
  schemeCss(demo1Theme) +
  chromeCss(demo1Theme) +
  demoCss +
  slotCss(demo1Theme) +
  runwayCss(demo1Theme)(demo1Runway) +
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
