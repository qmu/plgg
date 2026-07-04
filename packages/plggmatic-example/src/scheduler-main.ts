import {
  pipe,
  fromNullable,
  mapOption,
} from "plgg";
import { application } from "plgg-view/client";
import {
  metricCss,
  schemeCss,
  chromeCss,
} from "plggmatic/style";
import { program } from "./scheduler/program.ts";
import { demoCss } from "./demoStyles.ts";

/**
 * CSR entry for the scheduler demo (tickets 09/10/11). It
 * injects the framework's own stylesheets — the shell
 * metrics (`metricCss`), the `--pm-*` scheme variables
 * (`schemeCss`), and the multi-column chrome
 * (`chromeCss`) — then a small demo stylesheet for the
 * interactive hooks the framework does not yet own (form
 * controls arrive in ticket 12) and the single-column
 * layout, and mounts the mode-wrapping program on `#root`.
 * `application` so the runtime owns the URL.
 */
const modeBarCss = `
body{margin:0;font-family:system-ui,sans-serif;line-height:1.5;background:var(--pm-surface);color:var(--pm-text);}
.sd-demo{min-height:100vh;}
.sd-modebar{display:flex;justify-content:flex-end;gap:0.5rem;padding:0.5rem 1rem;background:var(--pm-surface-2);border-bottom:1px solid var(--pm-border);}
.sd-modebtn{padding:0.35rem 0.75rem;border:1px solid var(--pm-border);border-radius:6px;background:var(--pm-surface);color:var(--pm-text);cursor:pointer;}
.pm-query{width:100%;box-sizing:border-box;padding:0.35rem 0.5rem;margin:0.35rem 0;border:1px solid var(--pm-border);border-radius:6px;background:var(--pm-surface);color:var(--pm-text);}
`;

const style = document.createElement("style");
style.textContent =
  metricCss +
  schemeCss +
  chromeCss +
  modeBarCss +
  demoCss;
document.head.appendChild(style);

pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: HTMLElement) =>
    application(program)(root),
  ),
);
