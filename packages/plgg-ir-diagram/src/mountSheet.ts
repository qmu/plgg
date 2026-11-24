import { isSome, some, none } from "plgg";
import {
  el,
  attr,
  mapHtml,
  onEvent,
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
  history,
  record,
  travel,
  sheetEdited,
  type History,
  type Travel,
  roomFrames,
  sheetHint,
  addButton,
  removeButton,
  addSheetNode,
  sheetToolbar,
  sheetTools,
  sheetHelp,
  createDslPanel,
  sheetStage,
  observeFrame,
  fitDemo,
  resizeDemo,
  roomsOpening,
  readSheetSource,
} from "plgg-ir-diagram/flowSheet";

type Revision = Readonly<{
  flow: Flow;
  rules: readonly Rule[];
  source: string;
  fitted: boolean;
  error: string;
}>;
type Model = Revision &
  Readonly<{
    help: boolean;
    history: History<Revision>;
    start?: Revision | undefined;
  }>;
const revision = ({
  flow,
  rules,
  source,
  fitted,
  error,
}: Revision): Revision => ({
  flow,
  rules,
  source,
  fitted,
  error,
});
const remember = (
  m: Model,
  next: Model,
  force = false,
): Model => {
  const previous = m.start ?? revision(m);
  if (isSome(next.flow.drag))
    return { ...next, start: previous };
  return {
    ...next,
    start: undefined,
    history:
      force ||
      sheetEdited(previous.flow, next.flow) ||
      previous.rules !== next.rules
        ? record(m.history, previous)
        : m.history,
  };
};
type Action = (model: Model) => Model;
const change =
  (fn: Change, fitted = false): Action =>
  (m) => {
    const flow = fn(m.flow);
    return flow === m.flow
      ? m
      : remember(
          m,
          {
            ...m,
            flow,
            source:
              (flow.suggestions &&
                flow.declaredAxes ===
                  m.flow.declaredAxes &&
                flow.suggestions !==
                  m.flow.suggestions) ||
              (flow.rooms &&
                flow.nodes === m.flow.nodes &&
                flow.edges === m.flow.edges)
                ? m.source
                : printSpec(flow, m.rules),
            error: "",
            fitted:
              fitted ||
              (m.fitted &&
                flow.camera === m.flow.camera),
          },
          fitted,
        );
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
    return remember(m, {
      ...m,
      ...draft,
      source,
      fitted:
        m.fitted ||
        draft.flow.camera !== m.flow.camera,
    });
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
  const opening: Revision = {
    flow: fitDemo(
      flow.rooms ? roomsOpening(flow) : flow,
    ),
    rules: parsed.content.rules,
    source: code,
    error: "",
    fitted: true,
  };
  const initial: Model = {
    ...opening,
    help: false,
    history: history(opening),
  };
  const navigate =
    (way: Travel): Action =>
    (m) => {
      const next = travel(
        m.history,
        revision(m),
        way,
      );
      const restored = next.current;
      return {
        ...m,
        ...restored,
        flow: resizeDemo(
          restored.flow,
          m.flow.frame?.y ?? 580,
          restored.fitted,
          m.flow.cover ?? 0,
        ),
        history: next.history,
        start: undefined,
      };
    };
  const controls = (m: Model) => {
    const current = m.flow;
    return el<Action>(
      "div",
      [attr("class", "board-controls")],
      [
        sheetToolbar(
          navigate,
          !!m.history.before.length,
          !!m.history.after.length,
          (fn) => change(fn, true),
          current.layered?.options.layerAxis
            ? "layer"
            : !!current.rooms,
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
  };
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
  const panel = createDslPanel(
    change,
    toggle,
    retype,
  );
  const view = (m: Model): Html<Action> =>
    el(
      "div",
      [
        attr("class", "flow-sheet"),
        onEvent<Action>("keydown", (event) => {
          if (
            !(event instanceof KeyboardEvent) ||
            event.isComposing ||
            !(event.metaKey || event.ctrlKey) ||
            event.key.toLowerCase() !== "z" ||
            (event.target instanceof Element &&
              event.target.closest(
                "input,textarea,[contenteditable=true]",
              ))
          )
            return none();
          event.preventDefault();
          return some(
            navigate(
              event.shiftKey ? "next" : "back",
            ),
          );
        }),
      ],
      [
        sheetStage(
          board(flowView(m.flow)),
          controls(m),
          [
            ...(dsl
              ? [
                  panel(
                    m.flow,
                    m.rules,
                    m.source,
                    m.error,
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
