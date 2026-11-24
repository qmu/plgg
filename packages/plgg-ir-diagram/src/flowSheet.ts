import { sheetProperties } from "plgg-ir-diagram/sheetProperties";
export {
  sheetTools,
  sheetToolNames,
  type SheetTool,
} from "plgg-ir-diagram/sheetTools";
import {
  dslRows,
  revealSelection,
} from "plgg-ir-diagram/dslRows";
export { sheetCss } from "plgg-ir-diagram/sheetCss";
import { project } from "plgg-board";
import {
  addNode,
  viewAt,
  faceTable,
  turnRooms,
  roomLabels,
  nodeSize,
  bodyDepth,
  bridgePoints,
  frameOf,
  viewport,
  type Flow,
  type Change,
} from "plgg-flow";
import { wireGraph } from "plgg-flow/wiring";
import {
  applySpec,
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
  el,
  attr,
  text,
  onClick,
  onInput,
  type Html,
} from "plgg-view";
import { custom } from "plgg-view/client";
// Initial and reset sessions both open on the front of the board.
export const fitDemo = (original: Flow): Flow => {
  const flow = faceTable(original);
  if (!flow.nodes.length) return flow;
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
    ...(face ? [] : flow.nodes).flatMap((n) => {
      const { width, height } = nodeSize(n);
      return [-1, 1].flatMap((x) =>
        [-1, 1].flatMap((y) =>
          [-1, 1].map((z) =>
            at({
              x: n.position.x + (x * width) / 2,
              y: n.position.y + (y * height) / 2,
              z: n.position.z + z * bodyDepth(n),
            }),
          ),
        ),
      );
    }),
    ...(face ? [] : wireGraph(flow)).flatMap(
      (w) =>
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
    open = frame.x - (flow.cover ?? 0);
  // A projected label scales with its edge, while its clearance and
  // glyphs stay in screen pixels. Fit both parts inside the open frame.
  const labels = flow.rooms
    ? roomLabels(flow.rooms, camera)
    : [];
  const fitAxis = (
    low: number,
    high: number,
    available: number,
    axis: "x" | "y",
  ) => {
    const spans = [
      { at: low, lo: 0, hi: 0 },
      { at: high, lo: 0, hi: 0 },
      ...labels.map((l) => {
        const width = l.value.length * 13;
        const left =
          l.dx -
          (l.anchor === "end"
            ? width
            : l.anchor === "middle"
              ? width / 2
              : 0);
        return axis === "x"
          ? {
              at: l.x,
              lo: left,
              hi: left + width,
            }
          : {
              at: l.y,
              lo: l.dy - 7,
              hi: l.dy + 7,
            };
      }),
    ];
    let scale = face ? 1.5 : 1;
    for (const a of spans)
      for (const b of spans)
        if (b.at > a.at)
          scale = Math.min(
            scale,
            Math.max(
              1,
              available - 96 - b.hi + a.lo,
            ) /
              (b.at - a.at),
          );
    const origin = (zoom: number) =>
      (available -
        Math.min(
          ...spans.map((s) => zoom * s.at + s.lo),
        ) -
        Math.max(
          ...spans.map((s) => zoom * s.at + s.hi),
        )) /
      2;
    return { scale, origin };
  };
  const x = fitAxis(
      bounds.left,
      bounds.right,
      open,
      "x",
    ),
    y = fitAxis(
      bounds.top,
      bounds.bottom,
      frame.y,
      "y",
    );
  let scale = Math.min(x.scale, y.scale);
  let origin = {
    x: x.origin(scale),
    y: y.origin(scale),
  };
  if (flow.rooms) {
    // Label collisions depend on pixel-sized glyphs at the fitted scale.
    for (let i = 0; i < 16; i++) {
      let left = bounds.left * scale,
        right = bounds.right * scale,
        top = bounds.top * scale,
        bottom = bounds.bottom * scale;
      for (const l of roomLabels(flow.rooms, {
        ...camera,
        scale,
      })) {
        const w = l.value.length * 13;
        const x =
          l.x +
          l.dx -
          (l.anchor === "end"
            ? w
            : l.anchor === "middle"
              ? w / 2
              : 0);
        left = Math.min(left, x);
        right = Math.max(right, x + w);
        top = Math.min(top, l.y + l.dy - 7);
        bottom = Math.max(bottom, l.y + l.dy + 7);
      }
      origin = {
        x: (open - left - right) / 2,
        y: (frame.y - top - bottom) / 2,
      };
      const ratio = Math.min(
        (open - 96) / (right - left),
        (frame.y - 96) / (bottom - top),
      );
      if (ratio >= 1 - 1e-8 || i === 15) break;
      scale *= Math.max(0.1, ratio * 0.99);
    }
  }
  return {
    ...original,
    camera: {
      ...original.camera,
      scale,
      origin,
    },
  };
};
export const resizeDemo = (
  flow: Flow,
  height: number,
  fitted: boolean,
  cover = 0,
): Flow => {
  const previous = frameOf(flow);
  if (
    flow.frame &&
    previous.y === height &&
    previous.x === viewport.x &&
    (flow.cover ?? 0) === cover
  )
    return flow;
  const frame = { x: viewport.x, y: height };
  const next = { ...flow, frame, cover };
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
    const next = applySpec(
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
                          progress:
                            t * t * (3 - 2 * t),
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
export const roomsOpening = viewAt(-0.32, 0.26);
export const optimize: Change = (f) => {
  if (f.rooms) {
    const { axes, rooms, graph } = planRooms(
      f,
      f.rooms.axes,
    );
    return fitDemo({
      ...f,
      ...graph,
      rooms: { axes, rooms },
    });
  }
  // a sheet with groups keeps each group whole: the
  // groups and loose nodes are arranged as units
  if (f.nodes.some((n) => n.group))
    return fitDemo({
      ...f,
      ...arrangeHierarchy(f),
    });
  const frame = frameOf(f),
    wide = frame.x - (f.cover ?? 0) >= frame.y;
  // heights the author gave are theirs: depth is only
  // recomputed where the sheet asked for it
  const options = f.layered?.options ?? {
    direction: wide ? "right" : "down",
  };
  // routes drawn for the old places no longer apply
  const plain = f.edges.map((e) => {
    const { waypoints, via, lift, ...rest } = e;
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
    nodes: f.nodes.map((n) => {
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
  return fitDemo(laid);
};
export const observeFrame = <Action>(
  root: Element,
  resized: (
    height: number,
    cover: number,
  ) => Action,
) =>
  custom<Action>("board-frame", (dispatch) => {
    const host = root.querySelector(
      ".canvas-wrap",
    );
    if (!host) return () => {};
    let lastHeight = 0,
      lastCover = -1;
    const measure = ({
      width,
      height,
    }: DOMRectReadOnly) => {
      if (width <= 0 || height <= 0) return;
      const y = Math.round(
        (viewport.x * height) / width,
      );
      // the DSL panel, when it lies over the board
      const panel =
        host.parentElement?.querySelector(".dsl");
      const cover =
        panel &&
        getComputedStyle(panel).position ===
          "absolute"
          ? Math.round(
              (viewport.x *
                panel.getBoundingClientRect()
                  .width) /
                width,
            )
          : 0;
      if (
        (y === lastHeight &&
          cover === lastCover) ||
        y <= 0
      )
        return;
      lastHeight = y;
      lastCover = cover;
      dispatch(resized(y, cover));
    };
    const observer = new ResizeObserver(
      (entries) => {
        for (const entry of entries)
          measure(entry.contentRect);
      },
    );
    observer.observe(host);
    const stopSelection = revealSelection(root);
    const initial = requestAnimationFrame(() =>
      measure(host.getBoundingClientRect()),
    );
    return () => {
      cancelAnimationFrame(initial);
      observer.disconnect();
      stopSelection();
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
          el("strong", [], [text("DSL")]),
          el(
            "span",
            [],
            [text(error ? "エラー" : "")],
          ),
          el(
            "label",
            [attr("class", "dsl-mode")],
            [
              el(
                "input",
                [
                  attr("type", "checkbox"),
                  attr("aria-label", "テキスト"),
                ],
                [],
              ),
              text("テキスト"),
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
          const edited = fn(flow);
          return retype(
            printSpec(edited, nextRules),
            edited,
          );
        },
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
        [board, controls],
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
export const sheetToolbar = <Action>(
  reset: Action,
  change: (fn: Change) => Action,
  rooms: boolean,
  tools: readonly Html<Action>[] = [],
) => {
  const button = (
    label: string,
    action: Action,
  ) =>
    el(
      "button",
      [attr("type", "button"), onClick(action)],
      [text(label)],
    );
  return el(
    "div",
    [attr("class", "toolbar")],
    [
      button("リセット", reset),
      ...(rooms
        ? [
            ...(
              [
                ["正面", 0, 0],
                ["上", 0, -Math.PI / 2],
                ["横", Math.PI / 2, 0],
                ["立体", -0.32, 0.26],
              ] satisfies [
                string,
                number,
                number,
              ][]
            ).map(([label, yaw, pitch]) =>
              button(
                label,
                change((f) =>
                  turnRooms(
                    f,
                    fitDemo(
                      viewAt(yaw, pitch)(f),
                    ),
                    350,
                  ),
                ),
              ),
            ),
          ]
        : []),
      button("最適化", change(optimize)),
      ...tools,
    ],
  );
};
