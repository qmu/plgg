// Twin of the Typography page's code fence. `heading`
// maps a semantic level to a real `h1`–`h4`; `prose` is
// the reading container.
import { heading, prose } from "plggmatic";
import { p, text } from "plgg-view";

export const title = heading(1, "Color scheme");

export const body = prose([
  p(
    [],
    [
      text(
        "Tokens resolve through custom properties.",
      ),
    ],
  ),
]);
