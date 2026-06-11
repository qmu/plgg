import { SoftStr } from "plgg";
import { Html } from "plgg-view";
import {
  renderToString,
  collectCss,
  escapeText,
  escapeAttr,
} from "plgg-server/index";

/**
 * Options for {@link htmlDocument}, parameterized by the app's `Msg` (the root
 * is an `Html<Msg>` produced by `view(init)`; handlers are dropped on the
 * server).
 */
export type HtmlDocumentOptions<Msg> = Readonly<{
  title: SoftStr;
  root: Html<Msg>;
  /** When present, a `<script type="module">` boots client-side rendering. */
  clientEntry?: SoftStr;
}>;

/**
 * Wraps a rendered root in a full HTML document. The root's markup goes inside
 * `<div id="root">` (the mount point the client runtime targets); the root's
 * `css()` atoms are folded into a `<style>` inlined in `<head>` (critical CSS,
 * no extra request — the same tree, one extra fold); and an optional module
 * script bootstraps CSR — this is what makes SSR + CSR isomorphic: the server
 * ships markup + sheet, the client re-renders into the same node.
 */
export const htmlDocument = <Msg>(
  opts: HtmlDocumentOptions<Msg>,
): SoftStr =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeText(
    opts.title,
  )}</title>${
    collectCss(opts.root) === ""
      ? ""
      : `<style>${collectCss(opts.root)}</style>`
  }</head><body><div id="root">${renderToString(
    opts.root,
  )}</div>${
    opts.clientEntry
      ? `<script type="module" src="${escapeAttr(
          opts.clientEntry,
        )}"></script>`
      : ""
  }</body></html>`;
