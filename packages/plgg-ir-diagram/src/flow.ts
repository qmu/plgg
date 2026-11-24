import { sheetCss } from "plgg-ir-diagram/sheetCss";
import { ok, type Result } from "plgg";
import {
  fitFlow,
  flowView,
  viewAt,
  type Flow,
} from "plgg-flow";
import {
  parseSpec,
  specFlow,
} from "plgg-flow/dsl";
import {
  el,
  attr,
  text,
  raw,
  renderToString,
  type Html,
} from "plgg-view";

/** The flow a fenced `plgg-flow` block draws, fitted to its frame. */
export const sourceFlow = (
  source: string,
): Result<Flow, string> => {
  const r = parseSpec(source);
  return r.__tag === "Ok"
    ? ok(fitFlow(specFlow(r.content)))
    : r;
};

/** Only the escaped plgg-view SSR result enters raw(). */
const board = (flow: Flow) =>
  raw(renderToString(flowView(flow)));

/**
 * The static form of a `plgg-flow` block: a drawn board that
 * reads without script, the source under it. The browser
 * runtime replaces it with the interactive board.
 */
export const flowWidget = (
  source: string,
): Html<never> => {
  const r = sourceFlow(source);
  const listing = el<never>(
    "details",
    [],
    [
      el("summary", [], [text("ソース")]),
      el(
        "pre",
        [],
        [el("code", [], [text(source)])],
      ),
    ],
  );
  return r.__tag === "Err"
    ? el(
        "figure",
        [attr("class", "plgg-flow-error")],
        [el("p", [], [text(r.content)]), listing],
      )
    : el(
        "figure",
        [attr("class", "plgg-flow")],
        [board(r.content), listing],
      );
};

/** The 3D angle the "立体" control turns to. */
export const tilted = (flow: Flow) =>
  fitFlow(viewAt(-0.48, 0.42)(flow));

const root = '[data-island="plgg-flow"]';
export const flowCss = `
${root}{--ink:var(--pm-text);--paper:var(--pm-surface);--graphite:var(--pm-muted);--trace:var(--pm-border);--wash:var(--pm-surface-2);--pencil:color-mix(in srgb,var(--paper) 66%,var(--ink));--display:system-ui,sans-serif;--body:system-ui,sans-serif;
color:var(--ink);background:var(--paper);}
${root} figure{margin:0;position:relative}
${root} figure .flow-board{height:auto;aspect-ratio:900/580}
${root} .controls{position:absolute;top:8px;left:8px;display:flex}
${root} .controls button{font:inherit;font-size:12px;cursor:pointer;background:var(--paper);color:var(--ink);border:1px solid var(--ink);padding:3px 10px}
${root} .controls button+button{margin-left:-1px}
${root} .controls button:hover{background:var(--trace)}
${root} summary{cursor:pointer;padding:6px 0;font-size:12px;color:var(--graphite)}
${root} pre,${root} figure textarea{width:100%;margin:0;font:12.5px/1.65 ui-monospace,Menlo,monospace;padding:10px;border:1px solid var(--ink);background:var(--paper);color:var(--ink)}
${root} figure textarea{min-height:10rem;resize:vertical}
${root} .error{padding:4px 10px;background:var(--ink);color:var(--paper);font-size:12px}
${root} .plgg-flow-error p{margin:0 0 6px;padding:6px 10px;background:var(--ink);color:var(--paper)}
${root} :focus-visible{outline:2px solid var(--ink);outline-offset:2px}
${root}[data-fill] figure{height:100%;display:flex;flex-direction:column;min-height:0}
${root}[data-fill] figure .flow-board{flex:1;min-height:0}
${root}[data-fill] details{max-height:45%;overflow:auto}
${root}:not([data-fill]) .flow-sheet{height:26rem}
${root} .flow-sheet{height:100%;display:flex;flex-direction:column;min-height:0;padding-bottom:8px}
${sheetCss}
`;
