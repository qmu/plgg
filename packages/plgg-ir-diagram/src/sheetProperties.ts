import { edgeIndex } from "plgg-flow/connections";
import { none, some, type Option } from "plgg";
import {
  attr,
  el,
  lazy,
  onEvent,
  text,
  type Html,
} from "plgg-view";
import {
  selectedNodes,
  selectedEdges,
  chooseEdges,
  deleteSelected,
  nodeSize,
  type Flow,
  type Change,
  type FlowNode,
  type Edge,
} from "plgg-flow";
import {
  renameFlowIdentity,
  distribute,
} from "plgg-flow/edits";
import {
  placedByLayout,
  type Rule,
} from "plgg-flow/dsl";
import type {
  Direction,
  RoomAxes,
} from "plgg-flow/autoLayout";

const axes: readonly Direction[] = [
  "x",
  "y",
  "z",
];
const square = 16;
const mixed = "複数の値";
const common = (values: readonly string[]) =>
  values.every((v) => v === values[0])
    ? (values[0] ?? "")
    : undefined;
const rename =
  (old: string, id: string): Change =>
  (f) => {
    const next = renameFlowIdentity(f, old, id);
    if (next === f) return f;
    return {
      ...next,
      nodes: next.nodes.map((n) =>
        n.id === id && n.label === old
          ? { ...n, label: id }
          : n,
      ),
      ...(f.layered
        ? {
            layered: {
              ...f.layered,
              computed: new Map(
                Array.from(
                  f.layered.computed,
                  ([key, p]) => [
                    key === old ? id : key,
                    p,
                  ],
                ),
              ),
            },
          }
        : {}),
    };
  };
const setLayout =
  (mode: string): Change =>
  (f) => {
    const {
      layered,
      rooms,
      roomMotion,
      ...rest
    } = f;
    const plain =
      layered &&
      mode !== "right" &&
      mode !== "down"
        ? {
            ...rest,
            edges: rest.edges.map(
              ({ via, lift, ...e }) => e,
            ),
          }
        : rest;
    return mode === "rooms"
      ? {
          ...plain,
          rooms: rooms ?? {
            axes: {
              x: { attribute: "層", values: [] },
              y: {
                attribute: "担当",
                values: [],
              },
              z: {
                attribute: "環境",
                values: [],
              },
            },
            rooms: [],
          },
        }
      : mode === "right" || mode === "down"
        ? {
            ...rest,
            layered: {
              options: {
                ...layered?.options,
                direction: mode,
              },
              computed:
                layered?.computed ??
                new Map(
                  f.nodes.map((n) => [
                    n.id,
                    n.position,
                  ]),
                ),
            },
          }
        : plain;
  };
const roomAxes =
  (fn: (a: RoomAxes) => RoomAxes): Change =>
  (f) => {
    if (!f.rooms) return f;
    const axes = fn(f.rooms.axes);
    return {
      ...f,
      declaredAxes: axes,
      rooms: { ...f.rooms, axes },
    };
  };
const arrange =
  (
    axis: "x" | "y",
    side: "start" | "center" | "end" | "gap",
  ): Change =>
  (f) => {
    const ids = selectedNodes(f);
    const nodes = f.nodes.filter((n) =>
      ids.includes(n.id),
    );
    const size = (n: FlowNode) =>
      nodeSize(n)[
        axis === "x" ? "width" : "height"
      ];
    const low = Math.min(
      ...nodes.map(
        (n) => n.position[axis] - size(n) / 2,
      ),
    );
    const high = Math.max(
      ...nodes.map(
        (n) => n.position[axis] + size(n) / 2,
      ),
    );
    const graph =
      side === "gap"
        ? distribute(f, ids, axis, "gaps")
        : f;
    return {
      ...f,
      nodes: graph.nodes.map((n) => {
        if (!ids.includes(n.id) || n.locked)
          return n;
        const half = size(n) / 2;
        const start =
          side === "start"
            ? low
            : side === "end"
              ? high - 2 * half
              : side === "center"
                ? (low + high) / 2 - half
                : n.position[axis] - half;
        return {
          ...n,
          position: {
            ...n.position,
            [axis]:
              Math.round(start / square) *
                square +
              half,
          },
        };
      }),
    };
  };

