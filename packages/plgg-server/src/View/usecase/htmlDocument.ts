import { SoftStr } from "plgg";
import { Html } from "plgg-view/html";
import {
  renderToString,
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
 * `<div id="root">` (the mount point the client runtime targets), and an
 * optional module script bootstraps CSR — this is what makes SSR + CSR
 * isomorphic: the server ships markup, the client re-renders into the same node.
 */
export const htmlDocument = <Msg>(
  opts: HtmlDocumentOptions<Msg>,
): SoftStr =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${escapeText(
    opts.title,
  )}</title></head><body><div id="root">${renderToString(
    opts.root,
  )}</div>${
    opts.clientEntry
      ? `<script type="module" src="${escapeAttr(
          opts.clientEntry,
        )}"></script>`
      : ""
  }</body></html>`;
