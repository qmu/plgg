import {
  pipe,
  fromNullable,
  mapOption,
} from "plgg";
import { sandbox } from "plgg-view/client";
import {
  appearanceStorageKey,
  decideScheme,
  applyScheme,
  metricCss,
  schemeCss,
} from "plggmatic/style";
import { demoCss } from "./demoStyles.ts";
import { makeProgram } from "./demo2/colorSchemeDemo.ts";

/**
 * CSR entry for Demo 2 (color scheme). Injects the
 * framework scheme + shell metrics, the shared demo
 * stylesheet (for the sample `pm-btn`s), and a swatch-grid
 * page layout. Runs the framework appearance boot once
 * (stored choice else OS preference → apply+persist the
 * `html.dark` class) so the demo opens in the visitor's
 * scheme, then mounts the `sandbox`. Real-browser proof of
 * the token-driven reschemer and the `themeToggle`.
 */
const pageCss = `
body{margin:0;font-family:system-ui,sans-serif;line-height:1.5;background:var(--pm-surface);color:var(--pm-text);}
.cs-root{max-width:820px;margin:0 auto;padding:2rem 1.5rem;}
.cs-bar{display:flex;align-items:center;justify-content:space-between;gap:1rem;}
.cs-lead{color:var(--pm-muted);max-width:60ch;}
.cs-group{margin:1.25rem 0;}
.cs-group-h{margin:0 0 0.6rem;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--pm-muted);}
.cs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:0.75rem;}
.cs-swatch{display:flex;align-items:center;gap:0.6rem;}
.cs-chip{width:2rem;height:2rem;border-radius:8px;border:1px solid var(--pm-border);flex:0 0 auto;}
.cs-name{font-family:ui-monospace,monospace;font-size:0.8rem;color:var(--pm-text);}
`;

const style = document.createElement("style");
style.textContent =
  metricCss + schemeCss + demoCss + pageCss;
document.head.appendChild(style);

const initial = decideScheme(
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
  initial,
  document.documentElement,
  window.localStorage,
);

pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: HTMLElement) =>
    sandbox(makeProgram(initial))(root),
  ),
);
