import {
  el,
  attr,
  mapHtml,
  type Html,
} from "plgg-view";
import {
  subBatch,
  sandbox,
  cmdNone,
} from "plgg-view/client";
import {
  flowView,
  selectedNodes,
  deleteSelected,
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
  roomFrames,
  sheetHint,
  addButton,
  removeButton,
  addSheetNode,
  sheetToolbar,
  sheetTools,
  sheetHelp,
  sheetDsl,
  sheetStage,
  observeFrame,
  fitDemo,
  resizeDemo,
  roomsOpening,
  readSheetSource,
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
          source:
            flow.rooms &&
            flow.nodes === m.flow.nodes &&
            flow.edges === m.flow.edges
              ? m.source
              : printSpec(flow, m.rules),
          error: "",
          fitted:
            fitted ||
            (m.fitted &&
              flow.camera === m.flow.camera),
        };
  };
const retype =
  (source: string, edited?: Flow): Action =>
  (m) => {
    const draft = readSheetSource(
      source,
      m.flow,
      m.rules,
      edited,
    );
    return {
      ...m,
      ...draft,
      source,
      fitted:
        m.fitted ||
        draft.flow.camera !== m.flow.camera,
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
  names: readonly string[] = [],
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
  const controls = (current: Flow) =>
    el<Action>(
      "div",
      [attr("class", "board-controls")],
      [
        sheetToolbar(
          reset,
          (fn) => change(fn, true),
          !!current.rooms,
          names.flatMap((name) => {
            const tool = sheetTools.get(name);
            return tool
              ? [board(tool.view(current))]
              : [];
          }),
        ),
        ...(selectedNodes(current).length ||
        current.activeEdge
          ? [removeButton(change(deleteSelected))]
          : []),
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
          controls(m.flow),
          [
            ...(dsl
              ? [
                  sheetDsl(
                    m.flow,
                    m.rules,
                    change,
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
    subscriptions: (m) =>
      m.flow.roomMotion
        ? subBatch([
            frame,
            roomFrames<Action>(
              m.flow,
              (fn) => (model) => ({
                ...model,
                flow: fn(model.flow),
              }),
            ),
          ])
        : frame,
  })(root);
};
