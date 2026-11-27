import { type SoftStr } from "plgg";

/**
 * THE BASIC PARTS, AS RULES — in the same two halves the
 * kit keeps everywhere: what a part IS (its structure,
 * which no skin changes) and how it is DRESSED (read from
 * the appearance). Escape-safe (no `<`, `>`, `&`).
 */

/** The structure of the basic parts. */
export const partsSystemCss = (
  p: SoftStr,
  overlay: SoftStr,
): SoftStr => `
.${p}-badge{display:inline-flex;align-items:center;white-space:nowrap;vertical-align:middle}
.${p}-tag{display:inline-flex;align-items:center;white-space:nowrap;vertical-align:middle}
.${p}-tag-remove{flex:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.${p}-card{display:flex;flex-direction:column;min-width:0}
.${p}-card-foot{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap}
.${p}-table-wrap{max-width:100%;overflow-x:auto}
.${p}-table{width:100%;border-collapse:collapse}
.${p}-table :is(th,td){text-align:left;white-space:nowrap}
.${p}-table .${p}-num{text-align:right;font-variant-numeric:tabular-nums}
.${p}-desc{display:grid;grid-template-columns:minmax(5.5rem,max-content) minmax(0,1fr);margin:0}
.${p}-desc dd{margin:0;min-width:0}
.${p}-divider{display:block;width:100%;height:0;margin:0}
.${p}-avatar{display:inline-flex;align-items:center;justify-content:center;flex:none;width:2rem;height:2rem;overflow:hidden;vertical-align:middle}
.${p}-code{margin:0;overflow-x:auto;white-space:pre}
.${p}-empty{display:flex;flex-direction:column;align-items:center;text-align:center}
.${p}-empty p{margin:0}
.${p}-items{list-style:none;margin:0}
.${p}-items-row{display:flex;align-items:center;justify-content:space-between}
.${p}-items-row div:first-child{min-width:0}
.${p}-items-title,.${p}-items-note{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.${p}-items-trail{flex:none;display:flex;align-items:center}
.${p}-alert p{margin:0}
.${p}-progress-track{position:relative;width:100%;overflow:hidden}
.${p}-progress-bar{height:100%}
.${p}-progress[data-${p}-busy] .${p}-progress-bar{width:40%}
.${p}-spinner{display:inline-flex;align-items:center}
.${p}-spinner-mark{flex:none;display:block;width:1rem;height:1rem}
.${p}-skeleton{display:flex;flex-direction:column}
.${p}-skeleton-line{height:.8rem}
.${p}-skeleton-line:last-child:not(:first-child){width:60%}
.${p}-tip{position:relative;display:inline-flex}
.${p}-tip::after{content:attr(data-${p}-tip);position:absolute;z-index:${overlay};bottom:calc(100% + .35rem);left:50%;transform:translateX(-50%);width:max-content;max-width:16rem;pointer-events:none;opacity:0}
.${p}-tip:is(:hover,:focus-visible,:focus-within)::after{opacity:1}
.${p}-tabs{display:flex;overflow-x:auto}
.${p}-tab{flex:none;cursor:pointer;white-space:nowrap}
.${p}-pager{display:flex;align-items:center;flex-wrap:wrap}
.${p}-pager-item{display:inline-flex;align-items:center;justify-content:center;min-width:2rem;height:2rem;cursor:pointer}
.${p}-pager-item:disabled{cursor:not-allowed}
.${p}-steps{display:flex;list-style:none;margin:0;counter-reset:${p}-step}
.${p}-step{flex:1 1 0;min-width:0;display:flex;align-items:center;counter-increment:${p}-step;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.${p}-step::before{content:counter(${p}-step);flex:none;display:inline-flex;align-items:center;justify-content:center;width:1.5rem;height:1.5rem}
.${p}-accordion-item summary{display:flex;align-items:center;justify-content:space-between;cursor:pointer;list-style:none}
.${p}-accordion-item summary::-webkit-details-marker{display:none}
.${p}-accordion-item summary::after{content:"";flex:none;width:.45rem;height:.45rem;transform:rotate(45deg)}
.${p}-accordion-item[open] summary::after{transform:rotate(225deg)}
.${p}-menu-button{position:relative;display:inline-block}
.${p}-menu-button summary{display:inline-flex;align-items:center;cursor:pointer;list-style:none}
.${p}-menu-button summary::-webkit-details-marker{display:none}
.${p}-menu-button summary::after{content:"";flex:none;width:.4rem;height:.4rem;transform:rotate(45deg) translateY(-.15rem)}
.${p}-menu-list{position:absolute;z-index:${overlay};top:calc(100% + .25rem);left:0;display:flex;flex-direction:column;min-width:10rem}
.${p}-menu-item{display:block;width:100%;text-align:left;cursor:pointer;white-space:nowrap}
.${p}-icon-btn{display:inline-flex;align-items:center;justify-content:center;flex:none;width:2rem;height:2rem;cursor:pointer}
.${p}-icon-btn:disabled{cursor:not-allowed}
.${p}-radios{display:flex;flex-direction:column;margin:0;min-width:0}
.${p}-radio{display:inline-flex;align-items:center;cursor:pointer}
.${p}-radio input{flex:none;margin:0}
.${p}-segmented{display:inline-flex}
.${p}-segment{flex:none;cursor:pointer;white-space:nowrap}
.${p}-range{display:flex;align-items:center}
.${p}-range input{flex:1 1 auto;min-width:0;margin:0}
.${p}-range-value{flex:none;min-width:2.5rem;text-align:right;font-variant-numeric:tabular-nums}
.${p}-search{display:flex}
.${p}-search .${p}-input{flex:1 1 auto;min-width:0;width:100%}
`;

