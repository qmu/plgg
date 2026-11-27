import { type SoftStr } from "plgg";
import { type Theme } from "plggpress/themeSupport/styleEntry";
import {
  type Appearance,
  monochrome,
  siteCss,
} from "plggmatic";

/**
 * plggpress carries NO stylesheet of its own. The frame a
 * site of documents stands in is the kit's
 * ({@link siteCss}); this is the name plggpress composes
 * it under, after the kit's own sheets.
 */
export const baseCss = (
  theme: Theme,
  a: Appearance = monochrome,
): SoftStr => siteCss(theme, a);
