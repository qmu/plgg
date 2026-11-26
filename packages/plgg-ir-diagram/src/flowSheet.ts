import { observeToolbar } from "plgg-ir-diagram/toolbarOverflow";
import type { Travel } from "plgg-ir-diagram/sheetHistory";
export * from "plgg-ir-diagram/sheetHistory";
import {
  sheetProperties,
  propertyCache,
} from "plgg-ir-diagram/sheetProperties";
export {
  sheetTools,
  sheetToolNames,
  type SheetTool,
} from "plgg-ir-diagram/sheetTools";
import {
  rowCache,
  dslRows,
  revealSelection,
} from "plgg-ir-diagram/dslRows";
export { sheetCss } from "plgg-ir-diagram/sheetCss";
import { project } from "plgg-board";
import { btnClass } from "plggmatic/hooks";
import {
  addNode,
  selectedNodes,
  viewAt,
  roomViews,
  roomFitMargin,
  roomBlocks,
  focusGeometry,
  movingRooms,
  roomFaceView,
  turnRooms,
  spaceScenery,
  cardBounds,
  placedLabels,
  nodeSize,
  bodyDepth,
  bridgePoints,
  frameOf,
  viewport,
  type Flow,
  type Change,
} from "plgg-flow";
import { wireGraph } from "plgg-flow/wiring";
import { chartExtent } from "plgg-flow/chart";
import {
  applySpec,
  axesFromView,
  writeCurrentView,
  searchSheetViews,
  parseSpec,
  printSpec,
  type Spec,
  type Rule,
} from "plgg-flow/dsl";
import { arrangeHierarchy } from "plgg-flow/layout";
import {
  planLayers,
  planRooms,
} from "plgg-flow/autoLayout";
import {
  lazy,
  el,
  attr,
  text,
  onClick,
  on,
  onInput,
  type Html,
} from "plgg-view";
import { custom } from "plgg-view/client";
// Initial and reset sessions both open on the front of the board.
export const fitDemo = (
  state: Flow,
  roomMargin = 80,
): Flow => {
  const flow = focusGeometry(state);
  if (
    !flow.nodes.length &&
    !flow.rooms?.rooms.length
  )
    return state;
  const camera = {
    ...flow.camera,
    origin: { x: 0, y: 0 },
    scale: 1,
  };
  const at = project(camera);
  const face =
    flow.rooms &&
    camera.yaw === 0 &&
    camera.pitch === 0;
  const bounds = [
    ...(flow.rooms?.rooms.flatMap((r) =>
      face
        ? [
            at({ ...r.min, z: 0 }),
            at({ ...r.max, z: 0 }),
          ]
        : [r.min.x, r.max.x].flatMap((x) =>
            [r.min.y, r.max.y].flatMap((y) =>
              [r.min.z, r.max.z].map((z) =>
                at({ x, y, z }),
              ),
            ),
          ),
    ) ?? []),
    ...flow.nodes
      .filter((n) => !flow.rooms || n.within)
      .flatMap((n) => {
        const { width, height } = nodeSize(n);
        return [-1, 1].flatMap((x) =>
          [-1, 1].flatMap((y) =>
            [-1, 1].map((z) =>
              at({
                x: n.position.x + (x * width) / 2,
                y:
                  n.position.y + (y * height) / 2,
                z:
                  n.position.z + z * bodyDepth(n),
              }),
            ),
          ),
        );
      }),
    ...(flow.chart
      ? chartExtent(flow.chart, flow).map(at)
      : []),
    ...(flow.rooms
      ? []
      : wireGraph(flow)
    ).flatMap((w) =>
      bridgePoints(
        w.points,
        w.lift,
        flow.camera.pitch === 0 &&
          flow.camera.yaw === 0,
      ).map(at),
    ),
  ].reduce(
    (box, p) => ({
      left: Math.min(box.left, p.x),
      right: Math.max(box.right, p.x),
      top: Math.min(box.top, p.y),
      bottom: Math.max(box.bottom, p.y),
    }),
    {
      left: Infinity,
      right: -Infinity,
      top: Infinity,
      bottom: -Infinity,
    },
  );
  const frame = frameOf(flow),
    inset = flow.sheetInsets ?? clearInsets,
    open =
      frame.x - (flow.cover ?? 0) - inset.left,
    height = frame.y - inset.top - inset.bottom,
    phoneWidth = flow.sheetInsets?.phoneWidth,
    phoneFlat = phoneWidth && !flow.rooms,
    margin = phoneFlat
      ? (48 * frame.x) / phoneWidth
      : flow.rooms
        ? roomMargin
        : 96;
  const measure = (
    scale: number,
    placed = false,
  ) => {
    let left = bounds.left * scale,
      right = bounds.right * scale,
      top = bounds.top * scale,
      bottom = bounds.bottom * scale;
    if (flow.rooms) {
      const fitted = { ...camera, scale };
      const visible = roomFaceView({
        ...flow,
        camera: fitted,
      });
      const boxes = cardBounds(
        fitted,
        visible.nodes,
      );
      const at = project(fitted);
      const scenery = [
        ...spaceScenery(flow.rooms, visible),
        ...(visible.scenery ?? []),
      ];
      for (const label of scenery) {
        if (label.kind !== "label") continue;
        const anchor = at(label.anchor);
        const x = anchor.x + label.offset.x,
          y = anchor.y + label.offset.y;
        const half =
          (Array.from(label.text).length *
            label.size) /
            2 +
          3;
        boxes.push({
          left: x - half,
          right: x + half,
          top: y - label.size,
          bottom: y + label.size,
        });
      }
      for (const box of boxes) {
        left = Math.min(left, box.left);
        right = Math.max(right, box.right);
        top = Math.min(top, box.top);
        bottom = Math.max(bottom, box.bottom);
      }
      if (placed) {
        left -= margin / 2;
        right += margin / 2;
        top -= margin / 2;
        bottom += margin / 2;
        for (const { box } of placedLabels({
          ...visible,
          scenery,
        })) {
          left = Math.min(left, box.left);
          right = Math.max(right, box.right);
          top = Math.min(top, box.top);
          bottom = Math.max(bottom, box.bottom);
        }
      }
    }
    return {
      width: right - left,
      height: bottom - top,
      origin: {
        x: inset.left + (open - left - right) / 2,
        y:
          inset.top + (height - top - bottom) / 2,
      },
    };
  };
  let upper = phoneFlat
      ? 1.5
      : flow.rooms
        ? 1.6
        : 1,
    lower = 0;
  let scale = upper;
  for (let i = 0; i < 18; i++) {
    const box = measure(scale);
    if (
      box.width <= open - margin &&
      box.height <= height - margin
    ) {
      lower = scale;
      if (scale === upper) break;
    } else upper = scale;
    scale = (lower + upper) / 2;
  }
  scale = lower || scale;
  let box = measure(scale, true);
  // Screen-sized tags can move when their neighbours change scale.
  for (let i = 0; flow.rooms && i < 18; i++) {
    const factor = Math.min(
      open / box.width,
      height / box.height,
    );
    if (factor >= 1) break;
    scale *= factor * 0.98;
    box = measure(scale, true);
  }
  const { origin } = box;
  return {
    ...state,
    camera: {
      ...flow.camera,
      scale,
      origin,
    },
  };
};
const clearInsets: NonNullable<
  Flow["sheetInsets"]
