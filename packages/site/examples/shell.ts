// Twin of the Pane alignment page's code fence: the
// compositional layout — builders + atoms, no config.
import {
  row,
  column,
  navPane,
  mainPane,
} from "plggmatic";
import { basis, fluid, p } from "plggmatic/style";
import {
  renderToString,
  collectCss,
  text,
} from "plgg-view";

const screen = row(
  [],
  [
    column(
      [basis("220px")],
      [navPane([p(2)], [text("nav")])],
    ),
    column(
      [fluid],
      [mainPane([p(4)], [text("reading")])],
    ),
  ],
);

export const html = renderToString(screen);
export const css = collectCss(screen);
