import { type SoftStr } from "plgg";
import { type Theme } from "plggmatic/Style/model/theme";
import { metricVar } from "plggmatic/Style/model/metric";
import { zValue } from "plggmatic/Style/model/zIndex";
import {
  minWidth,
  maxWidth,
} from "plggmatic/Style/model/breakpoint";
import {
  shareCss,
  shareOptions,
} from "plggmatic/Style/usecase/shareCss";

/**
 * THE UI SYSTEM as a stylesheet: structure and behaviour,
 * and not one decision about how anything looks.
 *
 * What it fixes is what makes a screen a plggmatic screen
 * whatever it is dressed in:
 *
 * - **The frame.** A sidebar pinned on the left; beside it
 *   a strip of pages that scrolls sideways.
 * - **A column.** Sidebar or page, it is a head over a
 *   body, and the body scrolls on its own.
 * - **Sharing.** The open pages divide the room right of
 *   the sidebar, up to what the window holds
 *   ({@link shareCss}); past that the strip scrolls and
 *   two controls step it.
 * - **A page.** What a page shows keeps the reading
 *   measure and stands in the middle of its column; a
 *   page that asks for two columns is a figure or a whole
 *   screen and takes the room.
 * - **A narrow window.** Below the `lg` breakpoint the
 *   sidebar is a drawer: off the left edge until a menu
 *   control in a bar above the strip brings it over the
 *   page, which a backdrop dims. The drawer's state is a
 *   hidden checkbox (no program needed) or an attribute a
 *   program sets. The strip shows a page at a time.
 * - **States.** The sidebar folds to a strip (where it is
 *   a column: from the `lg` breakpoint up). A sidebar
 *   group is a disclosure. A page can be arriving, leaving
 *   or replacing another — the system names each state and
 *   moves the layout; it does not say how long it takes.
 * - **Controls.** A field is a label over an input; a
 *   dialog is centred over the page; toasts stack in a
 *   corner.
 *
 * It contains no colour, no font, no border, no radius, no
 * padding and no duration. Those are an `Appearance`'s,
 * and a screen with this sheet alone is a correct, usable,
 * unstyled layout. Escape-safe (no `<`, `>`, `&`).
 */
