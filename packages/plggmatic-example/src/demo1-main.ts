import {
  pipe,
  fromNullable,
  mapOption,
} from "plgg";
import { sandbox } from "plgg-view/client";
import {
  metricCss,
  schemeCss,
} from "plggmatic/style";
import { demoCss } from "./demoStyles.ts";
import { program } from "./demo1/paneAlignmentDemo.ts";

/**
 * CSR entry for Demo 1 (pane alignment). Injects the
 * framework scheme + shell metrics, the shared demo
 * control stylesheet, and a little page layout for the
 * live pane frame, then mounts the `sandbox` (no URL).
 * Real-browser proof of the raw `row`/`column`/`pane`
 * combinators and the fixed-basis vs `fluid` alignment.
 */
const pageCss = `
body{margin:0;font-family:system-ui,sans-serif;line-height:1.5;background:var(--pm-surface);color:var(--pm-text);}
.pa-root{max-width:900px;margin:0 auto;padding:2rem 1.5rem;}
.pa-lead{color:var(--pm-muted);max-width:56ch;}
.pa-code{font-family:ui-monospace,monospace;background:var(--pm-surface-2);padding:0.05rem 0.3rem;border-radius:4px;}
.pa-controls{display:flex;gap:0.5rem;flex-wrap:wrap;margin:1rem 0;}
.pa-frame{min-height:320px;border:1px solid var(--pm-border);border-radius:10px;overflow:hidden;}
.pa-frame .pm-col{border-right:1px solid var(--pm-border);min-width:0;}
.pa-frame .pm-col:last-child{border-right:none;}
.pa-frame .pm-pane{height:100%;box-sizing:border-box;}
.pa-nav{background:var(--pm-surface-2);}
.pa-aside{background:var(--pm-surface-2);}
.pa-label{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--pm-muted);margin:0 0 0.5rem;}
`;

const style = document.createElement("style");
style.textContent =
  metricCss + schemeCss + demoCss + pageCss;
document.head.appendChild(style);

pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: HTMLElement) =>
    sandbox(program)(root),
  ),
);
