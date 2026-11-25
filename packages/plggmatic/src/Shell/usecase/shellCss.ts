import { type SoftStr } from "plgg";
import { type Theme } from "plggmatic/Style/model/theme";
import { colorVar } from "plggmatic/Style/model/token";
import { metricVar } from "plggmatic/Style/model/metric";

/**
 * THE LOOK of the framework's standard screen
 * ({@link shell}), as one escape-safe sheet (no `<`, `>`,
 * `&`).
 *
 * The rules it holds to, so a product built on it reads as
 * one family:
 *
 * - **One ink.** Every separator is a hairline in the TEXT
 *   colour, not a grey: the frame is drawn, not shaded.
 * - **Square.** Nothing is rounded.
 * - **Inversion is the only emphasis.** The current thing —
 *   the sidebar's row, the link that opened the page beside
 *   it — is text-on-fill swapped; hover does the same, more
 *   quietly. No accent colour.
 * - **Every column is the same thing.** A 3rem head bar
 *   that names it and a body that scrolls on its own;
 *   sidebar and pages alike.
 * - **Motion says what changed.** A page arriving grows
 *   from no width while its neighbour gives up the room; a
 *   page leaving does the reverse; a page replaced in place
 *   only fades, because the room did not change.
 *
 * Widths come from the shared strip ({@link shareCss},
 * composed by {@link kitCss}); this sheet publishes the
 * sidebar's width as the strip's inset. Inside a page,
 * `.<p>-doc` sets the type: prose keeps a reading measure,
 * figures and examples take the column's width.
 */
