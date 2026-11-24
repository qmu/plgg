import {
  el,
  attr,
  mapHtml,
  type Html,
} from "plgg-view";
import {
  sandbox,
  cmdNone,
} from "plgg-view/client";
import {
  flowView,
  type Change,
  type Flow,
} from "plgg-flow";
import {
  parseSpec,
  printSpec,
  specFlow,
  type Rule,
} from "plgg-flow/dsl";
import {
  sheetHint,
  addButton,
  addSheetNode,
  sheetToolbar,
  sheetHelp,
  sheetDsl,
  sheetStage,
  observeFrame,
  fitDemo,
  resizeDemo,
  roomsOpening,
  applyDemoSpec,
} from "plgg-ir-diagram/flowSheet";

type Model = Readonly<{
  flow: Flow;
  rules: readonly Rule[];
  source: string;
  help: boolean;
  fitted: boolean;
  error: string;
}>;
type Action = (model: Model) => Model;
const change =
  (fn: Change, fitted = false): Action =>
  (m) => {
    const flow = fn(m.flow);
    return flow === m.flow
      ? m
      : {
          ...m,
          flow,
          source: printSpec(flow, m.rules),
          error: "",
          fitted:
            fitted ||
            (m.fitted &&
              flow.camera === m.flow.camera),
        };
  };
const retype =
  (source: string): Action =>
  (m) => {
    const result = parseSpec(source);
    if (result.__tag === "Err")
      return {
        ...m,
        source,
        error: result.content,
      };
    const flow = applyDemoSpec(result.content)(
      m.flow,
    );
    return {
      ...m,
      flow,
      source,
      rules: result.content.rules,
      error: "",
      fitted:
        m.fitted || flow.camera !== m.flow.camera,
    };
  };
const toggle: Action = (m) => ({
  ...m,
  help: !m.help,
});
export const mountSheet = (
  root: Element,
  code: string,
  dsl: boolean,
) => {
  const parsed = parseSpec(code);
  if (parsed.__tag === "Err") return;
  const flow = specFlow(parsed.content);
  const initial: Model = {
    flow: fitDemo(
      flow.rooms ? roomsOpening(flow) : flow,
    ),
    rules: parsed.content.rules,
    source: code,
    error: "",
    help: false,
    fitted: true,
  };
  const reset: Action = (m) => ({
    ...initial,
    flow: resizeDemo(
      initial.flow,
      m.flow.frame?.y ?? 580,
      true,
      m.flow.cover ?? 0,
    ),
  });
  const controls = el<Action>(
    "div",
    [attr("class", "board-controls")],
    [
      sheetToolbar(
        reset,
        (fn) => change(fn, true),
        !!flow.rooms,
      ),
      addButton(change(addSheetNode)),
    ],
  );
  const frame = observeFrame<Action>(
    root,
    (height, cover) => (m) => ({
      ...m,
      flow: resizeDemo(
        m.flow,
        height,
        m.fitted,
        cover,
      ),
    }),
  );
  const board = mapHtml((fn: Change) =>
    change(fn),
  );
  const view = (m: Model): Html<Action> =>
    el(
      "div",
      [attr("class", "flow-sheet")],
      [
        sheetStage(
          board(flowView(m.flow)),
          controls,
          [
            ...(dsl
              ? [
                  sheetDsl(
                    m.source,
                    m.error,
                    toggle,
                    retype,
                  ),
                ]
              : []),
            ...(m.help
              ? [sheetHelp(toggle)]
              : []),
          ],
        ),
        sheetHint,
      ],
    );
  root.replaceChildren();
  return sandbox<Model, Action>({
    init: [initial, cmdNone()],
    view,
    update: (action, m) => [action(m), cmdNone()],
    subscriptions: () => frame,
  })(root);
};