> = {
  left: 0,
  top: 0,
  bottom: 0,
};
export const resizeDemo = (
  flow: Flow,
  height: number,
  fitted: boolean,
  cover = 0,
  sheetInsets = clearInsets,
): Flow => {
  const previous = frameOf(flow);
  if (
    flow.frame &&
    previous.y === height &&
    previous.x === viewport.x &&
    flow.sheetInsets?.phoneWidth ===
      sheetInsets.phoneWidth &&
    (flow.cover ?? 0) === cover &&
    (flow.sheetInsets?.top ?? 0) ===
      sheetInsets.top &&
    (flow.sheetInsets?.left ?? 0) ===
      sheetInsets.left &&
    (flow.sheetInsets?.bottom ?? 0) ===
      sheetInsets.bottom
  )
    return flow;
  const frame = { x: viewport.x, y: height };
  const next = {
    ...flow,
    frame,
    cover,
    sheetInsets,
  };
  if (
    fitted &&
    !flow.frame &&
    flow.suggestions &&
    !flow.writtenCamera
  ) {
    const opening = rankSheetView(next, true);
    return flow.roomMotion?.opening
      ? roomsOpening(opening)
      : opening;
  }
  if (fitted) return fitDemo(next);
  return {
    ...next,
    camera: {
      ...flow.camera,
      origin: {
        x:
          flow.camera.origin.x +
          (frame.x - previous.x) / 2,
        y:
          flow.camera.origin.y +
          (frame.y - previous.y) / 2,
      },
    },
  };
};
const layoutKey = (flow: Flow) =>
  JSON.stringify([
    flow.nodes.map((n) => [
      n.id,
      n.position,
      nodeSize(n),
    ]),
    flow.edges.map((e) => [
      e.source,
      e.target,
      e.route,
      e.via,
      e.lift,
    ]),
  ]);