export const propertyCache = () =>
  new Map<
    string,
    { key: string; view: Html<never> }
  >();
const buildControl = (build: () => Html<never>) =>
  build();
export const sheetProperties = <A>(
  flow: Flow,
  rules: readonly Rule[],
  commit: (
    change: Change,
    rules: readonly Rule[],
  ) => A,
  cache = propertyCache(),
  actions: readonly Html<A>[] = [],
) => {
  const ids = selectedNodes(flow),
    nodes = flow.nodes.filter((n) =>
      ids.includes(n.id),
    ),
    indices = new Set(
      selectedEdges(flow).map((e) =>
        edgeIndex(flow.edges, e),
      ),
    ),
    edges = flow.edges.filter((_, i) =>
      indices.has(i),
    );
  const change = (fn: Change) =>
    commit(fn, rules);
  const editNodes = (
    fn: (n: FlowNode) => FlowNode,
  ) =>
    change((f) => ({
      ...f,
      nodes: f.nodes.map((n) =>
        ids.includes(n.id) ? fn(n) : n,
      ),
    }));
  const editEdges = (fn: (e: Edge) => Edge) =>
    change((f) => {
      const updated = f.edges.map((e, i) =>
        indices.has(i) ? fn(e) : e,
      );
      return chooseEdges(
        updated.filter((_, i) => indices.has(i)),
      )({ ...f, edges: updated });
    });
  const row = (
    label: string,
    ...controls: Html<A>[]
  ) =>
    el(
      "div",
      [attr("class", "property-row")],
      [
        el("span", [], [text(label)]),
        el("div", [], controls),
      ],
    );
  const handlers = new Map<
    string,
    (event: Event) => Option<A>
  >();
  const retained = (
    label: string,
    inputs: readonly unknown[],
    build: () => Html<never>,
  ) => {
    const key = JSON.stringify(inputs);
    const old = cache.get(label);
    if (old?.key === key) return old.view;
    const view = lazy(buildControl, build);
    cache.set(label, { key, view });
    return view;
  };
  const button = (
    label: string,
    aria: string,
    action: () => A,
    pressed?: boolean | "mixed",
    disabled = false,
    switched = false,
  ) => {
    handlers.set(aria, (e) =>
      e.type === "click"
        ? some(action())
        : none(),
    );
    return retained(
      aria,
      [
        "button",
        label,
        pressed,
        disabled,
        switched,
      ],
      () =>
        el(
          "button",
          [
            attr("type", "button"),
            attr("aria-label", aria),
            ...(pressed === undefined
              ? []
              : [
                  attr(
                    "aria-pressed",
                    String(pressed),
                  ),
                ]),
            ...(disabled
              ? [attr("disabled", "")]
              : []),
            ...(switched
              ? [attr("data-switch", "")]
              : []),
            ...(label === mixed
              ? [attr("data-mixed", "")]
              : []),
          ],
          [text(label)],
        ),
    );
  };
  const field = (
    label: string,
    value: string | undefined,
    apply: (s: string) => A,
    step?: number,
    disabled = false,
    min?: number,
  ) => {
    handlers.set(label, (e) => {
      if (e.type === "change") {
        const input = e.target;
        if (!(input instanceof HTMLInputElement))
          return none();
        const v = input.value;
        return !step ||
          (!input.validity?.badInput &&
            (!v ||
              (Number.isFinite(Number(v)) &&
                (min === undefined ||
                  (Number.isInteger(Number(v)) &&
                    Number(v) >= min)))))
          ? some(apply(v))
          : none();
      }

      if (
        !(e instanceof KeyboardEvent) ||
        !(e.target instanceof HTMLInputElement) ||
        !step ||
        !["ArrowUp", "ArrowDown"].includes(e.key)
      )
        return none();
      e.preventDefault();
      const origin = Number(e.target.value);
      const base =
        min === undefined
          ? origin
          : e.key === "ArrowUp"
            ? Math.floor(origin)
            : Math.ceil(origin);
      const v =
        base +
        (e.key === "ArrowUp" ? 1 : -1) *
          step *
          (e.shiftKey ? 4 : 1);
      return min !== undefined && v < min
        ? none()
        : some(apply(String(v)));
    });
    return retained(
      label,
      ["field", value, step, disabled, min],
      () =>
        el(
          "input",
          [
            attr("aria-label", label),
            attr(
              "type",
              step ? "number" : "text",
            ),
            attr("value", value ?? ""),
            attr(
              "placeholder",
              value === undefined ? mixed : "",
            ),
            ...(step
              ? [attr("step", String(step))]
              : []),
            ...(min === undefined
              ? []
              : [attr("min", String(min))]),
            ...(disabled
              ? [attr("disabled", "")]
              : []),
          ],
          [],
        ),
    );
  };
  const choice = (
    label: string,
    value: string | undefined,
    options: readonly (readonly [
      string,
      string,
    ])[],
    apply: (s: string) => A,
  ) => {
    handlers.set(label, (e) =>
      e.type === "change" &&
      e.target instanceof HTMLSelectElement
        ? some(apply(e.target.value))
        : none(),
    );
    return retained(
      label,
      ["choice", value, options],
      () =>
        el(
          "select",
          [
            attr("aria-label", label),
            attr("value", value ?? mixed),
            ...(value === undefined
              ? [attr("data-mixed", "")]
              : []),
          ],
          [
            ...(value === undefined
              ? [
                  el(
                    "option",
                    [
                      attr("disabled", ""),
                      attr("value", mixed),
                    ],
                    [text(mixed)],
                  ),
                ]
              : []),
            ...options.map(([v, t]) =>
              el(
                "option",
                [attr("value", v)],
                [text(t)],
              ),
            ),
          ],
        ),
    );
  };
  const hint = (s: string) =>
    el("small", [], [text(s)]);
  const toggle = (
    label: string,
    values: readonly boolean[],
    apply: (b: boolean) => A,
  ) => {
    const value = common(values.map(String));
    return row(
      label,
      button(
        value === undefined
          ? mixed
          : value === "true"
            ? "オン"
            : "オフ",
        label,
        () => apply(value !== "true"),
        value === undefined
          ? "mixed"
          : value === "true",
        false,
        true,
      ),
    );
  };
  const del = row(
    "削除",
    button("削除", "選択を削除", () =>
      change(deleteSelected),
    ),
  );
  const node = nodes[0],
    edge = edges[0];
  const axisRows = () =>
    [
      ...new Set([
        ...Object.keys(flow.rooms?.axes ?? {}),
        ...[
          "x",
          "y",
          "z",
          "column",
          "row",
        ].filter(
          (role) => !flow.rooms?.axes[role],
        ),
      ]),
    ].flatMap((dir) => {
      if (!flow.rooms) return [];
      const axis = flow.rooms.axes[dir] ?? {
        attribute: "",
        values: [],
      };
      return [
        row(
          dir,
          field(
            dir + " 軸の属性",
            axis.attribute,
            (v) =>
              change(
                roomAxes((a) =>
                  v.trim()
                    ? {
                        ...a,
                        [dir]: {
                          ...axis,
                          attribute: v,
                        },
                      }
                    : a,
                ),
              ),
          ),
          choice(
            dir + " 軸の文字",
            dir.startsWith("pin:") ? "pin" : dir,
            [
              "x",
              "y",
              "z",
              "column",
              "row",
              "pin",
            ].map((v) => [v, v]),
            (v) =>
              change(
                roomAxes((a) =>
                  Object.fromEntries(
                    Object.entries(a).map(
                      ([key, val]) => [
                        key === dir
                          ? v === "pin"
                            ? "pin:" +
                              axis.attribute
                            : v
                          : key === v
                            ? dir
                            : key,
                        val,
                      ],
                    ),
                  ),
                ),
              ),
          ),
        ),
      ];
    });
  const sheetRows = () => {
    const options = flow.layered?.options;
    const mode =
      flow.rooms && !options?.layerAxis
        ? "rooms"
        : options
          ? (options.direction ?? "right")
          : "none";
    const updateRule = (
      kind: Rule["kind"],
      replacement: readonly Rule[],
    ) =>
      commit(
        (f) => f,
        rules.some((r) => r.kind === kind)
          ? rules.flatMap((r) =>
              r.kind === kind ? replacement : [r],
            )
          : [...rules, ...replacement],
      );
    const limit = rules.find(
      (r) => r.kind === "max-outputs",
    );
    return [
      row(
        "配置",
        choice(
          "配置",
          mode,
          [
            ["none", "なし"],
            ["right", "階層（右へ）"],
            ["down", "階層（下へ）"],
            ["rooms", "部屋"],
          ],
          (v) => change(setLayout(v)),
        ),
      ),
      ...(options && !options.layerAxis
        ? [
            toggle(
              "奥行き",
              [!!options.depth],
              (depth) =>
                change((f) =>
                  f.layered
                    ? {
                        ...f,
                        layered: {
                          ...f.layered,
                          options: {
                            ...f.layered.options,
                            depth,
                          },
                        },
                      }
                    : f,
                ),
            ),
          ]
        : []),
      row(
        "吸着",
        choice(
          "吸着",
          String(flow.snap ?? square),
          [
            ["0", "なし"],
            ["8", "8"],
            ["16", "16"],
            ["32", "32"],
          ],
          (v) =>
            change((f) => ({
              ...f,
              snap: Number(v),
            })),
        ),
      ),
      ...(options
        ? [
            row(
              "層の軸",
              field(
                "層の軸",
                options.layerAxis?.attribute ??
                  "",
                (v) =>
                  change((f) => {
                    if (!f.layered) return f;
                    const {
                      layerAxis,
                      depth,
                      ...plain
                    } = f.layered.options;
                    return {
                      ...f,
                      layered: {
                        ...f.layered,
                        options: v.trim()
                          ? {
                              ...plain,
                              layerAxis: {
                                attribute:
                                  v.trim(),
                                values:
                                  layerAxis?.values ??
                                  [],
                              },
                            }
                          : plain,
                      },
                    };
                  }),
              ),
            ),
          ]
        : []),
      ...(!options?.layerAxis ? axisRows() : []),
      toggle(
        "循環を禁止",
        [rules.some((r) => r.kind === "acyclic")],
        (v) =>
          updateRule(
            "acyclic",
            v ? [{ kind: "acyclic" }] : [],
          ),
      ),
      row(
        "出力数の上限",
        field(
          "出力数の上限",
          limit?.kind === "max-outputs"
            ? String(limit.limit)
            : "",
          (v) =>
            updateRule(
              "max-outputs",
              v
                ? [
                    {
                      kind: "max-outputs",
                      limit: Number(v),
                    },
                  ]
                : [],
            ),
          1,
          false,
          0,
        ),
      ),
    ];
  };
  const nodeRows = (first: FlowNode) => {
    const value = (fn: (n: FlowNode) => string) =>
      common(nodes.map(fn));
    const placed = nodes.some((n) =>
      placedByLayout(flow, n),
    );
    const parentAllowed = (
      n: FlowNode,
      seen: readonly string[],
    ): boolean => {
      if (
        ids.includes(n.id) ||
        seen.includes(n.id)
      )
        return false;
      const parent = flow.nodes.find(
        (p) => p.id === n.parent,
      );
      return (
        !parent ||
        parentAllowed(parent, [...seen, n.id])
      );
    };
    return [
      ...(nodes.length === 1
        ? [
            row(
              "名前",
              field("名前", first.id, (v) =>
                change(rename(first.id, v)),
              ),
            ),
          ]
        : []),
      row(
        "ラベル",
        field(
          "ラベル",
          value((n) => n.label),
          (label) =>
            editNodes((n) => ({ ...n, label })),
        ),
      ),
      ...axes.map((axis) =>
        row(
          "位置 " + axis,
          field(
            "位置 " + axis,
            value((n) =>
              String(n.position[axis]),
            ),
            (v) =>
              editNodes((n) =>
                v
                  ? {
                      ...n,
                      position: {
                        ...n.position,
                        [axis]: Number(v),
                      },
                    }
                  : n,
              ),
            flow.snap === 0
              ? 1
              : (flow.snap ?? square),
            placed,
          ),
          ...(placed ? [hint("配置で指定")] : []),
        ),
      ),
      ...(
        ["width", "height"] satisfies (
          | "width"
          | "height"
        )[]
      ).map((k) => {
        const label =
          k === "width" ? "幅" : "高さ";
        return row(
          label,
          field(
            label,
            value((n) =>
              n[k] === undefined
                ? ""
                : String(n[k] / square),
            ),
            (v) =>
              editNodes((n) => {
                const { [k]: old, ...rest } = n;
                return v
                  ? {
                      ...rest,
                      [k]: Number(v) * square,
                    }
                  : rest;
              }),
            1,
            false,
            1,
          ),
        );
      }),
      toggle(
        "グループ",
        nodes.map((n) => !!n.group),
        (group) =>
          editNodes((n) => ({ ...n, group })),
      ),
      ...(nodes.every((n) => n.group)
        ? [
            toggle(
              "折りたたみ",
              nodes.map((n) => !!n.collapsed),
              (collapsed) =>
                editNodes((n) => ({
                  ...n,
                  collapsed,
                })),
            ),
          ]
        : []),
      row(
        "親",
        choice(
          "親",
          value((n) => n.parent ?? ""),
          [
            ["", "なし"],
            ...flow.nodes
              .filter(
                (n) =>
                  n.group && parentAllowed(n, []),
              )
              .map(
                (n) =>
                  [n.id, n.id] satisfies [
                    string,
                    string,
                  ],
              ),
          ],
          (v) =>
            editNodes((n) => {
              const { parent, ...rest } = n;
              return v
                ? { ...rest, parent: v }
                : rest;
            }),
        ),
      ),
      ...Object.values(
        flow.rooms?.axes ??
          (flow.layered?.options.layerAxis
            ? [flow.layered.options.layerAxis]
            : []),
      ).map((axis) =>
        row(
          axis.attribute,
          choice(
            axis.attribute,
            value((n) =>
              String(
                n.data?.[axis.attribute] ?? "",
              ),
            ),
            [
              ["", "なし"],
              ...[
                ...new Set([
                  ...axis.values,
                  ...flow.nodes.flatMap((n) => {
                    const v =
                      n.data?.[axis.attribute];
                    return typeof v === "string"
                      ? [v]
                      : [];
                  }),
                ]),
              ].map(
                (v) =>
                  [v, v] satisfies [
                    string,
                    string,
                  ],
              ),
            ],
            (v) =>
              editNodes((n) => {
                const {
                  [axis.attribute]: old,
                  ...data
                } = n.data ?? {};
                return {
                  ...n,
                  data: v
                    ? {
                        ...data,
                        [axis.attribute]: v,
                      }
                    : data,
                };
              }),
          ),
        ),
      ),
      ...(flow.nodes.some(
        (n) => n.value !== undefined,
      )
        ? [
            row(
              "値",
              field(
                "値",
                value((n) =>
                  String(n.value ?? ""),
                ),
                (v) =>
                  editNodes((n) => {
                    const { value, ...rest } = n;
                    return v
                      ? {
                          ...rest,
                          value: Number(v),
                        }
                      : rest;
                  }),
                1,
              ),
            ),
          ]
        : []),
      ...(nodes.length > 1
        ? [
            ...(
              ["x", "y"] satisfies ("x" | "y")[]
            ).map((axis) =>
              row(
                "整列",
                ...(
                  [
                    "start",
                    "center",
                    "end",
                  ] satisfies (
                    | "start"
                    | "center"
                    | "end"
                  )[]
                ).map((side, i) => {
                  const label =
                    (axis === "x"
                      ? ["左", "中央", "右"]
                      : ["上", "中央", "下"])[
                      i
                    ] ?? "";
                  return button(
                    label,
                    (axis === "x" ? "横" : "縦") +
                      "整列 " +
                      label,
                    () =>
                      change(arrange(axis, side)),
                    undefined,
                    placed,
                  );
                }),
              ),
            ),
            row(
              "等間隔",
              ...(
                ["x", "y"] satisfies ("x" | "y")[]
              ).map((axis) =>
                button(
                  axis === "x" ? "横" : "縦",
                  axis === "x"
                    ? "横に等間隔"
                    : "縦に等間隔",
                  () =>
                    change(arrange(axis, "gap")),
                  undefined,
                  placed || nodes.length < 3,
                ),
              ),
            ),
          ]
        : []),
      del,
    ];
  };
  const edgeRows = (first: Edge) => {
    const route = common(
      edges.map((e) => e.route ?? "curve"),
    );
    const ends = flow.nodes.map(
      (n) =>
        [n.id, n.id] satisfies [string, string],
    );
    return [
      ...(edges.length === 1
        ? [
            row(
              "接続",
              choice(
                "始点",
                first.source,
                ends,
                (source) =>
                  editEdges((e) => ({
                    ...e,
                    source,
                  })),
              ),
              text(" → "),
              choice(
                "終点",
                first.target,
                ends,
                (target) =>
                  editEdges((e) => ({
                    ...e,
                    target,
                  })),
              ),
            ),
            row(
              "向き",
              button(
                "向きを逆に",
                "向きを逆に",
                () =>
                  editEdges((e) => ({
                    ...e,
                    source: e.target,
                    target: e.source,
                  })),
              ),
            ),
          ]
        : []),
      row(
        "ラベル",
        field(
          "ラベル",
          common(edges.map((e) => e.label ?? "")),
          (label) =>
            editEdges((e) => ({ ...e, label })),
        ),
      ),
      row(
        "経路",
        ...(route === undefined
          ? [hint(mixed)]
          : []),
        ...(
          [
            "straight",
            "step",
            "curve",
          ] satisfies NonNullable<Edge["route"]>[]
        ).map((v, i) => {
          const label =
            ["直線", "角丸", "曲線"][i] ?? "";
          return button(
            label,
            "経路 " + label,
            () =>
              editEdges((e) => ({
                ...e,
                route: v,
              })),
            route === v,
          );
        }),
      ),
      toggle(
        "アニメーション",
        edges.map((e) => !!e.animated),
        (animated) =>
          editEdges((e) => ({ ...e, animated })),
      ),
      del,
    ];
  };
  const title =
    node && edge
      ? "ノード " +
        nodes.length +
        "・エッジ " +
        edges.length
      : node
        ? nodes.length === 1
          ? "ノード " + node.id
          : nodes.length + " 個のノード"
        : edge
          ? edges.length === 1
            ? "エッジ " +
              edge.source +
              " → " +
              edge.target
            : edges.length + " 本のエッジ"
          : "図全体";
  const rows =
    node && edge
      ? [del]
      : node
        ? nodeRows(node)
        : edge
          ? edgeRows(edge)
          : sheetRows();
  for (const label of cache.keys())
    if (!handlers.has(label)) cache.delete(label);
  const dispatch = (e: Event) => {
    const label =
      e.target instanceof HTMLElement
        ? e.target.getAttribute("aria-label")
        : undefined;
    return label
      ? (handlers.get(label)?.(e) ?? none())
      : none();
  };
  return el(
    "section",
    [
      attr("class", "dsl-properties"),
      ...(ids.length || edges.length
        ? [attr("data-selected", "")]
        : []),
      attr("aria-label", "プロパティ"),
      ...["click", "change", "keydown"].map(
        (type) => onEvent(type, dispatch),
      ),
    ],
    [
      el("strong", [], [text(title)]),
      ...actions,
      ...rows,
    ],
  );
};
