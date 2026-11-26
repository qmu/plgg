import { type SoftStr } from "plgg";
import { type Theme } from "plggmatic/Style/model/theme";
import { colorVar } from "plggmatic/Style/model/token";
import { themeToggleClass } from "plggmatic/Component/usecase/themeToggle";
import {
  type Appearance,
  type Mark,
} from "plggmatic/Appearance/model/appearance";

/**
 * AN APPEARANCE AS RULES: every visual decision of the UI
 * system's parts, read from one {@link Appearance} value.
 *
 * The other half of `systemCss`, and deliberately its
 * complement: this sheet positions nothing and sizes no
 * layout — it only dresses what the system has already
 * laid out. Swap the appearance and the same markup, in
 * the same places, behaving the same way, looks like
 * another product.
 *
 * Nothing here is a constant of the framework. A colour is
 * a role resolved through the palette; a width, a radius,
 * a duration, a font is the appearance's. The few literal
 * lengths that remain are proportions of the type (an
 * icon's box, a chevron's arms), not taste.
 *
 * Escape-safe (no `<`, `>`, `&`).
 */
export const appearanceCss =
  (theme: Theme) =>
  (a: Appearance): SoftStr => {
    const p = theme.prefix;
    const cvar = colorVar(theme);
    const text = cvar("text");
    const surface = cvar("surface");
    const muted = cvar("muted");
    const danger = cvar("danger-base");
    const rule = `${a.ruleWidth} solid ${cvar(a.rule)}`;
    const hair = `${a.ruleWidth} solid ${cvar(a.hairline)}`;
    const mark = (m: Mark): SoftStr =>
      `background:${cvar(m.fill)};color:${cvar(m.ink)}`;
    const quick = (
      ...props: SoftStr[]
    ): SoftStr =>
      `transition:${props.map((x) => `${x} ${a.quick} ease`).join(",")}`;
    const min = `[data-${p}-shell-min]`;
    const M = `:is(${min} .${p}-shell,.${p}-shell${min})`;
    const side = `.${p}-shell-side`;
    const page = `.${p}-shell-page`;
    const doc = `.${p}-doc`;
    const group = `details.${p}-nav-group`;
    const link = `.${p}-nav-link`;
    const car = `.${p}-carousel-prev,.${p}-carousel-next`;
    const carEach = (s: SoftStr): SoftStr =>
      `.${p}-carousel-prev${s},.${p}-carousel-next${s}`;
    const tones = [
      "success",
      "danger",
      "warning",
      "info",
    ] satisfies ReadonlyArray<
      "success" | "danger" | "warning" | "info"
    >;
    return `
.${p}-shell{background:${surface};color:${text};font-family:${a.font};font-size:${a.size};line-height:${a.leading};-webkit-font-smoothing:antialiased}
.${p}-shell .${p}-col{background:${surface};border-right:${rule}}
.${p}-shell-head{gap:.5rem;height:${a.head};padding:0 .5rem 0 ${a.gutter};border-bottom:${rule};font-size:.875rem;line-height:1.25rem;font-weight:500}
.${p}-shell-body{scroll-behavior:smooth}
${side}{transition:width ${a.arrive} ${a.ease}}
${side} .${p}-shell-body{font-size:.875rem}
${page} .${p}-shell-body{padding:${a.page}}
.${p}-shell-brand{margin-left:-.5rem;padding:.25rem .5rem;border-radius:${a.radius};font-size:1rem;letter-spacing:-.01em;line-height:1.25rem;font-weight:600;color:${text};text-decoration:none;${quick("background-color", "color")}}
.${p}-shell-brand:focus-visible{outline:${rule};outline-offset:-1px}
.${p}-shell-brand[aria-current]{${mark(a.current)}}
.${p}-shell-fold{width:1.9rem;height:1.9rem;padding:0;border:0;border-radius:${a.radius};background:none;color:${text};${quick("background-color", "color")}}
.${p}-shell-fold:hover,.${p}-shell-fold:focus-visible{${mark(a.press)};outline:0}
.${p}-shell-fold span{position:relative;display:block;width:1rem;height:.8rem;border:1.5px solid currentColor}
.${p}-shell-fold span::before{content:"";position:absolute;top:0;bottom:0;left:.25rem;border-left:1.5px solid currentColor}
.${p}-shell-foot{gap:.5rem;padding:.6rem ${a.gutter};border-top:${rule}}
${M} ${side} .${p}-shell-head{padding:0}
${M} .${p}-shell-foot{padding:.6rem 0}
.${p}-shell-bar{gap:.6rem;height:${a.head};padding:0 1rem;background:${surface};border-bottom:${rule}}
.${p}-shell-menu-btn{border:0;padding:0;color:${text};background-color:transparent;background-image:linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor);background-size:100% 2px;background-position:0 1px,0 7px,0 13px;background-repeat:no-repeat}
.${p}-shell-bar-brand{padding:.1rem .4rem;border-radius:${a.radius};font-size:1rem;font-weight:600;color:${text};text-decoration:none}
.${p}-shell-bar-brand:focus-visible{outline:${rule};outline-offset:-1px}
.${p}-shell-bar-brand[aria-current]{${mark(a.current)}}
.${p}-shell-backdrop{background:rgba(0,0,0,.4)}
@media (max-width:1023px){${side}{transition:transform ${a.leave} ease-out}}
.${p}-shell .${p}-fold{width:1.75rem;height:1.75rem;border:0;border-radius:${a.radius};background:none;color:${muted};font:inherit;font-size:1.1rem;line-height:1;text-decoration:none}
.${p}-shell .${p}-fold:hover,.${p}-shell .${p}-fold:focus-visible{${mark(a.press)};outline:0}
${page} ~ ${page}{animation:${p}-page-in ${a.arrive} ${a.ease}}
.${p}-shell ${page}${page}[data-${p}-replacing]{animation:${p}-page-swap ${a.swap} ease-out}
.${p}-shell ${page}${page}[data-${p}-leaving]{animation:${p}-page-out ${a.leave} cubic-bezier(.4,0,.6,1) forwards}
${doc} h1{font-size:1.375rem;font-weight:600;letter-spacing:-.01em;line-height:1.3;margin:0 0 1rem}
${doc} h2{font-size:1.0625rem;font-weight:600;line-height:1.4;margin:2.5rem 0 .75rem}
${doc} h3{font-size:.9375rem;font-weight:600;line-height:1.5;margin:1.75rem 0 .5rem}
${doc} h4{font-size:.875rem;font-weight:600;line-height:1.5;color:${muted};margin:1.25rem 0 .5rem}
${doc} p{margin:.85rem 0}
${doc} ul,${doc} ol{padding-left:1.35rem;margin:.85rem 0}
${doc} li{margin:.35rem 0}
${doc} strong{font-weight:600;color:${text}}
${doc} blockquote{margin:1rem 0;padding:.1rem 1rem;border-left:${rule};color:${muted}}
${doc} a{color:${text};text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;font-weight:400;padding:.15em .3em;margin-inline:-.3em;border-radius:${a.radius};${quick("background-color", "color")}}
${doc} a:hover,${doc} a:focus-visible{${mark(a.press)};text-decoration:none;outline:0;box-decoration-break:clone;-webkit-box-decoration-break:clone}
${doc} a[data-${p}-opened]{${mark(a.current)};text-decoration:none}
${doc} mark{${mark(a.current)};padding:.1em .25em;border-radius:${a.radius};box-decoration-break:clone;-webkit-box-decoration-break:clone;scroll-margin-top:1rem}
${doc} code{font-family:${a.mono};font-size:.86em;font-weight:400;color:${text};padding:.1em .35em;border:${a.ruleWidth} solid transparent;border-radius:${a.radius};background:${cvar("surface-2")}}
${doc} a:hover code,${doc} a:focus-visible code,${doc} a[data-${p}-opened] code{color:inherit;background:none;border-color:transparent}
${doc} pre{margin:1.1rem 0;padding:.875rem 1rem;background:${surface};border:${rule};border-radius:${a.radius};font-size:.8125rem;line-height:1.65}
${doc} pre code{padding:0;border:none;background:none;font-size:inherit;color:inherit}
${doc} table{border-collapse:collapse;margin:1.25rem 0;font-size:.92rem}
${doc} th,${doc} td{text-align:left;padding:.5rem 1.25rem .5rem 0;border-bottom:${hair}}
${doc} th{border-bottom:${rule};font-weight:600}
${doc} hr{border:none;border-top:${hair};margin:1.5rem 0}
${doc} :is(h1,h2,h3,h4){scroll-margin-top:1rem}
.${p}-callout{margin:1.25rem 0;padding:.75rem 1rem;border:${a.ruleWidth} solid transparent;border-radius:${a.radius};font-size:.875rem;line-height:1.625}
.${p}-callout-title{font-weight:600;margin:0 0 .35rem}
.${p}-callout p{margin:.35rem 0}
.${p}-callout-info,.${p}-callout-note{background:${surface};border-color:${cvar(a.rule)};color:${text}}
.${p}-callout-tip{background:${cvar("success-surface")};border-color:${cvar("success-border")};color:${cvar("success-text")}}
.${p}-callout-warning{background:${cvar("warning-surface")};border-color:${cvar("warning-border")};color:${cvar("warning-text")}}
.${p}-callout-danger{background:${cvar("danger-surface")};border-color:${cvar("danger-border")};color:${cvar("danger-text")}}
.${themeToggleClass}{border-radius:${a.radius === "0" ? "0" : "50%"};border:${hair}}
.${themeToggleClass}:hover{border-color:${cvar(a.rule)}}
.${themeToggleClass}:focus-visible{outline:${rule};outline-offset:2px}
.${p}-nav-group{margin:0}
.${p}-nav-group-title{padding:1.1rem ${a.gutter} .4rem;font-size:.75rem;line-height:1.25rem;font-weight:500;color:${muted};border-bottom:${hair}}
${link}{padding:.5rem ${a.gutter};border-bottom:${hair};font-size:.875rem;line-height:1.45;color:${text};text-decoration:none}
${link}:hover{${mark(a.hover)};text-decoration:none}
${link}:focus-visible{${mark(a.press)};text-decoration:none;outline:0}
.${p}-nav-label{padding:.15rem .5rem;margin-inline:-.5rem;border-radius:${a.radius};box-decoration-break:clone;-webkit-box-decoration-break:clone}
${link}[aria-current] .${p}-nav-label{${mark(a.current)}}
.${p}-nav-flat{padding:.5rem ${a.gutter};border-bottom:${hair};font-size:.875rem;line-height:1.45;color:${muted}}
.${p}-nav-subgroup{margin:0}
.${p}-nav-subgroup-title{padding:.5rem ${a.gutter};font-size:.875rem;line-height:1.45;border-bottom:${hair};font-weight:500;color:${text}}
${group} summary{padding:.7rem ${a.gutter};font-size:.875rem;font-weight:400;color:${text};${quick("background-color", "color")}}
${group} summary::after{content:"";width:.4rem;height:.4rem;margin-right:.2rem;border-right:1px solid currentColor;border-bottom:1px solid currentColor;transform:rotate(-45deg);transition:transform ${a.quick} ease}
${group}[open] summary::after{transform:rotate(45deg)}
${group}[open] summary{color:${text}}
${group} summary:hover{${mark(a.hover)}}
${group} summary:focus-visible{${mark(a.press)};outline:0}
${group} summary:active{opacity:.8}
${group}::details-content{transition:block-size ${a.leave} ease,content-visibility ${a.leave} allow-discrete}
${group} ${link}{${quick("background-color", "color", "padding-left")}}
${group}{border-bottom:${hair}}
${group} ${link},${group} .${p}-nav-flat,${group} .${p}-nav-subgroup-title{padding-top:.4rem;padding-bottom:.4rem;padding-left:calc(${a.gutter} + .9rem);border-bottom:0;font-size:.8125rem}
${group}[open] summary{padding-bottom:.45rem}
${group}[open]::details-content{padding-bottom:.5rem}
${group} ${link}:hover{padding-left:calc(${a.gutter} + 1.15rem)}
${group} ${link}[aria-current]:hover{padding-left:calc(${a.gutter} + .9rem)}
${car}{width:2.25rem;height:2.25rem;margin-top:-1.125rem;padding:0;border:${rule};border-radius:${a.radius};background:${surface};color:${text};box-shadow:${a.elevation};${quick("background-color", "color")}}
${carEach("::before")}{content:"";width:.5rem;height:.5rem;border-top:1.5px solid currentColor;border-right:1.5px solid currentColor}
.${p}-carousel-prev::before{transform:translateX(.12rem) rotate(-135deg)}
.${p}-carousel-next::before{transform:translateX(-.12rem) rotate(45deg)}
${carEach(":hover")},${carEach(":focus-visible")}{${mark(a.press)};outline:0}
.${p}-btn{gap:.4rem;min-height:2.1rem;padding:.35rem .9rem;border:${rule};border-radius:${a.radius};background:${surface};color:${text};font:inherit;font-size:.875rem;font-weight:500;line-height:1.25rem;${quick("background-color", "color", "opacity")}}
.${p}-btn:hover:not(:disabled),.${p}-btn:focus-visible{${mark(a.press)};outline:0}
.${p}-btn-primary{background:${cvar("primary-base")};color:${surface};border-color:${cvar("primary-base")}}
.${p}-btn-primary:hover:not(:disabled),.${p}-btn-primary:focus-visible{opacity:.82;background:${cvar("primary-base")};color:${surface}}
.${p}-btn-danger{border-color:${danger};color:${danger}}
.${p}-btn-danger:hover:not(:disabled),.${p}-btn-danger:focus-visible{background:${danger};color:${surface};border-color:${danger}}
.${p}-btn:disabled,.${p}-disabled{opacity:.45}
.${p}-actions{gap:.5rem;margin-top:.9rem}
.${p}-form{gap:.25rem;max-width:26rem}
.${p}-fields{margin:.5rem 0}
.${p}-field{margin:.55rem 0;gap:.3rem}
.${p}-check{gap:.55rem}
.${p}-field-label{font-size:.8125rem;font-weight:600;color:${text}}
.${p}-input{padding:.45rem .6rem;border:${rule};border-radius:${a.radius};background:${surface};color:${text};font:inherit;font-size:.875rem;line-height:1.4;transition:box-shadow ${a.quick} ease}
.${p}-input:focus,.${p}-input:focus-visible{outline:0;box-shadow:inset 0 0 0 1px ${cvar(a.rule)}}
.${p}-input::placeholder{color:${muted}}
.${p}-input[aria-invalid="true"]{border-color:${danger}}
.${p}-checkbox{width:1rem;height:1rem;margin:0;accent-color:${cvar("primary-base")}}
.${p}-field-error,.${p}-error{color:${danger};font-size:.8125rem}
.${p}-hint{color:${muted};font-size:.8125rem}
select.${p}-input{appearance:none;padding-right:1.9rem;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - .95rem) 50%,calc(100% - .65rem) 50%;background-size:.3rem .3rem;background-repeat:no-repeat;cursor:pointer}
.${p}-input:disabled{opacity:.45}
.${p}-props{border-top:${hair}}
.${p}-prop{column-gap:.75rem;min-height:2.5rem;padding:.3rem ${a.gutter};border-bottom:${hair}}
.${p}-prop-label{font-size:.8125rem;line-height:1.3;color:${text}}
.${p}-prop-control .${p}-input{padding:.3rem .55rem;font-size:.8125rem}
.${p}-prop-control select.${p}-input{padding-right:1.7rem}
.${p}-prop-control{gap:.4rem}
.${p}-props .${p}-btn{min-height:0;padding:.3rem .55rem;font-size:.8125rem;font-weight:400}
.${p}-btn[aria-pressed="true"]{${mark(a.current)}}
.${p}-switch{gap:.55rem;padding:0;border:0;background:none;color:${text};font:inherit;font-size:.8125rem;line-height:1.3}
.${p}-switch-track{border:${rule};border-radius:${a.radius === "0" ? "0" : "999px"};background:${surface};${quick("background-color", "border-color")}}
.${p}-switch-thumb{border-radius:${a.radius === "0" ? "0" : "50%"};background:${text};transition:transform ${a.quick} ${a.ease},background-color ${a.quick} ease}
.${p}-switch:is([aria-checked="true"],[aria-pressed="true"]) .${p}-switch-track{background:${cvar("primary-base")};border-color:${cvar("primary-base")}}
.${p}-switch:is([aria-checked="true"],[aria-pressed="true"]) .${p}-switch-thumb{background:${surface}}
.${p}-switch[aria-pressed="mixed"] .${p}-switch-thumb{background:${muted}}
.${p}-switch:focus-visible{outline:0}
.${p}-switch:focus-visible .${p}-switch-track{box-shadow:0 0 0 2px ${surface},0 0 0 3px ${cvar(a.rule)}}
.${p}-switch:disabled{opacity:.45}
.${p}-backdrop{background:rgba(0,0,0,.45)}
.${p}-dialog{padding:1.25rem 1.4rem;background:${surface};color:${text};border:${rule};border-radius:${a.radius};box-shadow:${a.elevation}}
.${p}-dialog-title{margin:0 0 .5rem;font-size:1rem;font-weight:600}
.${p}-dialog-actions{gap:.5rem;margin-top:1.1rem}
.${p}-toaster{gap:.5rem}
.${p}-toast{gap:.9rem;padding:.55rem .6rem .55rem .9rem;border:${rule};border-radius:${a.radius};background:${surface};color:${text};font-size:.875rem;box-shadow:${a.elevation}}
${tones
  .map(
    (name): SoftStr =>
      `.${p}-toast-${name}{background:${cvar(`${name}-surface`)};color:${cvar(`${name}-text`)};border-color:${cvar(`${name}-border`)}}`,
  )
  .join("\n")}
.${p}-toast-close{width:1.6rem;height:1.6rem;padding:0;border:0;border-radius:${a.radius};background:none;color:inherit;font-size:1.05rem;line-height:1}
.${p}-toast-close:hover,.${p}-toast-close:focus-visible{background:currentColor;outline:0}
@media (max-width:959px){${page} .${p}-shell-body{padding:1.25rem 1.25rem 3rem}}
@media (prefers-reduced-motion:reduce){${side},.${p}-shell-brand,.${p}-shell-fold,${doc} a,${group} summary,${group} summary::after,${group}::details-content,${group} ${link},${car},.${p}-btn,.${p}-input,.${p}-switch-track,.${p}-switch-thumb{transition:none}${page} ~ ${page},.${p}-shell ${page}${page}[data-${p}-replacing],.${p}-shell ${page}${page}[data-${p}-leaving]{animation:none}}
`;
  };
