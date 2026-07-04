// Twin of the Color scheme page's code fence. Themed
// color atoms resolve through `var(--pm-*)` custom
// properties, so one `dark` class on `<html>` reschemes
// the whole tree; `schemeCss` is the custom-property
// block that defines them.
import {
  bg,
  textColor,
  border,
  p,
  rounded,
  style_,
  schemeCss,
} from "plggmatic/style";
import { div, text } from "plgg-view";

export const card = div(
  [
    style_(
      bg("surface"),
      textColor("text"),
      border,
      p(4),
      rounded("md"),
    ),
  ],
  [text("A themed surface")],
);

// `:root{--pm-surface:…}html.dark{--pm-surface:…}` —
// inject once into the document <style>.
export const baseColorCss = schemeCss;
