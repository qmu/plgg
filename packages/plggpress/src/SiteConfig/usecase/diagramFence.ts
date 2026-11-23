import { readFileSync } from "node:fs";
import {
  diagramWidget,
  diagramCss,
} from "plgg-ir-diagram/widget";
import {
  flowWidget,
  flowCss,
} from "plgg-ir-diagram/flow";
import {
  el,
  attr,
  renderToString,
  type Html,
} from "plgg-view";

const runtimes = new Map<string, string>();
/** The browser bundle, escaped so it can sit inside an inline script. */
const runtime = (specifier: string) => {
  const known = runtimes.get(specifier);
  if (known !== undefined) return known;
  const code = readFileSync(
    new URL(import.meta.resolve(specifier)),
    "utf8",
  ).replace(/<\/script/gi, "<\\/script");
  runtimes.set(specifier, code);
  return code;
};

/**
 * A self-contained frame: the static fallback reads without
 * script, and the inlined runtime makes it interactive. It
 * also works in exported HTML and client-inserted columns.
 */
const frame = (
  o: Readonly<{
    title: string;
    css: string;
    root: string;
    fallback: Html<never>;
    specifier: string;
    style: string;
  }>,
): Html<never> =>
  el(
    "iframe",
    [
      attr("title", o.title),
      attr("sandbox", "allow-scripts"),
      attr("loading", "lazy"),
      attr("style", o.style),
      attr(
        "srcdoc",
        '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
          o.css +
          "</style><body><main " +
          o.root +
          ">" +
          renderToString(o.fallback) +
          '</main><script type="module">' +
          runtime(o.specifier) +
          "</script></body></html>",
      ),
    ],
    [],
  );

export const diagramFence = (
  code: string,
): Html<never> =>
  frame({
    title: "ダイアグラム",
    css: diagramCss,
    root: "data-diagram-root",
    fallback: diagramWidget(code),
    specifier: "plgg-ir-diagram/interactive",
    style: "width:100%;height:26rem;border:0",
  });

/** A `plgg-flow` block: the flow DSL drawn as a board. */
export const flowFence = (
  code: string,
): Html<never> =>
  frame({
    title: "フロー図",
    css: flowCss,
    root: "data-flow-root",
    fallback: flowWidget(code),
    specifier: "plgg-ir-diagram/flow-interactive",
    style:
      "display:block;width:100%;aspect-ratio:900/636;border:0",
  });
