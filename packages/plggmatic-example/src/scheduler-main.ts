import {
  pipe,
  fromNullable,
  mapOption,
} from "plgg";
import { application } from "plgg-view/client";
import { program } from "./scheduler/program.ts";

/**
 * CSR entry for the scheduler demo (ticket 09's runnable
 * proof-of-value). Injects a minimal stylesheet for the
 * crude renderer's `sd-*` hooks and mounts the scheduled
 * program on `#root`. `application` (not `sandbox`) so
 * the runtime owns the URL: the flow position is
 * reflected to the address bar and restored from a deep
 * link, and back/forward walks the drill-down.
 */
const demoCss = `
body{margin:0;font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;background:#fafafa;}
.sd-root{max-width:960px;margin:0 auto;padding:1.5rem;}
.sd-app-title{font-size:1.25rem;margin:0 0 1rem;}
.sd-levels{display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap;}
.sd-level{flex:1 1 220px;min-width:200px;border:1px solid #e2e2e2;border-radius:8px;padding:0.75rem;background:#fff;}
.sd-title{display:block;font-weight:600;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.04em;color:#666;margin-bottom:0.5rem;}
.sd-list{list-style:none;margin:0;padding:0;}
.sd-list li{margin:0.1rem 0;}
.sd-list a{display:block;padding:0.35rem 0.5rem;border-radius:6px;color:#1a1a1a;text-decoration:none;}
.sd-list a:hover{background:#f0f0f0;}
.sd-list a[aria-current="page"]{background:#2563eb;color:#fff;}
.sd-back{display:inline-block;margin-bottom:0.5rem;color:#2563eb;text-decoration:none;font-size:0.85rem;}
.sd-query{width:100%;box-sizing:border-box;padding:0.35rem 0.5rem;margin-bottom:0.5rem;border:1px solid #ddd;border-radius:6px;}
.sd-fields{margin:0.5rem 0;}
.sd-field{margin:0.4rem 0;color:#333;}
.sd-actions{margin-top:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap;}
.sd-btn{padding:0.35rem 0.75rem;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:0.85rem;}
.sd-btn-danger{border-color:#dc2626;color:#dc2626;}
.sd-confirm{display:flex;gap:0.75rem;align-items:center;padding:0.75rem 1rem;margin-bottom:1rem;border-radius:8px;background:#fff7ed;border:1px solid #fdba74;}
.sd-confirm-danger{background:#fef2f2;border-color:#fca5a5;}
.sd-hint{color:#888;font-size:0.85rem;}
.sd-error{color:#dc2626;font-size:0.85rem;}
`;

const style = document.createElement("style");
style.textContent = demoCss;
document.head.appendChild(style);

pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: HTMLElement) =>
    application(program)(root),
  ),
);
