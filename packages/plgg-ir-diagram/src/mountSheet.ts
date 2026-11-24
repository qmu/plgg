import {
  session,
  edit,
  apply,
  diagram,
  travelSheet,
  fileUpdate,
  type Action,
  type Session,
} from "plgg-ir-diagram/sheetSession";
import { some, none } from "plgg";
import {
  el,
  attr,
  mapHtml,
  text,
  onEvent,
  type Html,
} from "plgg-view";
import {
  custom,
  subBatch,
  sandbox,
  cmdNone,
} from "plgg-view/client";
import {
  selectedNodes,
  deleteSelected,
  type Change,
  type Flow,
} from "plgg-flow";
import {
  parseSpec,
  printSpec,
  specFlow,
} from "plgg-flow/dsl";
import {
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

let mountedSheets = 0;
export const mountSheet = (
  root: Element,
  code: string,
  dsl: boolean,
  names: readonly string[] = [],
) => {
  const sheetId = ++mountedSheets;
  const parsed = parseSpec(code);
  if (parsed.__tag === "Err") return;
  const flow = specFlow(parsed.content);
  const opened = fitDemo(
    flow.rooms ? roomsOpening(flow) : flow,
  );
  const initial: Session = {
    ...session(opened, parsed.content.rules),
    dsl: { text: code, flow: opened },
  };
  const navigate = (way: Travel) =>
    edit((s) => {
      const next = travelSheet(way)(s);
      const fitted =
        next.flow.camera === next.fittedCamera;
      const flow = resizeDemo(
        next.flow,
        s.flow.frame?.y ?? 580,
        fitted,
        s.flow.cover,
        s.flow.sheetInsets,
      );
      return {
        ...next,
        flow,
        fittedCamera: fitted
          ? flow.camera
          : next.fittedCamera,
      };
    });
  const change = (fn: Change, fit = false) =>
    edit((s) => {
      const next = apply(fn, fit)(s);
      return fit
        ? {
            ...next,
            fittedCamera: next.flow.camera,
          }
        : next;
    });
  const toggle: Action = (s) => ({
    ...s,
    help: !s.help,
  });
  const retype = (value: string, edited?: Flow) =>
    edit((s) => {
      const draft = readSheetSource(
        value,
        s.flow,
        s.rules,
        edited,
      );
      const next = apply(() => draft.flow)(s);
      return {
        ...next,
        rules: draft.rules,
        fittedCamera:
          draft.flow.camera !== s.flow.camera
            ? draft.flow.camera
            : s.fittedCamera,
        dsl: {
          text: value,
          flow: draft.flow,
          error: draft.error,
        },
      };
    });
  const controls = (m: Session) => {
    const current = m.flow;
    return el<Action>(
      "div",
      [attr("class", "board-controls")],
      [
        sheetToolbar(
          navigate,
          !!m.before.length,
          !!m.after.length,
          (fn) => change(fn, true),
          current.layered?.options.layerAxis
            ? "layer"
            : !!current.rooms,
          [
            ...names.flatMap((name) => {
              const tool = sheetTools.get(name);
              return !tool
                ? []
                : "view" in tool
                  ? [board(tool.view(current))]
                  : [
                      el(
                        "span",
                        [
                          attr(
                            "class",
                            "session-tool",
                          ),
                        ],
                        [
                          el(
                            "button",
                            [
                              attr(
                                "type",
                                "button",
                              ),
                              attr(
                                "class",
                                "tool-trigger",
                              ),
                              attr(
                                "title",
                                tool.label,
                              ),
                              attr(
                                "aria-label",
                                tool.label,
                              ),
                              attr(
                                "data-icon",
                                tool.icon,
                              ),
                              attr(
                                "popovertarget",
                                `tool-${sheetId}-${name}`,
                              ),
                            ],
                            [text(tool.label)],
                          ),
                          el(
                            "div",
                            [
                              attr(
                                "id",
                                `tool-${sheetId}-${name}`,
                              ),
                              attr(
                                "class",
                                "tool-content",
                              ),
                              attr(
                                "popover",
                                "auto",
                              ),
                            ],
                            tool.sessionView(m),
                          ),
                        ],
                      ),
                    ];
            }),
            ...(selectedNodes(current).length ||
            current.activeEdge
              ? [
                  removeButton(
                    change(deleteSelected),
                  ),
                ]
              : []),
            addButton(change(addSheetNode)),
          ],
          current,
        ),
      ],
    );
  };
  const frame = observeFrame<Action>(
    root,
    (height, cover, insets) => (m) => {
      const fitted =
        m.flow.camera === m.fittedCamera ||
        m.flow.cover !== cover ||
        JSON.stringify(m.flow.sheetInsets) !==
          JSON.stringify(insets);
      const flow = resizeDemo(
        m.flow,
        height,
        fitted,
        cover,
        insets,
      );
      return {
        ...m,
        flow,
        fittedCamera: fitted
          ? flow.camera
          : m.fittedCamera,
        ...(m.dsl?.flow === m.flow
          ? { dsl: { ...m.dsl, flow } }
          : {}),
      };
    },
  );
  const compact = window.matchMedia(
    "(max-width:759px),(orientation:landscape) and (max-height:499px)",
  );
  const board = mapHtml(
    (fn: Change): Action =>
      (m) => {
        const next = change((f) => {
          const state = fn(f);
          return state.focus !== f.focus
            ? fitDemo(state)
            : state;
        })(m);
        if (
          compact.matches &&
          (selectedNodes(next.flow).some(
            (id) =>
              !selectedNodes(m.flow).includes(id),
          ) ||
            (next.flow.activeEdge &&
              m.flow.activeEdge !==
                next.flow.activeEdge))
        ) {
          root
            .querySelector(".flow-sheet")
            ?.setAttribute("data-level", "half");
        }
        return next;
      },
  );
  const panel = createDslPanel(
    change,
    toggle,
    retype,
  );
  const interactions = custom<Action>(
    "sheet-input",
    () => {
      const stop = new AbortController();
      const options = { signal: stop.signal };
      const handle = root.querySelector(
        ".dsl-handle",
      );
      const landscape = () =>
        matchMedia(
          "(orientation:landscape) and (max-height:499px)",
        ).matches;
      const step = (direction: number) => {
        if (!compact.matches) {
          root
            .querySelector(".flow-sheet")
            ?.setAttribute(
              "data-folded",
              String(
                getComputedStyle(
                  root.querySelector(".dsl")!,
                ).width !== "28px",
              ),
            );
          return;
        }
        const levels = ["closed", "half", "full"];
        const index = levels.indexOf(
          root
            .querySelector(".flow-sheet")
            ?.getAttribute("data-level") ??
            "closed",
        );
        root
          .querySelector(".flow-sheet")
          ?.setAttribute(
            "data-level",
            levels[
              direction === 0
                ? (index + 1) % 3
                : Math.max(
                    0,
                    Math.min(
                      2,
                      index + direction,
                    ),
                  )
            ]!,
          );
      };
      let start = 0,
        dragged = false;
      if (handle instanceof HTMLElement) {
        handle.addEventListener(
          "pointerdown",
          (e) => {
            start = landscape()
              ? e.clientX
              : e.clientY;
            dragged = false;
            handle.setPointerCapture(e.pointerId);
          },
          options,
        );
        handle.addEventListener(
          "pointerup",
          (e) => {
            const delta =
              start -
              (landscape()
                ? e.clientX
                : e.clientY);
            if (Math.abs(delta) > 18) {
              dragged = true;
              step(Math.sign(delta));
            }
          },
          options,
        );
        handle.addEventListener(
          "click",
          () => {
            if (!dragged) step(0);
            dragged = false;
          },
          options,
        );
      }
      const subtitle = root
        .closest(".vp-shell")
        ?.querySelector(".vp-mobile-description");
      const subtitleObserver = new ResizeObserver(
        () => {
          if (!(subtitle instanceof HTMLElement))
            return;
          const range = document.createRange();
          range.selectNodeContents(subtitle);
          subtitle.toggleAttribute(
            "data-overflow",
            range.getBoundingClientRect().width >
              (subtitle.parentElement
                ?.clientWidth ?? 0),
          );
        },
      );
      if (subtitle?.parentElement)
        subtitleObserver.observe(
          subtitle.parentElement,
        );
      const hint = root.querySelector(
        ".flow-sheet > small",
      );
      let hintTimer = 0;
      const showHint = () => {
        if (!(hint instanceof HTMLElement))
          return;
        clearTimeout(hintTimer);
        if (!compact.matches) {
          hint.hidden = false;
          return;
        }
        let seen = false;
        try {
          seen =
            sessionStorage.getItem(
              "flow-touch-hint",
            ) === "seen";
          sessionStorage.setItem(
            "flow-touch-hint",
            "seen",
          );
        } catch {}
        hint.hidden = seen;
        hintTimer = window.setTimeout(
          () => (hint.hidden = true),
          4000,
        );
      };
      showHint();
      compact.addEventListener(
        "change",
        showHint,
        options,
      );
      return () => {
        subtitleObserver.disconnect();
        stop.abort();
        clearTimeout(hintTimer);
      };
    },
  );
  const view = (m: Session): Html<Action> =>
    el(
      "div",
      [
        attr("class", "flow-sheet"),
        onEvent<Action>("keydown", (event) => {
          if (
            !(event instanceof KeyboardEvent) ||
            event.isComposing ||
            !(event.metaKey || event.ctrlKey) ||
            !["y", "z"].includes(
              event.key.toLowerCase(),
            ) ||
            (event.target instanceof Element &&
              event.target.closest(
                "input,textarea,[contenteditable=true]",
              ))
          )
            return none();
          event.preventDefault();
          return some(
            navigate(
              event.shiftKey ||
                event.key.toLowerCase() === "y"
                ? "next"
                : "back",
            ),
          );
        }),
      ],
      [
        sheetStage(
          board(
            diagram(
              names.includes("computed"),
              m.flow,
            ),
          ),
          controls(m),
          [
            ...(dsl
              ? [
                  panel(
                    m.flow,
                    m.rules,
                    m.dsl?.flow === m.flow
                      ? m.dsl.text
                      : printSpec(
                          m.flow,
                          m.rules,
                        ),
                    m.dsl?.flow === m.flow
                      ? m.dsl.error
                      : undefined,
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
  return sandbox<Session, Action>({
    init: [initial, cmdNone()],
    view,
    update: (action, m) => fileUpdate(action(m)),
    subscriptions: (m) =>
      m.flow.roomMotion
        ? subBatch([
            frame,
            interactions,
            roomFrames<Action>(
              m.flow,
              (fn) => (model) => {
                const flow = fn(model.flow);
                return {
                  ...model,
                  flow,
                  ...(model.dsl?.flow ===
                  model.flow
                    ? {
                        dsl: {
                          ...model.dsl,
                          flow,
                        },
                      }
                    : {}),
                };
              },
            ),
          ])
        : subBatch([frame, interactions]),
  })(root);
};
