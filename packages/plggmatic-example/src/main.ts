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
} from "plggmatic/style";
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

// The plggmatic appearance contract, wired at this real
// consumer's boot seam: pick the scheme from the stored
// choice else the OS preference, then apply+persist the
// global `html.dark` class. (plgg-view now has Cmd/Sub
// (ticket 06), so per-toggle persistence could move into a
// `cmdEffect` off the toggle Msg; this boot-time apply
// stays here as the one-shot startup path.)
applyScheme(
  decideScheme(
    fromNullable(
      window.localStorage.getItem(
        appearanceStorageKey,
      ),
    ),
    window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches,
  ),
  document.documentElement,
  window.localStorage,
);

pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: HTMLElement) =>
    application(app)(root),
  ),
);
