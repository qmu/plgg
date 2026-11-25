import { type SoftStr } from "plgg";
import { type Theme } from "plggmatic/Style/model/theme";
import { colorVar } from "plggmatic/Style/model/token";
import { zValue } from "plggmatic/Style/model/zIndex";

/**
 * The carousel controls' chrome: two square buttons at the
 * shared strip's vertical middle, the previous one just
 * right of whatever is pinned over the strip
 * (`--<p>-share-inset`), the next one at the right edge.
 * Monochrome like the rest of the chrome: surface fill, a
 * text hairline, inverted on hover and keyboard focus. The
 * chevron is two borders, so it takes the button's ink.
 *
 * Their host must be a positioned ancestor of the strip
 * (the runtime appends them to the strip's parent).
 * Escape-safe (no `<`, `>`, `&`).
 */
export const carouselCss = (
  theme: Theme,
): SoftStr => {
  const p = theme.prefix;
  const cvar = colorVar(theme);
  const both = `.${p}-carousel-prev,.${p}-carousel-next`;
  const each = (state: SoftStr): SoftStr =>
    `.${p}-carousel-prev${state},.${p}-carousel-next${state}`;
  return (
    `${both}{position:absolute;top:50%;z-index:${zValue("chrome")};width:2.25rem;height:2.25rem;margin-top:-1.125rem;padding:0;display:flex;align-items:center;justify-content:center;border:1px solid ${cvar("text")};background:${cvar("surface")};color:${cvar("text")};cursor:pointer;transition:background-color .15s ease,color .15s ease,opacity .2s ease;}` +
    `${each("[hidden]")}{display:none;}` +
    `.${p}-carousel-prev{left:calc(var(--${p}-share-inset,0px) + .6rem);}` +
    `.${p}-carousel-next{right:.6rem;}` +
    `${each("::before")}{content:"";width:.5rem;height:.5rem;border-top:1.5px solid currentColor;border-right:1.5px solid currentColor;}` +
    `.${p}-carousel-prev::before{transform:translateX(.12rem) rotate(-135deg);}` +
    `.${p}-carousel-next::before{transform:translateX(-.12rem) rotate(45deg);}` +
    `${each(":hover")},${each(":focus-visible")}{background:${cvar("text")};color:${cvar("surface")};outline:0;}` +
    `@media (prefers-reduced-motion:reduce){${both}{transition:none;}}`
  );
};