export const systemCss = (
  theme: Theme,
): SoftStr => {
  const p = theme.prefix;
  const mvar = metricVar(theme);
  const inset = `--${p}-share-inset`;
  const min = `[data-${p}-shell-min]`;
  const M = `:is(${min} .${p}-shell,.${p}-shell${min})`;
  const side = `.${p}-shell-side`;
  const page = `.${p}-shell-page`;
  const group = `details.${p}-nav-group`;
  const car = `.${p}-carousel-prev,.${p}-carousel-next`;
  return (
    `
.${p}-shell{position:relative;display:flex;flex-direction:column;height:100dvh;${inset}:${mvar("sidebar")}}
.${p}-shell *{box-sizing:border-box}
.${p}-shell .${p}-row{flex:1 1 auto;min-height:0;display:flex;align-items:stretch;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scroll-padding-left:var(${inset})}
.${p}-shell .${p}-col{flex:none;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.${p}-shell-head{flex:none;display:flex;align-items:center}
.${p}-shell-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.${p}-shell-body{flex:1 1 auto;min-height:0;overflow:auto}
${side}{width:var(${inset});position:sticky;left:0;z-index:3}
.${p}-shell-brand{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.${p}-shell-fold{display:inline-flex;margin-left:auto;flex:none;align-items:center;justify-content:center;cursor:pointer}
.${p}-shell-foot{flex:none;margin-top:auto;display:flex;align-items:center}
@media ${minWidth("lg")}{
${M}{${inset}:3rem}
${M} ${side} .${p}-shell-brand,${M} ${side} .${p}-shell-body{display:none}
${M} ${side} .${p}-shell-head{justify-content:center}
${M} .${p}-shell-fold{margin:0}
${M} .${p}-shell-foot{justify-content:center}
}
.${p}-shell-menu{display:none}
.${p}-shell-bar{display:none;flex:none;align-items:center;z-index:${zValue("chrome")}}
.${p}-shell-menu-btn{display:inline-block;flex:none;width:22px;height:16px;cursor:pointer}
.${p}-shell-bar-brand{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.${p}-shell-backdrop{display:none;position:fixed;inset:0;z-index:${zValue("backdrop")}}
@media ${maxWidth("lg")}{
.${p}-shell{${inset}:0px}
.${p}-shell-bar{display:flex}
.${p}-shell-fold{display:none}
${side}{position:fixed;top:0;left:0;z-index:${zValue("overlay")};height:100dvh;width:17rem;max-width:82vw;transform:translateX(-100%)}
.${p}-shell-menu:checked ~ .${p}-row ${side},.${p}-shell[data-${p}-shell-open] ${side}{transform:translateX(0)}
.${p}-shell-menu:checked ~ .${p}-shell-backdrop,.${p}-shell[data-${p}-shell-open] .${p}-shell-backdrop{display:block}
.${p}-shell .${p}-row{scroll-snap-type:x mandatory}
${page}{scroll-snap-align:start;scroll-snap-stop:always}
}
.${p}-shell .${p}-fold{flex:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
@keyframes ${p}-page-in{from{flex-grow:0;flex-basis:0;opacity:0}}
@keyframes ${p}-page-out{to{flex-grow:0;flex-basis:0;opacity:0;border-right-width:0}}
@keyframes ${p}-page-swap{from{opacity:0}}
.${p}-shell ${page}${page}[data-${p}-leaving]{pointer-events:none}
.${p}-doc{display:block;margin:0 auto;max-width:${mvar("measure")}}
.${p}-span-2 .${p}-doc{max-width:none}
.${p}-doc pre{overflow-x:auto}
.${p}-doc table{display:block;overflow-x:auto}
.${p}-doc img{max-width:100%}
.${p}-nav{display:block}
.${p}-nav-link,.${p}-nav-flat{display:block}
.${p}-nav-numbered{counter-reset:sample}
${group}{counter-reset:sample;interpolate-size:allow-keywords}
${group} summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;user-select:none}
${group} summary::-webkit-details-marker{display:none}
${group}::details-content{block-size:0;overflow:clip}
${group}[open]::details-content{block-size:auto}
.${p}-nav-numbered .${p}-nav-link{counter-increment:sample}
.${p}-nav-numbered .${p}-nav-link::before{content:counter(sample,decimal-leading-zero);font-variant-numeric:tabular-nums;margin-right:1rem}
${car}{position:absolute;top:50%;z-index:${zValue("chrome")};display:flex;align-items:center;justify-content:center;cursor:pointer}
.${p}-carousel-prev[hidden],.${p}-carousel-next[hidden]{display:none}
.${p}-carousel-prev{left:calc(var(${inset},0px) + .6rem)}
.${p}-carousel-next{right:.6rem}
.${p}-btn{display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.${p}-btn:disabled,.${p}-disabled{cursor:not-allowed}
.${p}-actions{display:flex;flex-wrap:wrap}
.${p}-form{display:flex;flex-direction:column}
.${p}-field{display:flex;flex-direction:column}
.${p}-check{flex-direction:row;align-items:center}
.${p}-prop{display:grid;grid-template-columns:minmax(5.5rem,2fr) minmax(0,3fr);align-items:center}
.${p}-prop-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.${p}-prop-control{min-width:0;display:flex;align-items:center}
.${p}-prop-control .${p}-input{flex:1 1 auto;width:100%;min-width:0}
.${p}-switch{display:inline-flex;align-items:center;cursor:pointer}
.${p}-switch:disabled{cursor:not-allowed}
.${p}-switch-track{position:relative;display:block;flex:none;width:2.25rem;height:1.25rem}
.${p}-switch-thumb{position:absolute;top:50%;left:.2rem;width:.75rem;height:.75rem;margin-top:-.375rem}
.${p}-switch:is([aria-checked="true"],[aria-pressed="true"]) .${p}-switch-thumb{transform:translateX(1.05rem)}
.${p}-switch[aria-pressed="mixed"] .${p}-switch-thumb{transform:translateX(.525rem)}
.${p}-modal{position:fixed;inset:0;z-index:${zValue("backdrop")}}
.${p}-backdrop{position:fixed;inset:0;z-index:${zValue("backdrop")}}
.${p}-dialog{position:fixed;z-index:${zValue("overlay")};top:50%;left:50%;transform:translate(-50%,-50%);width:min(26rem,90vw)}
.${p}-dialog-actions{display:flex;justify-content:flex-end}
.${p}-toaster{position:fixed;right:1rem;bottom:1rem;z-index:${zValue("overlay")};display:flex;flex-direction:column}
.${p}-toast{display:flex;align-items:center}
.${p}-toast-close{flex:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
` + shareCss(theme)(shareOptions)
  );
};
