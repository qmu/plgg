import {
  type Variant,
  outline,
  decl,
} from "plggmatic/styleEntry";

/**
 * The standardized interaction states every plggmatic
 * component speaks — defined ONCE here and imported by
 * all, so a button, a link, and a toggle give identical
 * feedback for the same gesture (interaction-design
 * standard). A closed union; a component that invents a
 * new state must add it here, with a rule, not inline.
 */
export type InteractionState =
  | "default"
  | "hover"
  | "focus"
  | "active"
  | "disabled";

/**
 * THE recorded interaction rule of the framework, shared
 * by every focusable component: a keyboard focus ring
 * that is a real 2px outline offset from the control —
 * a NON-COLOR affordance (geometry, not just a hue), so
 * focus is legible independent of color vision
 * (accessibility-first). Scoped to `:focus-visible` so
 * it appears for keyboard/AT focus but not on mouse
 * press. The ring color is the themed `primary` role, so
 * it reschemes with the UI.
 */
export const focusRing: Variant = {
  selector: ":focus-visible",
  styles: [
    ...outline("primary-base"),
    ...decl("outline-offset", "2px"),
  ],
};

/**
 * Shared hover feedback: a slight dim. Kept as opacity
 * (not a new hover color token) so every component dims
 * consistently without expanding the palette before a
 * component needs a dedicated hover role.
 */
export const hoverDim: Variant = {
  selector: ":hover",
  styles: decl("opacity", "0.9"),
};

/** Shared press feedback: a deeper dim on `:active`. */
export const pressDim: Variant = {
  selector: ":active",
  styles: decl("opacity", "0.8"),
};
