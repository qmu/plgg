import { type SoftStr } from "plgg";
import { type Theme } from "plggmatic/Style/model/theme";
import { colorVar } from "plggmatic/Style/model/token";
import { zValue } from "plggmatic/Style/model/zIndex";

/**
 * THE LOOK of the framework's interactive hooks — buttons,
 * fields, the confirm dialog, toasts — in the standard
 * screen's own hand: square, ruled in the text colour,
 * inverted where it matters.
 *
 * These hooks used to be styled by each product (the
 * reference shipped a "demo-only" sheet for them), which
 * is how two products on the same components came out
 * looking unrelated. The sheet is the framework's now.
 *
 * - A plain button is an outlined box; the primary one is
 *   filled; a destructive one is outlined in the danger
 *   colour. Hover inverts a plain button and dims a filled
 *   one. Disabled is half strength, never a new colour.
 * - A field is its label above a ruled box; focus thickens
 *   the rule (an inset shadow, so nothing moves).
 * - The dialog is a ruled sheet over a dimmed page; a toast
 *   is a ruled strip in its tone's surface.
 *
 * Escape-safe (no `<`, `>`, `&`).
 */
export const controlsCss = (
  theme: Theme,
): SoftStr => {
  const p = theme.prefix;
  const cvar = colorVar(theme);
  const text = cvar("text");
  const surface = cvar("surface");
  const fill = cvar("primary-base");
  const muted = cvar("muted");
  const danger = cvar("danger-base");
  const tones = [
    "success",
    "danger",
    "warning",
    "info",
  ] satisfies ReadonlyArray<
    "success" | "danger" | "warning" | "info"
  >;
  const toneRules = tones
    .map(
      (name): SoftStr =>
        `.${p}-toast-${name}{background:${cvar(`${name}-surface`)};color:${cvar(`${name}-text`)};border-color:${cvar(`${name}-border`)}}`,
    )
    .join("\n");
  return `
.${p}-btn,.${p}-doc button:not([class]){display:inline-flex;align-items:center;justify-content:center;gap:.4rem;min-height:2.1rem;padding:.35rem .9rem;border:1px solid ${text};border-radius:0;background:${surface};color:${text};font:inherit;font-size:.875rem;font-weight:500;line-height:1.25rem;cursor:pointer;transition:background-color .15s ease,color .15s ease,opacity .15s ease}
.${p}-btn:hover:not(:disabled),.${p}-btn:focus-visible{background:${fill};color:${surface};outline:0}
.${p}-btn-primary{background:${fill};color:${surface};border-color:${fill}}
.${p}-btn-primary:hover:not(:disabled),.${p}-btn-primary:focus-visible{opacity:.82;background:${fill};color:${surface}}
.${p}-btn-danger{border-color:${danger};color:${danger}}
.${p}-btn-danger:hover:not(:disabled),.${p}-btn-danger:focus-visible{background:${danger};color:${surface};border-color:${danger}}
.${p}-btn:disabled,.${p}-disabled{opacity:.45;cursor:not-allowed}
.${p}-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.9rem}
.${p}-form{display:flex;flex-direction:column;gap:.25rem;max-width:26rem}
.${p}-fields{margin:.5rem 0}
.${p}-field{margin:.55rem 0;display:flex;flex-direction:column;gap:.3rem}
.${p}-check{flex-direction:row;align-items:center;gap:.55rem}
.${p}-field-label{font-size:.8125rem;font-weight:600;color:${text}}
.${p}-input{padding:.45rem .6rem;border:1px solid ${text};border-radius:0;background:${surface};color:${text};font:inherit;font-size:.875rem;line-height:1.4;transition:box-shadow .12s ease}
.${p}-input:focus,.${p}-input:focus-visible{outline:0;box-shadow:inset 0 0 0 1px ${text}}
.${p}-input::placeholder{color:${muted}}
.${p}-input[aria-invalid="true"]{border-color:${danger}}
.${p}-checkbox{width:1rem;height:1rem;margin:0;accent-color:${fill}}
.${p}-field-error,.${p}-error{color:${danger};font-size:.8125rem}
.${p}-hint{color:${muted};font-size:.8125rem}
.${p}-modal{position:fixed;inset:0;z-index:${zValue("backdrop")}}
.${p}-backdrop{position:fixed;inset:0;z-index:${zValue("backdrop")};background:rgba(0,0,0,.45)}
.${p}-dialog{position:fixed;z-index:${zValue("overlay")};top:50%;left:50%;transform:translate(-50%,-50%);width:min(26rem,90vw);padding:1.25rem 1.4rem;background:${surface};color:${text};border:1px solid ${text}}
.${p}-dialog-title{margin:0 0 .5rem;font-size:1rem;font-weight:600}
.${p}-dialog-actions{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1.1rem}
.${p}-toaster{position:fixed;right:1rem;bottom:1rem;z-index:${zValue("overlay")};display:flex;flex-direction:column;gap:.5rem}
.${p}-toast{display:flex;align-items:center;gap:.9rem;padding:.55rem .6rem .55rem .9rem;border:1px solid ${text};background:${surface};color:${text};font-size:.875rem}
${toneRules}
.${p}-toast-close{flex:none;width:1.6rem;height:1.6rem;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;background:none;color:inherit;font-size:1.05rem;line-height:1;cursor:pointer}
.${p}-toast-close:hover,.${p}-toast-close:focus-visible{background:currentColor;outline:0}
@media (prefers-reduced-motion:reduce){.${p}-btn,.${p}-input{transition:none}}
`;
};
