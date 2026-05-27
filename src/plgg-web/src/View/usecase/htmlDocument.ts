import { SoftStr } from "plgg";
import { VNode } from "plgg-view";
import {
  renderToString,
  escapeText,
  escapeAttr,
} from "plgg-web/index";

/**
 * Options for {@link htmlDocument}.
 */
export type HtmlDocumentOptions = Readonly<{
  title: SoftStr;
  root: VNode;
  /** When present, a `<script type="module">` boots client-side rendering. */
  clientEntry?: SoftStr;
}>;

/**
 * Wraps a rendered root in a full HTML document. The root's markup goes inside
 * `<div id="root">` (the mount point the client renderer targets), and an
 * optional module script bootstraps CSR — this is what makes SSR + CSR
 * isomorphic: the server ships markup, the client re-renders into the same node.
 */
export const htmlDocument = (
  opts: HtmlDocumentOptions,
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