export const shellCss = (
  theme: Theme,
): SoftStr => {
  const p = theme.prefix;
  const cvar = colorVar(theme);
  const mvar = metricVar(theme);
  const text = cvar("text");
  const surface = cvar("surface");
  const fill = cvar("primary-base");
  const muted = cvar("muted");
  const inset = `--${p}-share-inset`;
  const min = `[data-${p}-shell-min]`;
  // folded: the mark is on the shell itself or on any
  // ancestor (a static page sets it on the root element
  // before first paint)
  const M = `:is(${min} .${p}-shell,.${p}-shell${min})`;
  const side = `.${p}-shell-side`;
  const page = `.${p}-shell-page`;
  const doc = `.${p}-doc`;
  const ease = "cubic-bezier(.2,.7,.2,1)";
  return `
.${p}-shell{position:relative;display:flex;flex-direction:column;height:100dvh;${inset}:${mvar("sidebar")};background:${surface};color:${text};font-family:"Inter","Noto Sans JP",system-ui,-apple-system,"Segoe UI","Hiragino Sans",sans-serif;font-size:15px;line-height:1.75;-webkit-font-smoothing:antialiased}
.${p}-shell *{box-sizing:border-box}
.${p}-shell .${p}-row{flex:1 1 auto;min-height:0;display:flex;align-items:stretch;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scroll-padding-left:var(${inset})}
.${p}-shell .${p}-col{flex:none;display:flex;flex-direction:column;min-height:0;overflow:hidden;background:${surface};border-right:1px solid ${text}}
.${p}-shell-head{flex:none;display:flex;align-items:center;gap:.5rem;height:3rem;padding:0 .5rem 0 1.25rem;border-bottom:1px solid ${text};font-size:.875rem;line-height:1.25rem;font-weight:600}
.${p}-shell-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.${p}-shell-body{flex:1 1 auto;min-height:0;overflow:auto;scroll-behavior:smooth}
${side}{width:var(${inset});position:sticky;left:0;z-index:3;transition:width .2s ease}
${side} .${p}-shell-body{font-size:.875rem}
${page} .${p}-shell-body{padding:2rem 2.5rem 3rem}
.${p}-shell-brand{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-left:-.5rem;padding:.25rem .5rem;font-size:1rem;letter-spacing:-.01em;line-height:1.25rem;font-weight:600;color:${text};text-decoration:none;transition:background-color .15s ease,color .15s ease}
.${p}-shell-brand:hover,.${p}-shell-brand:focus-visible,.${p}-shell-brand[aria-current]{background:${fill};color:${surface};outline:0}
.${p}-shell-fold{display:inline-flex;margin-left:auto;flex:none;width:1.9rem;height:1.9rem;padding:0;border:0;background:none;color:${text};cursor:pointer;align-items:center;justify-content:center;transition:background-color .15s ease,color .15s ease}
.${p}-shell-fold:hover,.${p}-shell-fold:focus-visible{background:${fill};color:${surface};outline:0}
.${p}-shell-fold span{position:relative;display:block;width:1rem;height:.8rem;border:1.5px solid currentColor}
.${p}-shell-fold span::before{content:"";position:absolute;top:0;bottom:0;left:.25rem;border-left:1.5px solid currentColor}
.${p}-shell-foot{flex:none;margin-top:auto;display:flex;align-items:center;gap:.5rem;padding:.6rem 1.25rem;border-top:1px solid ${text}}
${M}{${inset}:3rem}
${M} ${side} .${p}-shell-brand,${M} ${side} .${p}-shell-body{display:none}
${M} ${side} .${p}-shell-head{padding:0;justify-content:center}
${M} .${p}-shell-fold{margin:0}
${M} .${p}-shell-foot{padding:.6rem 0;justify-content:center}
.${p}-shell .${p}-fold{flex:none;width:1.75rem;height:1.75rem;display:inline-flex;align-items:center;justify-content:center;border:0;background:none;color:${muted};font:inherit;font-size:1.1rem;line-height:1;cursor:pointer;text-decoration:none}
.${p}-shell .${p}-fold:hover,.${p}-shell .${p}-fold:focus-visible{background:${fill};color:${surface};outline:0}
@keyframes ${p}-page-in{from{flex-grow:0;flex-basis:0;opacity:0}}
@keyframes ${p}-page-out{to{flex-grow:0;flex-basis:0;opacity:0;border-right-width:0}}
@keyframes ${p}-page-swap{from{opacity:0}}
${page} ~ ${page}{animation:${p}-page-in .34s ${ease}}
.${p}-shell ${page}${page}[data-${p}-replacing]{animation:${p}-page-swap .18s ease-out}
.${p}-shell ${page}${page}[data-${p}-leaving]{animation:${p}-page-out .26s cubic-bezier(.4,0,.6,1) forwards;pointer-events:none}
${doc}{display:block;margin:0}
${doc} :is(p,li,h1,h2,h3,h4,blockquote,dl){max-width:${mvar("measure")}}
${doc} h1{font-size:1.375rem;font-weight:600;letter-spacing:-.01em;line-height:1.3;margin:0 0 1rem}
${doc} h1 + p{color:${muted}}
${doc} h2{font-size:1.0625rem;font-weight:600;line-height:1.4;margin:2.5rem 0 .75rem}
${doc} h3{font-size:.9375rem;font-weight:600;line-height:1.5;margin:1.75rem 0 .5rem}
${doc} h4{font-size:.875rem;font-weight:600;line-height:1.5;color:${muted};margin:1.25rem 0 .5rem}
${doc} p{margin:.85rem 0}
${doc} ul,${doc} ol{padding-left:1.35rem;margin:.85rem 0}
${doc} li{margin:.35rem 0}
${doc} strong{font-weight:600}
${doc} a{color:${text};text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;padding:.15em .3em;margin-inline:-.3em;transition:background-color .15s ease,color .15s ease}
${doc} a:hover,${doc} a:focus-visible,${doc} a[data-${p}-opened]{background:${fill};color:${surface};text-decoration:none;outline:0}
${doc} code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em;padding:.1em .35em;background:${cvar("surface-2")}}
${doc} pre{margin:1rem 0;padding:.9rem 1rem;overflow:auto;border:1px solid ${text};font-size:.8125rem;line-height:1.6}
${doc} pre code{padding:0;background:none;font-size:inherit}
${doc} table{border-collapse:collapse;margin:1rem 0;font-size:.875rem}
${doc} th,${doc} td{text-align:left;padding:.45rem .9rem .45rem 0;border-bottom:1px solid ${cvar("border")}}
${doc} th{border-bottom-color:${text};font-weight:600}
${doc} hr{border:none;border-top:1px solid ${cvar("border")};margin:1.5rem 0}
@media (max-width:959px){${page} .${p}-shell-body{padding:1.25rem 1.25rem 3rem}}
@media (prefers-reduced-motion:reduce){${side},.${p}-shell-brand,.${p}-shell-fold,${doc} a{transition:none}${page} ~ ${page},.${p}-shell ${page}${page}[data-${p}-replacing],.${p}-shell ${page}${page}[data-${p}-leaving]{animation:none}}
`;
};