// A property edit also carries graph data outside the DSL, including the
// updated selection. Fit against the sheet from before the edit.
export const applyDemoSpec =
  (spec: Spec, edited?: Flow) => (flow: Flow) => {
    const parsed = applySpec(
      edited
        ? {
            ...spec,
            graph: {
              nodes: edited.nodes,
              edges: edited.edges,
            },
          }
        : spec,
    )(edited ?? flow);
    const previous =
      flow.focus &&
      flow.rooms &&
      roomBlocks(flow.rooms).find((b) =>
        [...b.ids].some((id) =>
          flow.focus?.has(id),
        ),
      );
    const blocks =
      parsed.rooms && roomBlocks(parsed.rooms);
    const next = previous
      ? {
          ...parsed,
          focus:
            blocks && blocks.length > 1
              ? (
                  blocks.find(
                    (b) =>
                      b.name === previous.name,
                  ) ?? blocks[0]
                )?.ids
              : undefined,
        }
      : parsed;
    return layoutKey(next) === layoutKey(flow)
      ? next
      : flow.rooms && next.rooms
        ? turnRooms(flow, fitDemo(next), 300)
        : fitDemo(next);
  };
export const readSheetSource = (
  source: string,
  flow: Flow,
  rules: readonly Rule[],
  edited?: Flow,
) => {
  const parsed = parseSpec(source);
  return parsed.__tag === "Err"
    ? { flow, rules, error: parsed.content }
    : {
        flow: applyDemoSpec(
          parsed.content,
          edited,
        )(flow),
        rules: parsed.content.rules,
        error: "",
      };
};
export const roomFrames = <Action>(
  flow: Flow,
  change: (fn: Change) => Action,
) => {
  const motion = flow.roomMotion;
  return custom<Action>(
    "room-motion-" +
      JSON.stringify([
        motion?.to.camera,
        motion?.to.nodes.map((n) => n.position),
      ]),
    (dispatch) => {
      if (!motion) return () => {};
      let frame = 0;
      const start = performance.now();
      const tick = (now: number) => {
        const t = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches
          ? 1
          : Math.min(
              1,
              (now - start) / motion.duration,
            );
        dispatch(
          change((f) =>
            f.roomMotion?.to !== motion.to
              ? f
              : {
                  ...f,
                  roomMotion:
                    t === 1
                      ? undefined
                      : {
                          ...motion,
                          progress: motion.opening
                            ? 1 - (1 - t) ** 3
                            : t * t * (3 - 2 * t),
                        },
                },
          ),
        );
        if (t < 1)
          frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    },
  );
};
const layerViews = [
  roomViews[0]!,
  // from above, but no steeper than leaves each board
  // mostly clear of the one over it
  ["上", -0.22, -0.9],
  ["立体", -Math.PI / 6, -0.55],
] satisfies [string, number, number][];
const firstBlock = (flow: Flow): Flow => {
  const blocks =
    flow.rooms && roomBlocks(flow.rooms);
  return {
    ...flow,
    focus:
      blocks && blocks.length > 1
        ? blocks[0]!.ids
        : undefined,
  };
};
export const roomsOpening: Change = (flow) => {
  // Before the frame is known the first block stands in; once
  // it is, the view search has said which blocks to open on.
  if (!flow.frame) flow = firstBlock(flow);
  const to = flow.suggestions
    ? flow
    : viewAt(-Math.PI / 6, -0.55)(flow);
  if (
    typeof window === "undefined" ||
    window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches !== false
  )
    return to;
  return {
    ...to,
    roomMotion: {
      opening: true,
      from: to,
      to,
      progress: 0,
      duration: 500,
    },
  };
};
const arrangeSheet: Change = (f) => {
  if (f.rooms) {
    const { axes, rooms, graph } = planRooms(
      f,
      f.rooms.axes,
    );
    return {
      ...f,
      ...graph,
      rooms: { axes, rooms },
    };
  }
  // a sheet with groups keeps each group whole: the
  // groups and loose nodes are arranged as units
  if (
    !f.layered?.options.layerAxis &&
    f.nodes.some((n) => n.group)
  )
    return {
      ...f,
      ...arrangeHierarchy(f),
    };
  const frame = frameOf(f),
    wide =
      frame.x -
        (f.cover ?? 0) -
        (f.sheetInsets?.left ?? 0) >=
      frame.y -
        (f.sheetInsets?.top ?? 0) -
        (f.sheetInsets?.bottom ?? 0);
  // heights the author gave are theirs: depth is only
  // recomputed where the sheet asked for it
  const options = f.layered?.options ?? {
    direction: wide ? "right" : "down",
  };
  // routes drawn for the old places no longer apply
  const plain = f.edges.map((e) => {
    const {
      path,
      waypoints,
      via,
      lift,
      ...rest
    } = e;
    return rest;
  });
  const plan = planLayers(
    { nodes: f.nodes, edges: plain },
    options,
  );
  const placed = new Map(
    plan.graph.nodes.map((n) => [
      n.id,
      n.position,
    ]),
  );
  const laid: Flow = {
    ...f,
    nodes: options.layerAxis
      ? plan.graph.nodes
      : f.nodes.map((n) => {
          const p = placed.get(n.id);
          return p
            ? {
                ...n,
                position: options.depth
                  ? p
                  : { ...p, z: n.position.z },
              }
            : n;
        }),
    edges: plan.graph.edges,
    ...(f.layered
      ? {
          layered: {
            options: f.layered.options,
            computed: placed,
          },
        }
      : {}),
  };
  return laid;
};
export const optimize: Change = (f) =>
  fitDemo(arrangeSheet(f));
export const resetSheet: Change = (f) => {
  const laid = arrangeSheet(
    (f.rooms
      ? viewAt(-0.22, -0.2)
      : viewAt(0, 0))({
      ...f,
      focus: undefined,
      roomMotion: undefined,
    }),
  );
  const heights = new Map(
    f.nodes.map((n) => [n.id, n.position.z]),
  );
  const nodes = laid.nodes.map((n) => {
    const z = heights.get(n.id) ?? n.position.z;
    return z === n.position.z
      ? n
      : { ...n, position: { ...n.position, z } };
  });
  return fitDemo({ ...laid, nodes });
};
export const measuredFrame = (host: Element) => {
  const stage = host.parentElement;
  const panel = stage?.querySelector(".dsl");
  const strip = host.querySelector(".toolbar");
  const rect = host.getBoundingClientRect();
  const { width, height } = rect;
  if (!width || !height) return;
  const unit = (px: number) =>
    Math.round((px * viewport.x) / width);
  const box = panel?.getBoundingClientRect(),
    tools = strip?.getBoundingClientRect();
  const bottom =
    box && Math.abs(width - box.width) < 1;
  return {
    height: unit(height),
    cover: !bottom && box ? unit(box.width) : 0,
    insets: {
      ...(width < 760 &&
        bottom && { phoneWidth: width }),
      left: 0,
      top: tools
        ? unit(tools.bottom - rect.top)
        : 0,
      bottom:
        bottom && box ? unit(box.height) : 0,
    },
  };
};
export const observeFrame = <Action>(
  root: Element,
  resized: (
    height: number,
    cover: number,
    insets: typeof clearInsets,
  ) => Action,
) =>
  custom<Action>("board-frame", (dispatch) => {
    const host = root.querySelector(
      ".canvas-wrap",
    );
    if (!host) return () => {};
    let previous = "";
    const measure = () => {
      const frame = measuredFrame(host);
      if (!frame) return;
      const key = JSON.stringify(frame);
      if (key === previous) return;
      previous = key;
      dispatch(
        resized(
          frame.height,
          frame.cover,
          frame.insets,
        ),
      );
    };
    const observer = new ResizeObserver(measure);
    for (const el of [
      host,
      root.querySelector(".toolbar"),
      root.querySelector(".dsl"),
    ])
      if (el) observer.observe(el);
    const stopToolbar = observeToolbar(root);
    const stop = revealSelection(root);
    const initial =
      requestAnimationFrame(measure);
    return () => {
      cancelAnimationFrame(initial);
      observer.disconnect();
      stopToolbar();
      stop();
    };
  });
const helpRows: readonly (readonly [
  string,
  string,
])[] = [
  [
    "A -> B",
    "接続。ノードは書かなくても、名前が出てきた時点で作られます。",
  ],
  [
    'A -> B "ラベル" step animated',
    "線にラベルを付け、経路（straight / step / curve）や流れのアニメーションを指定します。",
  ],
  [
    "node 名前 at x y [z]",
    "ノードを置く位置。z を書くと高さが付きます。at を省くと自動配置の対象になります。",
  ],
  [
    'node 名前 label "表示名" width 150',
    '表示名と幅。空白を含む名前は " で囲みます。',
  ],
  [
    "node 枠 group / node 子 in 枠",
    "グループと、その中に入るノード。collapsed で折りたたみます。",
  ],
  [
    "layout layered down depth",
    "at のないノードを自動で並べます。right は左から右、down は上から下。depth を付けると層ごとに高さが上がります。",
  ],
  [
    "rule acyclic / rule max-outputs 1",
    "循環する接続や、出力の本数を制限します。",
  ],
  [
    "axis 層 入口 処理 保存",
    "部屋の分類に使う属性と値を順番に指定します。",
  ],
  [
    "view x=層 column=地域",
    "属性を方向や建物の列・行に割り当てます。pin=地域=東京 で値を固定します。",
  ],
  ["snap 32", "ドラッグ時に吸着する格子の間隔。"],
  [
    "# コメント",
    "# から行末までは無視されます。",
  ],
];
export const sheetHelp = <Action>(
  toggleHelp: Action,
): Html<Action> =>
  el(
    "button",
    [
      attr("type", "button"),
      attr("class", "help-toast"),
      attr("aria-label", "DSL の書き方を閉じる"),
      onClick(toggleHelp),
    ],
    [
      el("strong", [], [text("DSL の書き方")]),
      el(
        "span",
        [attr("class", "help-lead")],
        [
          text(
            "1 行に 1 つ書きます。図を動かすと、ここも書き換わります。",
          ),
        ],
      ),
      el(
        "span",
        [attr("class", "help-rows")],
        helpRows.flatMap(([code, note]) => [
          el("code", [], [text(code)]),
          el("span", [], [text(note)]),
        ]),
      ),
      el(
        "span",
        [attr("class", "help-close")],
        [text("クリックで閉じる")],
      ),
    ],
  );
export const sheetDsl = <Action>(
  flow: Flow,
  rules: readonly Rule[],
  select: (fn: Change) => Action,
  source: string,
  error: string | undefined,
  toggleHelp: Action,
  retype: (
    source: string,
    edited?: Flow,
  ) => Action,
  rows?: ReturnType<typeof rowCache<Action>>,
  properties?: ReturnType<typeof propertyCache>,
  current = () => flow,
) => {
  return el(
    "aside",
    [
      attr("class", "dsl"),
      attr("aria-label", "DSL"),
    ],
    [
      el(
        "div",
        [attr("class", "dsl-head")],
        [
          el(
            "button",
            [
              attr("type", "button"),
              attr("class", "dsl-handle"),
              attr(
                "aria-label",
                "DSL パネルの大きさを変更",
              ),
            ],
            [
              text(
                [
                  "DSL",
                  flow.nodes.find((n) =>
                    selectedNodes(flow).includes(
                      n.id,
                    ),
                  )?.label ??
                    flow.activeEdge?.label ??
                    (flow.activeEdge
                      ? flow.activeEdge.source +
                        " → " +
                        flow.activeEdge.target
                      : ""),
                ]
                  .filter(Boolean)
                  .join(" · "),
              ),
            ],
          ),
          el("strong", [], [text("DSL")]),
          el(
            "span",
            [],
            [text(error ? "エラー" : "")],
          ),
          el(
            "label",
            [
              attr("class", "dsl-mode"),
              attr("title", "テキストとして編集"),
            ],
            [
              el(
                "input",
                [
                  attr("type", "checkbox"),
                  attr(
                    "aria-label",
                    "テキストとして編集",
                  ),
                ],
                [],
              ),
              el(
                "svg",
                [
                  attr("width", "14"),
                  attr("height", "14"),
                  attr("viewBox", "0 0 16 16"),
                  attr("aria-hidden", "true"),
                ],
                [
                  el(
                    "path",
                    [
                      attr(
                        "d",
                        "M2.5 13.5l.8-3.3 7.6-7.6 2.5 2.5-7.6 7.6zM9.6 3.9l2.5 2.5",
                      ),
                      attr("fill", "none"),
                      attr(
                        "stroke",
                        "currentColor",
                      ),
                      attr("stroke-width", "1.2"),
                      attr(
                        "stroke-linejoin",
                        "round",
                      ),
                    ],
                    [],
                  ),
                ],
              ),
            ],
          ),
          el(
            "button",
            [
              attr("type", "button"),
              attr("class", "dsl-help"),
              attr("aria-label", "DSL の書き方"),
              onClick(toggleHelp),
            ],
            [text("?")],
          ),
        ],
      ),
      dslRows(
        flow,
        rules,
        source,
        error,
        select,
        retype,
        rows,
      ),
      el(
        "div",
        [attr("class", "dsl-overlay")],
        [],
      ),
      el(
        "textarea",
        [
          attr("spellcheck", "false"),
          attr("aria-label", "図の DSL"),
          attr("value", source),
          onInput(retype),
        ],
        [text(source)],
      ),
      sheetProperties(
        flow,
        rules,
        (fn, nextRules) => {
          const edited = fn(current());
          return retype(
            printSpec(edited, nextRules),
            edited,
          );
        },
        properties,
        flow.suggestions
          ? [
              el(
                "button",
                [
                  attr("type", "button"),
                  attr("class", btnClass),
                  on("click", () => {
                    return retype(
                      writeCurrentView(
                        source,
                        movingRooms(current()),
                      ),
                    );
                  }),
                ],
                [text("この見方を書く")],
              ),
            ]
          : [],
      ),
      ...(error
        ? [
            el(
              "output",
              [
                attr("class", "dsl-status"),
                attr("aria-live", "polite"),
                attr("data-error", ""),
              ],
              [text(error)],
            ),
          ]
        : []),
    ],
  );
};
// Each mounted panel owns its handlers and one retained set of displayed inputs.
export const createDslPanel = <Action>(
  select: (fn: Change) => Action,
  toggle: Action,
  retype: (
    source: string,
    edited?: Flow,
  ) => Action,
) => {
  const rows = rowCache<Action>();
  const properties = propertyCache();
  let current: Flow;
  const render = (build: () => Html<Action>) =>
    build();
  let previous:
    | {
        inputs: readonly unknown[];
        view: Html<Action>;
      }
    | undefined;
  return (
    flow: Flow,
    rules: readonly Rule[],
    source: string,
    error?: string,
  ) => {
    current = flow;
    const inputs = [
      flow.nodes,
      flow.edges,
      flow.rooms?.axes,
      flow.layered,
      flow.snap,
      flow.selected,
      flow.selection,
      flow.chosenEdges,
      flow.activeEdge,
      flow.selectedDslRow,
      rules,
      source,
      error,
    ];
    if (
      previous &&
      inputs.every(
        (v, i) => v === previous?.inputs[i],
      )
    )
      return previous.view;
    const view = lazy(render, () =>
      sheetDsl(
        flow,
        rules,
        select,
        source,
        error,
        toggle,
        retype,
        rows,
        properties,
        () => current,
      ),
    );
    previous = { inputs, view };
    return view;
  };
};
// Bottom right of the board: the board alone, over the
// whole window, and back. The corners are drawn; the
// sheet's script turns `data-max` on the sheet.
const maximiseButton = el<never>(
  "button",
  [
    attr("type", "button"),
    attr("class", "maximise"),
    attr("aria-label", "図を最大化"),
    attr("aria-pressed", "false"),
  ],
  [
    el(
      "svg",
      [
        attr("width", "14"),
        attr("height", "14"),
        attr("viewBox", "0 0 16 16"),
        attr("aria-hidden", "true"),
      ],
      [
        el(
          "path",
          [
            attr(
              "d",
              "M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10",
            ),
            attr("fill", "none"),
            attr("stroke", "currentColor"),
            attr("stroke-width", "1.2"),
          ],
          [],
        ),
      ],
    ),
  ],
);
export const sheetStage = <Action>(
  board: Html<Action>,
  controls: Html<Action>,
  panel: readonly Html<Action>[],
) =>
  el(
    "div",
    [attr("class", "stage")],
    [
      el(
        "div",
        [attr("class", "canvas-wrap")],
        [board, controls, maximiseButton],
      ),
      ...panel,
    ],
  );

export const sheetHint = el<never>(
  "small",
  [],
  [
    // one line per kind of pointer; the
    // stylesheet shows the one in use
    el(
      "span",
      [attr("class", "hint-mouse")],
      [
        text(
          "Shift＋ドラッグで範囲選択 · ⌘（Ctrl）＋ドラッグで回転 · ⌘（Ctrl）＋スクロールでズーム",
        ),
      ],
    ),
    el(
      "span",
      [attr("class", "hint-touch")],
      [text("1本指で移動 · 2本指で回転とズーム")],
    ),
  ],
);
export const addSheetNode: Change = (flow) => {
  const ids = new Set(
    flow.nodes.map((n) => n.id),
  );
  let i = 1;
  while (ids.has("Node " + i)) i++;
  const id = "Node " + i;
  return addNode({
    id,
    label: id,
    position: { x: 0, y: 90, z: 0 },
  })(flow);
};
export const addButton = <Action>(
  action: Action,
) =>
  el(
    "button",
    [
      attr("type", "button"),
      attr("class", "add-node"),
      attr("aria-label", "ノードを追加"),
      attr("title", "ノードを追加"),
      onClick(action),
    ],
    [text("+")],
  );
export const removeButton = <Action>(
  action: Action,
) =>
  el(
    "button",
    [
      attr("type", "button"),
      attr("class", "remove"),
      attr("aria-label", "選択を削除"),
      attr("title", "選択を削除（Delete）"),
      onClick(action),
    ],
    [text("−")],
  );
const rankSheetView = (
  f: Flow,
  opening: boolean,
): Flow => {
  if (!f.rooms || !f.suggestions?.length)
    return f;
  const axes = f.declaredAxes ?? f.rooms.axes;
  const frame = frameOf(f);
  const suggestions = searchSheetViews(
    f,
    axes,
    {
      ...frame,
      x: Math.max(
        1,
        frame.x -
          (f.cover ?? 0) -
          (f.sheetInsets?.left ?? 0),
      ),
      y: Math.max(
        1,
        frame.y -
          (f.sheetInsets?.top ?? 0) -
          (f.sheetInsets?.bottom ?? 0),
      ),
    },
    !!f.fixedRoles,
    f.markCleared ? [] : f.mark,
    opening ? "auto" : f.focus ? "first" : "all",
  );
  const current = suggestions.findIndex(
    (v) =>
      v.camera.yaw === f.camera.yaw &&
      v.camera.pitch === f.camera.pitch &&
      Object.entries(f.rooms!.axes).every(
        ([r, a]) =>
          Object.entries(v.view).some(
            ([role, name]) =>
              r === role && name === a.attribute,
          ) || r.startsWith("pin:"),
      ),
  );
  const index = opening
    ? 0
    : (current + 1) % suggestions.length;
  const next = suggestions[index]!;
  const chosen = axesFromView(axes, next.view);
  const same = Object.entries(chosen).every(
    ([key, a]) =>
      f.rooms?.axes[key]?.attribute ===
      a.attribute,
  );
  const layout = same
    ? undefined
    : planRooms(f, chosen);
  const scene = {
    ...f,
    ...layout?.graph,
    rooms: layout ?? f.rooms,
    camera: next.camera,
    suggestions,
    suggestionIndex: index,
  };
  const to = fitDemo(
    opening
      ? next.first
        ? firstBlock(scene)
        : { ...scene, focus: undefined }
      : layout && f.focus
        ? firstBlock(scene)
        : scene,
    roomFitMargin,
  );
  return opening ? to : turnRooms(f, to, 300);
};
export const nextSheetView: Change = (f) =>
  rankSheetView(f, false);
export const sheetToolbar = <Action>(
  navigate: (way: Travel) => Action,
  back: boolean,
  forward: boolean,
  change: (fn: Change) => Action,
  views: boolean | "layer",
  tools: readonly Html<Action>[] = [],
  flow?: Flow,
) => {
  const button = (
    label: string,
    action: Action,
  ) =>
    el(
      "button",
      [
        attr("type", "button"),
        attr("aria-label", label),
        attr(
          "data-icon",
          new Map(
            Object.entries({
              リセット: "⟲",
              見方: "◎",
              正面: "▣",
              上: "◩",
              横: "◧",
              立体: "⬡",
            }),
          ).get(label) ?? label,
        ),
        onClick(action),
      ],
      [text(label)],
    );
  const blocks = flow?.rooms
    ? roomBlocks(flow.rooms)
    : [];
  const step =
    (delta: number): Change =>
    (f) => {
      const current = blocks.findIndex((b) =>
        [...b.ids].some((id) => f.focus?.has(id)),
      );
      const i =
        current < 0 && delta < 0
          ? blocks.length - 1
          : (current + delta + blocks.length) %
            blocks.length;
      return fitDemo({
        ...f,
        focus: blocks[i]!.ids,
        roomMotion: undefined,
      });
    };
  return el(
    "div",
    [attr("class", "toolbar")],
    [
      button("リセット", change(resetSheet)),
      el(
        "span",
        [
          attr("class", "sheet-history"),
          attr("role", "group"),
          attr("aria-label", "履歴"),
        ],
        (
          [
            ["first", "最初に", true, true],
            ["back", "戻る", true, false],
            ["next", "次に", false, false],
            ["last", "最後に", false, true],
          ] satisfies [
            Travel,
            string,
            boolean,
            boolean,
          ][]
        ).map(([way, label, left, bar]) => {
          const enabled = left ? back : forward;
          return el(
            "button",
            [
              attr("type", "button"),
              attr("title", label),
              attr("aria-label", label),
              ...(enabled
                ? [onClick(navigate(way))]
                : [attr("disabled", "")]),
            ],
            [
              el(
                "svg",
                [
                  attr("width", "16"),
                  attr("height", "16"),
                  attr("viewBox", "0 0 16 16"),
                  attr("aria-hidden", "true"),
                ],
                [
                  el(
                    "path",
                    [
                      attr(
                        "d",
                        left
                          ? "M12 3L5 8L12 13Z"
                          : "M4 3L11 8L4 13Z",
                      ),
                      attr(
                        "fill",
                        "currentColor",
                      ),
                    ],
                    [],
                  ),
                  ...(bar
                    ? [
                        el<Action>(
                          "path",
                          [
                            attr(
                              "d",
                              left
                                ? "M3 3V13"
                                : "M13 3V13",
                            ),
                            attr(
                              "stroke",
                              "currentColor",
                            ),
                            attr(
                              "stroke-width",
                              "1.5",
                            ),
                          ],
                          [],
                        ),
                      ]
                    : []),
                ],
              ),
            ],
          );
        }),
      ),

      ...(views
        ? [
            button("見方", change(nextSheetView)),
            ...(views === "layer"
              ? layerViews
              : roomViews
            ).map(([label, yaw, pitch]) =>
              button(
                label,
                change((f) => {
                  const scene =
                    label === "立体"
                      ? { ...f, focus: undefined }
                      : f;
                  const to = fitDemo(
                    viewAt(yaw, pitch)(scene),
                  );
                  return views === "layer"
                    ? to
                    : turnRooms(f, to, 300);
                }),
              ),
            ),
          ]
        : []),
      ...(blocks.length > 1
        ? [
            button("◀", change(step(-1))),
            ...blocks.map((b) =>
              button(
                b.name,
                change((f) =>
                  fitDemo({
                    ...f,
                    focus: b.ids,
                    roomMotion: undefined,
                  }),
                ),
              ),
            ),
            button("▶", change(step(1))),
          ]
        : []),
      ...tools,
    ].map((item) =>
      el(
        "span",
        [attr("class", "toolbar-item")],
        [item],
      ),
    ),
  );
};
