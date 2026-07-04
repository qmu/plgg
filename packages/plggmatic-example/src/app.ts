import { type SoftStr } from "plgg";
import {
  type Html,
  slot,
  span,
  text,
  attr,
} from "plgg-view";
import {
  type Application,
} from "plgg-view/client";
import {
  type ScheduledModel,
  type SchedulerMsg,
  schedule,
  multiColumn,
} from "plggmatic";
import * as sx from "plggmatic/style";
import { declaration } from "./declaration.ts";
import { demoCss } from "./demoStyles.ts";

/**
 * The reference plggmatic app — PHASE 4's proof of value.
 * The whole program is a {@link declaration} (Resources,
 * Menu, List/Detail views, Query, create/delete Actions
 * with confirmation-as-data, Flow) passed through
 * `schedule(...)` and drawn by the multi-column renderer.
 * The 691-line hand-written `Model`/`Msg`/`update`/URL
 * codec/column-stack is GONE — the app author writes only
 * the declaration (see `declaration.ts`), the app-identity
 * chrome below, and the thin mount (`main.ts`). Every
 * landmark, close link, `aria-current`, and the confirm
 * dialog come from the declaration alone.
 */
/**
 * The scheduled program derived from the declaration —
 * exported so specs can assert the derived URL codec
 * (`toUrl`) directly, which the `Application` view of it
 * types as optional.
 */
export const scheduled = schedule(declaration);

/** The wired program the client entry mounts. */
export const app: Application<
  ScheduledModel,
  SchedulerMsg
> = {
  ...scheduled,
  view: (model: ScheduledModel): Html<SchedulerMsg> =>
    slot(
      [attr("class", "ex-root")],
      [
        span(
          [attr("class", "ex-brand")],
          [text("Field Notes")],
        ),
        multiColumn(scheduled.scene(model)),
      ],
    ),
};

// --- App-identity chrome (the only hand-written CSS) ---

/**
 * The framework's own stylesheets (shell metrics, the
 * `--pm-*` scheme variables, and the multi-column chrome)
 * plus a small demo stylesheet for the interactive hooks
 * the design system does not yet own (form controls, the
 * dialog, toasts — ticket 12) and the app-identity shell.
 * Injected once at boot by the client entry.
 */
export const appCss: SoftStr =
  `body{margin:0;font-family:system-ui,sans-serif;line-height:1.6;background:var(--pm-surface);color:var(--pm-text);}` +
  `.ex-root{min-height:100vh;}` +
  `.ex-brand{position:fixed;top:0.5rem;left:1rem;z-index:${sx.zValue("chrome")};font-weight:600;opacity:0.5;font-size:0.8rem;}` +
  `.pm-query{width:100%;box-sizing:border-box;padding:0.35rem 0.5rem;margin:0.35rem 0;border:1px solid var(--pm-border);border-radius:6px;background:var(--pm-surface);color:var(--pm-text);}` +
  sx.metricCss +
  sx.schemeCss +
  sx.chromeCss +
  demoCss;
