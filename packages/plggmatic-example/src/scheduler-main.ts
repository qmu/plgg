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
const demoCss = `
body{margin:0;font-family:system-ui,sans-serif;line-height:1.5;background:var(--pm-surface);color:var(--pm-text);}
.sd-demo{min-height:100vh;}
.sd-modebar{display:flex;justify-content:flex-end;gap:0.5rem;padding:0.5rem 1rem;background:var(--pm-surface-2);border-bottom:1px solid var(--pm-border);}
.sd-modebtn{padding:0.35rem 0.75rem;border:1px solid var(--pm-border);border-radius:6px;background:var(--pm-surface);color:var(--pm-text);cursor:pointer;}
.pm-single{max-width:640px;margin:0 auto;padding:1.5rem;}
.pm-menu-body{padding:0.5rem;}
.pm-pane{padding:0.5rem;}
.pm-list{list-style:none;margin:0;padding:0;}
.pm-row-link{display:block;padding:0.35rem 0.5rem;border-radius:6px;color:var(--pm-text);text-decoration:none;}
.pm-row-link:hover{background:var(--pm-surface-2);}
.pm-back{display:inline-block;margin-bottom:0.5rem;color:var(--pm-muted);text-decoration:none;}
.pm-query{width:100%;box-sizing:border-box;padding:0.35rem 0.5rem;margin:0.35rem 0;border:1px solid var(--pm-border);border-radius:6px;background:var(--pm-surface);color:var(--pm-text);}
.pm-fields{margin:0.5rem 0;}
.pm-field{margin:0.4rem 0;}
.pm-actions{display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem;}
.pm-btn{padding:0.35rem 0.75rem;border:1px solid var(--pm-border);border-radius:6px;background:var(--pm-surface);color:var(--pm-text);cursor:pointer;}
.pm-confirm{display:flex;gap:0.75rem;align-items:center;padding:0.75rem 1rem;margin:0.75rem;border-radius:8px;background:var(--pm-surface-2);border:1px solid var(--pm-border);}
.pm-hint{color:var(--pm-muted);}
.pm-error{color:var(--pm-danger-base);}
`;

const style = document.createElement("style");
style.textContent =
  metricCss + schemeCss + chromeCss + demoCss;
document.head.appendChild(style);

pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: HTMLElement) =>
    application(program)(root),
  ),
);
