import {
  pipe,
  fromNullable,
  mapOption,
} from "plgg";
import { application } from "plgg-view/client";
import { app, appCss } from "./app.ts";

/**
 * CSR entry — the only side-effecting module. Injects
 * the app's static stylesheet (baseline + scheme
 * variables + shell geometry; the atomic per-element
 * rules are managed by the runtime's own sheet) and
 * mounts the workbench program onto `#root`.
 * `application` (not `sandbox`) so the runtime owns the
 * URL: the section/note selections are reflected to the
 * address bar and seeded back from a deep link, and
 * back/forward walks the selection history.
 */
const style = document.createElement("style");
style.textContent = appCss;
document.head.appendChild(style);

pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: HTMLElement) =>
    application(app)(root),
  ),
);
