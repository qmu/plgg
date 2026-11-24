import { boardCss } from "plgg-ir-diagram/boardCss";
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
${root}{--ink:var(--pm-text);--paper:var(--pm-surface);--graphite:var(--pm-muted);--trace:var(--pm-border);
color:var(--ink);background:var(--paper);}
${root} figure{margin:0;position:relative}
${boardCss(root)}
${root} .controls{position:absolute;top:8px;left:8px;display:flex}
${root} .controls button{font:inherit;font-size:12px;cursor:pointer;background:var(--paper);color:var(--ink);border:1px solid var(--ink);padding:3px 10px}
${root} .controls button+button{margin-left:-1px}
${root} .controls button:hover{background:var(--trace)}
${root} summary{cursor:pointer;padding:6px 0;font-size:12px;color:var(--graphite)}
${root} pre,${root} textarea{width:100%;margin:0;font:12.5px/1.65 ui-monospace,Menlo,monospace;padding:10px;border:1px solid var(--ink);background:var(--paper);color:var(--ink)}
${root} textarea{min-height:10rem;resize:vertical}
${root} .error{padding:4px 10px;background:var(--ink);color:var(--paper);font-size:12px}
${root} .plgg-flow-error p{margin:0 0 6px;padding:6px 10px;background:var(--ink);color:var(--paper)}
${root} :focus-visible{outline:2px solid var(--ink);outline-offset:2px}
${root}[data-fill] figure{height:100%;display:flex;flex-direction:column;min-height:0}
${root}[data-fill] figure .flow-board{flex:1;min-height:0}
${root}[data-fill] details{max-height:45%;overflow:auto}
${root} .flow-sheet{--dsl-width:clamp(260px,30%,380px)}
@media(max-width:1000px){${root} .flow-sheet{--dsl-width:35%}}
${root}:not([data-fill]) .flow-sheet{height:26rem}
${root} .flow-sheet{height:100%;display:flex;flex-direction:column;min-height:0}
${root} .flow-sheet small{display:block;font-size:12px;color:var(--graphite)}
${root} .hint-touch{display:none}
@media(hover:none) and (pointer:coarse){
${root} .hint-mouse{display:none}
${root} .hint-touch{display:inline}
}
${root} .stage{flex:1;position:relative;min-height:0;height:100%;min-block-size:0;overflow:hidden}
${root} .canvas-wrap,${root} .stage .flow-board{width:100%;height:100%;aspect-ratio:auto}
${root} .board-controls{position:absolute;inset:12px 12px auto;display:flex;justify-content:space-between;pointer-events:none}
${root} .board-controls button{pointer-events:auto;font:inherit;font-size:13px;padding:4px 10px;background:var(--paper);color:var(--ink);border:1px solid var(--ink);cursor:pointer}
${root} .stage:has(.dsl) .board-controls{right:calc(var(--dsl-width) + 12px)}
${root} .board-controls .add-node{border-radius:50%;width:34px;height:34px;padding:0;font-size:20px}
${root} .dsl{position:absolute;inset:0 0 0 auto;width:var(--dsl-width);display:flex;flex-direction:column;border-left:1px solid var(--ink);background:color-mix(in srgb,var(--paper) 60%,transparent)}
${root} .dsl-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--ink)}
${root} .dsl textarea{flex:1;min-height:0;border:0;padding:14px;resize:none;background:transparent;white-space:pre;overflow:auto}
${root} .dsl-help{
      width: 22px;
      height: 22px;
      padding: 0;
      border: 1px solid var(--ink);
      border-radius: 50%;
      background: var(--paper);
      font-family:inherit;font-size:12px;color:var(--ink);
    }
${root} .dsl-help:hover{
      background: var(--ink);
      color: var(--paper);
    }
${root} .help-toast{
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 20;
      display: grid;
      gap: 10px;
      width: min(520px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      overflow: auto;
      padding: 16px 18px;
      border: 1px solid var(--ink);
      background: var(--paper);
      color: var(--ink);
      text-align: left;
      font-size: 13px;
      line-height: 1.6;
    }
${root} .help-toast strong{
      font-family:inherit;font-size:14px;
    }
${root} .help-lead,${root} .help-close{
      color: var(--graphite);
    }
${root} .help-close{
      font-size: 12px;
    }
${root} .help-rows{
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 8px 16px;
      padding: 10px 0;
      border-top: 1px solid var(--ink);
      border-bottom: 1px solid var(--trace);
    }
${root} .help-rows code{
      font: 12px/1.6 ui-monospace, "SF Mono", Menlo,
        monospace;
      white-space: nowrap;
    }
`;
