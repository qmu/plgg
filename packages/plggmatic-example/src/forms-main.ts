import {
  pipe,
  fromNullable,
  mapOption,
} from "plgg";
import { sandbox } from "plgg-view/client";
import {
  metricCss,
  schemeCss,
  pragmaticTheme,
} from "plggmatic/style";
import { program } from "./forms/formsDemo.ts";
import { demoCss } from "./demoStyles.ts";

/**
 * CSR entry for ticket 12's forms demo. Injects the
 * framework scheme + shell metrics and the demo control
 * stylesheet, plus a little page layout, then mounts the
 * `sandbox` (no URL needed). Real-browser proof of the
 * caster-parsed form, the confirm dialog, and the toaster.
 */
const pageCss = `
body{margin:0;font-family:system-ui,sans-serif;line-height:1.5;background:var(--pm-surface);color:var(--pm-text);}
.fd-root{max-width:520px;margin:0 auto;padding:2rem 1.5rem;}
.fd-notes{list-style:none;margin:1.5rem 0 0;padding:0;}
.fd-note{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0.5rem 0.75rem;border:1px solid var(--pm-border);border-radius:8px;margin:0.4rem 0;}
`;

const style = document.createElement("style");
style.textContent =
  metricCss(pragmaticTheme) + schemeCss(pragmaticTheme) + pageCss + demoCss;
document.head.appendChild(style);

pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: HTMLElement) =>
    sandbox(program)(root),
  ),
);