/** What the appearance sheet hands the parts: its own
 * resolved values, so both sheets dress alike. */
export type PartsLook = Readonly<{
  p: SoftStr;
  text: SoftStr;
  surface: SoftStr;
  muted: SoftStr;
  wash: SoftStr;
  rule: SoftStr;
  hair: SoftStr;
  radius: SoftStr;
  round: SoftStr;
  mono: SoftStr;
  elevation: SoftStr;
  quick: SoftStr;
  current: SoftStr;
  press: SoftStr;
  hover: SoftStr;
  danger: SoftStr;
  tone: (name: SoftStr, part: SoftStr) => SoftStr;
  tones: ReadonlyArray<SoftStr>;
}>;

/** The dress of the basic parts. */
export const partsAppearanceCss = (
  l: PartsLook,
): SoftStr => {
  const p = l.p;
  const toned = (part: SoftStr): SoftStr =>
    l.tones
      .map(
        (name: SoftStr): SoftStr =>
          `.${p}-${part}-${name}{background:${l.tone(name, "surface")};color:${l.tone(name, "text")};border-color:${l.tone(name, "border")}}`,
      )
      .join("\n");
  return `
.${p}-badge{padding:.05rem .45rem;border:${l.rule};border-radius:${l.round};font-size:.75rem;line-height:1.5;font-weight:500;color:${l.text}}
${toned("badge")}
.${p}-tag{gap:.25rem;padding:.1rem .5rem;border:${l.hair};border-radius:${l.radius};background:${l.wash};font-size:.8125rem;line-height:1.5;color:${l.text}}
.${p}-tag-remove{width:1.1rem;height:1.1rem;margin-right:-.2rem;padding:0;border:0;border-radius:${l.radius};background:none;color:inherit;font-size:.9rem;line-height:1}
.${p}-tag-remove:hover,.${p}-tag-remove:focus-visible{${l.press};outline:0}
.${p}-card{border:${l.rule};border-radius:${l.radius};background:${l.surface};color:${l.text}}
.${p}-card-head{padding:.7rem 1rem;border-bottom:${l.rule};font-size:.9375rem;font-weight:600}
.${p}-card-body{padding:1rem;font-size:.875rem}
.${p}-card-body :is(p,ul,ol):first-child{margin-top:0}
.${p}-card-body :is(p,ul,ol):last-child{margin-bottom:0}
.${p}-card-foot{gap:.5rem;padding:.7rem 1rem;border-top:${l.hair}}
.${p}-table{font-size:.875rem;color:${l.text}}
.${p}-table th{padding:.5rem .75rem;border-bottom:${l.rule};font-weight:600}
.${p}-table td{padding:.5rem .75rem;border-bottom:${l.hair}}
.${p}-table tbody tr:hover{${l.hover}}
.${p}-desc{gap:.4rem 1.25rem;font-size:.875rem}
.${p}-desc dt{color:${l.muted}}
.${p}-divider{border:0;border-top:${l.hair};margin:1rem 0}
.${p}-avatar{border:${l.rule};border-radius:${l.round};background:${l.wash};color:${l.text};font-size:.875rem;font-weight:600;line-height:1}
.${p}-code{padding:.8rem 1rem;border:${l.hair};border-radius:${l.radius};background:${l.wash};font-family:${l.mono};font-size:.8125rem;line-height:1.6;color:${l.text}}
.${p}-empty{gap:.5rem;padding:2rem 1rem;border:1px dashed ${l.muted};border-radius:${l.radius};color:${l.muted};font-size:.875rem}
.${p}-empty-title{font-size:.9375rem;font-weight:600;color:${l.text}}
.${p}-empty .${p}-btn{margin-top:.5rem}
.${p}-items{padding:0;border-top:${l.hair};font-size:.875rem}
.${p}-items-row{gap:1rem;padding:.6rem .25rem;border-bottom:${l.hair}}
.${p}-items-title{font-weight:500;color:${l.text}}
.${p}-items-note{font-size:.8125rem;color:${l.muted}}
.${p}-items-trail{gap:.5rem}
.${p}-alert{padding:.7rem .9rem;border:${l.rule};border-left-width:4px;border-radius:${l.radius};font-size:.875rem;line-height:1.6}
${toned("alert")}
.${p}-alert-title{font-weight:600}
.${p}-progress-track{height:.5rem;border:${l.rule};border-radius:${l.round};background:${l.surface}}
.${p}-progress-bar{background:${l.text};transition:width ${l.quick} ease}
.${p}-progress[data-${p}-busy] .${p}-progress-bar{animation:${p}-busy 1.2s linear infinite}
@keyframes ${p}-busy{from{transform:translateX(-100%)}to{transform:translateX(250%)}}
.${p}-spinner{gap:.5rem;font-size:.875rem;color:${l.muted}}
.${p}-spinner-mark{border:2px solid ${l.muted};border-top-color:${l.text};border-radius:${l.round};animation:${p}-spin .8s linear infinite}
@keyframes ${p}-spin{to{transform:rotate(360deg)}}
.${p}-skeleton{gap:.55rem}
.${p}-skeleton-line{border-radius:${l.radius};background:${l.wash};animation:${p}-pulse 1.4s ease-in-out infinite}
@keyframes ${p}-pulse{50%{opacity:.45}}
.${p}-tip{text-decoration:underline dotted;text-underline-offset:.2em;cursor:help}
.${p}-tip::after{padding:.3rem .5rem;border-radius:${l.radius};${l.current};font-size:.75rem;line-height:1.4;font-weight:400;text-decoration:none;white-space:normal;transition:opacity ${l.quick} ease}
.${p}-tip:focus-visible{outline:${l.rule};outline-offset:2px}
.${p}-tabs{border-bottom:${l.rule}}
.${p}-tab{padding:.5rem .9rem;border:0;border-radius:${l.radius} ${l.radius} 0 0;background:none;color:${l.muted};font:inherit;font-size:.875rem;transition:background-color ${l.quick} ease,color ${l.quick} ease}
.${p}-tab:hover{${l.hover}}
.${p}-tab[aria-selected="true"]{${l.current};font-weight:500}
.${p}-tab:focus-visible{outline:${l.rule};outline-offset:-2px}
.${p}-pager{gap:.25rem;font-size:.875rem;color:${l.text}}
.${p}-pager-item{padding:0 .4rem;border:${l.rule};border-radius:${l.radius};background:${l.surface};color:${l.text};font:inherit;font-size:.8125rem;transition:background-color ${l.quick} ease,color ${l.quick} ease}
.${p}-pager-item:hover:not(:disabled),.${p}-pager-item:focus-visible{${l.press};outline:0}
.${p}-pager-item[aria-current]{${l.current};cursor:default}
.${p}-pager-item:disabled{opacity:.4}
.${p}-steps{padding:0;gap:.75rem;font-size:.8125rem;color:${l.muted}}
.${p}-step{gap:.45rem}
.${p}-step::before{border:${l.rule};border-radius:${l.round};font-size:.75rem;color:${l.text};background:${l.surface}}
.${p}-step[aria-current]{color:${l.text};font-weight:600}
.${p}-step[aria-current]::before{${l.current}}
.${p}-step[data-done]::before{content:"✓";background:${l.wash}}
.${p}-accordion{border-top:${l.rule}}
.${p}-accordion-item{border-bottom:${l.rule}}
.${p}-accordion-item summary{gap:1rem;padding:.7rem .25rem;font-size:.9375rem;font-weight:500;color:${l.text}}
.${p}-accordion-item summary:hover{${l.hover}}
.${p}-accordion-item summary:focus-visible{outline:${l.rule};outline-offset:-1px}
.${p}-accordion-item summary::after{border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;margin-right:.4rem;transition:transform ${l.quick} ease}
.${p}-accordion-body{padding:.25rem .25rem 1rem;font-size:.875rem}
.${p}-menu-button summary{gap:.5rem;padding:.45rem .8rem;border:${l.rule};border-radius:${l.radius};background:${l.surface};color:${l.text};font-size:.875rem;font-weight:500}
.${p}-menu-button summary:hover,.${p}-menu-button summary:focus-visible,.${p}-menu-button[open] summary{${l.press};outline:0}
.${p}-menu-button summary::after{border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor}
.${p}-menu-list{padding:.25rem;border:${l.rule};border-radius:${l.radius};background:${l.surface};box-shadow:${l.elevation}}
.${p}-menu-item{padding:.4rem .6rem;border:0;border-radius:${l.radius};background:none;color:${l.text};font:inherit;font-size:.875rem}
.${p}-menu-item:hover,.${p}-menu-item:focus-visible{${l.press};outline:0}
.${p}-menu-item[data-danger]{color:${l.danger}}
.${p}-menu-item[data-danger]:is(:hover,:focus-visible){background:${l.danger};color:${l.surface}}
.${p}-icon-btn{padding:0;border:${l.rule};border-radius:${l.radius};background:${l.surface};color:${l.text};font-size:1rem;line-height:1;transition:background-color ${l.quick} ease,color ${l.quick} ease}
.${p}-icon-btn:hover:not(:disabled),.${p}-icon-btn:focus-visible{${l.press};outline:0}
.${p}-icon-btn:disabled{opacity:.45}
.${p}-radios{gap:.4rem;padding:0;border:0}
.${p}-radios legend{padding:0;margin-bottom:.35rem}
.${p}-radio{gap:.5rem;font-size:.875rem;color:${l.text}}
.${p}-radio input{appearance:none;width:1rem;height:1rem;border:${l.rule};border-radius:${l.round};background:${l.surface}}
.${p}-radio input:checked{box-shadow:inset 0 0 0 3px ${l.surface};background:${l.text}}
.${p}-radio input:focus-visible{outline:${l.rule};outline-offset:2px}
.${p}-segmented{border:${l.rule};border-radius:${l.radius};overflow:hidden}
.${p}-segment{padding:.4rem .85rem;border:0;border-right:${l.rule};background:${l.surface};color:${l.text};font:inherit;font-size:.8125rem;transition:background-color ${l.quick} ease,color ${l.quick} ease}
.${p}-segment:last-child{border-right:0}
.${p}-segment:hover{${l.hover}}
.${p}-segment[aria-pressed="true"]{${l.current}}
.${p}-segment:focus-visible{outline:${l.rule};outline-offset:-3px}
.${p}-range{gap:.75rem}
.${p}-range input{accent-color:${l.text}}
.${p}-range-value{font-size:.8125rem;color:${l.muted}}
.${p}-input[type="file"]{padding:.3rem}
.${p}-input[type="file"]::file-selector-button{margin-right:.6rem;padding:.25rem .6rem;border:${l.rule};border-radius:${l.radius};background:${l.surface};color:${l.text};font:inherit;font-size:.8125rem;cursor:pointer}
@media (prefers-reduced-motion:reduce){.${p}-spinner-mark,.${p}-skeleton-line,.${p}-progress[data-${p}-busy] .${p}-progress-bar{animation:none}.${p}-tip::after{transition:none}}
`;
};
