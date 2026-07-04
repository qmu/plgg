/**
 * The plggmatic Render module: the screen-mode renderers
 * (D10) — pure projections of ticket 09's scheduled
 * `Scene` into a display. The multi-column mode lands
 * here (ticket 10); the single-column mode and the
 * runtime `Mode` dispatcher join it (ticket 11). No
 * renderer stores state or reaches for `window`; each is
 * `(Scene) => Html<SchedulerMsg>`.
 */
export { multiColumn } from "plggmatic/Render/usecase/multiColumn";
