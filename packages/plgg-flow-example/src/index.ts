import { diffGraph } from "plgg-flow/revisions";
import { writeDrawing } from "plgg-flow/storage";
import {
  filesView,
  initialFiles,
  perform,
  type Files,
  type FileEdit,
} from "./files";
import {
  workbench,
  toolState,
  type ToolState,
} from "./workbench";
import {
  arrangeHierarchy,
  radialLayout,
  depthLayers,
  removeOverlaps,
} from "plgg-flow/layout";
import {
  revealNode,
  ownershipPath,
  enclose,
  reparent,
  dissolve,
  foldGroup,
  prune,
} from "plgg-flow/hierarchy";
import {
  isSome,
  none,
  some,
  type Option,
} from "plgg";
import { project } from "plgg-board";
import {
  el,
  attr,
  text,
  onClick,
  onEvent,
  onInput,
  mapHtml,
  type Html,
} from "plgg-view";
import {
  sandbox,
  custom,
  subNone,
  cmdNone,
  cmdEffect,
  cmdBatch,
  type Cmd,
} from "plgg-view/client";
import {
  createFlow,
  groundSide,
  addNode,
  selectNodes,
  selectedNodes,
  fitFlow,
  flowView,
  viewAt,
  zoom,
  deleteSelected,
  splitEdge,
  bypassNode,
  reachable,
  type Change,
  type Flow,
  type FlowNode,
  type Graph,
} from "plgg-flow";
import {
  examples,
  type DemoId,
} from "./examples";

type Visit = Readonly<{
  camera: Flow["camera"];
  ids: readonly string[];
  scope: Flow["isolatedBranch"];
  section: NonNullable<
    Flow["spatial"]
  >["section"];
}>;
const visit = (f: Flow): Visit => ({
  camera: f.camera,
  ids: selectedNodes(f),
  scope: f.isolatedBranch,
  section: f.spatial?.section,
});
type Session = Readonly<{
  trackedCard?: string;
  outline?: { parent?: string };
  back: readonly Visit[];
  forward: readonly Visit[];
  draft?: Readonly<{
    name: string;
    revision: number;
    busy: boolean;
    saved?: Flow;
  }>;
  flow: Flow;
  tools: ToolState;
  files: Files;
  returning: boolean;
  before: Flow[];
  after: Flow[];
  start: Option<Flow>;
  saved: Option<Flow>;
  clipboard: Option<FlowNode>;
  hidden: Option<Graph>;
  message: string;
}>;
const session = (flow: Flow): Session => ({
  flow,
  back: [],
  forward: [],
  tools: toolState(),
  files: initialFiles(),
  returning: false,
  before: [],
  after: [],
  start: none(),
  saved: none(),
  clipboard: none(),
  hidden: none(),
  message: "",
});
type Model = Readonly<{
  index: number;
  sessions: readonly Session[];
}>;
type Action = (model: Model) => Model;
type Edit = (s: Session) => Session;
const edit =
  (fn: Edit): Action =>
  (m) => ({
    ...m,
    sessions: m.sessions.map((s, i) =>
      i === m.index ? fn(s) : s,
    ),
  });
const historyEdit =
  (redo: boolean): Edit =>
  (s) => {
    const stack = redo ? s.after : s.before,
      flow = stack[stack.length - 1];
    if (!flow) return s;
    return redo
      ? {
          ...s,
          flow,
          after: stack.slice(0, -1),
          before: [...s.before, s.flow],
        }
      : {
          ...s,
          flow,
          before: stack.slice(0, -1),
          after: [...s.after, s.flow],
        };
  };
const apply =
  (fn: Change): Edit =>
  (s) => {
    const flow = fn(s.flow);
    const start = isSome(s.start)
      ? s.start.content
      : s.flow;
    const changed =
      flow.nodes !== start.nodes ||
      flow.edges !== start.edges ||
      flow.marks !== start.marks ||
      flow.bookmarks !== start.bookmarks ||
      flow.sets !== start.sets ||
      flow.spatial !== start.spatial;
    const dragging = isSome(flow.drag);
    const rejected =
      isSome(s.flow.source) &&
      !isSome(flow.source) &&
      flow.edges === s.flow.edges &&
      s.flow.allowConnection;
    return {
      ...s,
      flow,
      returning: false,
      start: dragging ? some(start) : none(),
      before:
        !dragging && changed
          ? [...s.before.slice(-49), start]
          : s.before,
      after: !dragging && changed ? [] : s.after,
      message: rejected
        ? "接続条件を満たしていません"
        : flow.edges.length > s.flow.edges.length
          ? "接続を追加しました"
          : s.message,
    };
  };
const btn = (
  label: string,
  fn: Edit,
  disabled = false,
) =>
  el(
    "button",
    [
      onClick(edit(fn)),
      ...(disabled ? [attr("disabled", "")] : []),
    ],
    [text(label)],
  );
const change = (
  label: string,
  fn: Change,
  disabled = false,
) => btn(label, apply(fn), disabled);
const input = (
  label: string,
  value: string,
  fn: (value: string) => Change,
  range?: readonly [number, number],
) =>
  el(
    "label",
    [],
    [
      text(label),
      el(
        "input",
        [
          attr("aria-label", label),
          attr("type", range ? "range" : "text"),
          attr("value", value),
          ...(range
            ? [
                attr("min", String(range[0])),
                attr("max", String(range[1])),
              ]
            : []),
          onInput((v) => edit(apply(fn(v)))),
        ],
        [],
      ),
    ],
  );
const revise =
  (
    id: string,
    fn: (n: FlowNode) => FlowNode,
  ): Change =>
  (f) => ({
    ...f,
    nodes: f.nodes.map((n) =>
      n.id === id ? fn(n) : n,
    ),
  });
const selected = (f: Flow) =>
  f.nodes.find(
    (n) =>
      isSome(f.selected) &&
      n.id === f.selected.content,
  );
const ownershipTrail = (flow: Flow) => {
  const current = selected(flow);
  if (!current || current.parent === undefined)
    return [];
  const path = ownershipPath(
    flow.nodes,
    current.id,
  );
  return [
    el(
      "div",
      [
        attr("class", "ownership-trail"),
        attr("role", "navigation"),
        attr("aria-label", "所属グループ"),
      ],
      path.flatMap((node, index) => [
        ...(index ? [text(" › ")] : []),
        node.id === current.id
          ? el(
              "span",
              [attr("aria-current", "location")],
              [text(node.label)],
            )
          : change(
              node.label,
              selectNodes([node.id]),
            ),
      ]),
    ),
  ];
};
const unique = (prefix: string, f: Flow) =>
  Array.from(
    { length: f.nodes.length + 1 },
    (_, i) => prefix + (i + 1),
  ).find(
    (id) => !f.nodes.some((n) => n.id === id),
  ) ?? prefix;
const arrange: Change = (f) =>
  fitFlow({ ...f, ...arrangeHierarchy(f) });
const center =
  (node: Pick<FlowNode, "position">): Change =>
  (f) => {
    const p = project(f.camera)(node.position);
    return {
      ...f,
      camera: {
        ...f.camera,
        origin: {
          x: f.camera.origin.x + 450 - p.x,
          y: f.camera.origin.y + 290 - p.y,
        },
      },
    };
  };
const navigate =
  (fn: Change): Edit =>
  (s) => ({
    ...s,
    returning: false,
    flow: fn(s.flow),
    back: [...s.back.slice(-49), visit(s.flow)],
    forward: [],
  });
const revisit =
  (forward: boolean): Edit =>
  (s) => {
    const stack = forward ? s.forward : s.back,
      entry = stack[stack.length - 1];
    if (!entry) return s;
    const { isolatedBranch, ...rest } = s.flow;
    const { section, ...spatial } =
      s.flow.spatial ?? {};
    const destination = entry.ids.filter((id) =>
      rest.nodes.some((n) => n.id === id),
    );
    const revealed = destination.reduce<Graph>(
      (g, id) => revealNode(g, id),
      { nodes: rest.nodes, edges: rest.edges },
    );
    const flow = selectNodes(destination)({
      ...rest,
      ...revealed,
      camera: entry.camera,
      ...(entry.scope !== undefined &&
      rest.nodes.some((n) => n.id === entry.scope)
        ? { isolatedBranch: entry.scope }
        : {}),
      ...(rest.spatial || entry.section
        ? {
            spatial: {
              ...spatial,
              ...(entry.section
                ? { section: entry.section }
                : {}),
            },
          }
        : {}),
    });
    return {
      ...s,
      flow,
      returning: false,
      back: forward
        ? [...s.back.slice(-49), visit(s.flow)]
        : stack.slice(0, -1),
      forward: forward
        ? stack.slice(0, -1)
        : [
            ...s.forward.slice(-49),
            visit(s.flow),
          ],
    };
  };
const focusNode =
  (target: FlowNode): Change =>
  (f) => {
    const { isolatedBranch, ...rest } = f;
    const scoped =
      isolatedBranch !== undefined &&
      ownershipPath(f.nodes, target.id).some(
        (n) => n.id === isolatedBranch,
      );
    const section = f.spatial?.section,
      clipped =
        section &&
        (target.position[section.axis] <
          section.min ||
          target.position[section.axis] >
            section.max);
    const {
      section: oldSection,
      ...otherSpatial
    } = f.spatial ?? {};
    const revealed = revealNode(
      { nodes: f.nodes, edges: f.edges },
      target.id,
    );
    return center(target)(
      selectNodes([target.id])({
        ...rest,
        ...revealed,
        ...(scoped && isolatedBranch !== undefined
          ? { isolatedBranch }
          : {}),
        ...(clipped
          ? { spatial: otherSpatial }
          : {}),
      }),
    );
  };
const cardHistory = (
  s: Session,
): Html<Action> => {
  const id = s.trackedCard,
    current = selected(s.flow);
  const track = btn(
    "選択カードの編集履歴",
    (state) =>
      current
        ? { ...state, trackedCard: current.id }
        : state,
    !current,
  );
  if (id === undefined) return track;
  const states = [
    ...s.before,
    s.flow,
    ...s.after.slice().reverse(),
  ];
  const local = states.map((f) => ({
    nodes: f.nodes.filter((n) => n.id === id),
    edges: f.edges.filter(
      (e) => e.source === id || e.target === id,
    ),
  }));
  const rows: Html<Action>[] = [];
  for (let i = 1; i < local.length; i++) {
    const from = local[i - 1]!,
      to = local[i]!,
      patch = diffGraph(from, to);
    if (patch.__tag === "Err") {
      rows.push(
        el("li", [], [text(patch.content)]),
      );
      continue;
    }
    const { nodes, edges } = patch.content;
    if (!nodes.length && !edges.length) continue;
    const changes: string[] = [];
    for (const n of nodes) {
      if (!isSome(n.before))
        changes.push("カード追加");
      else if (!isSome(n.after))
        changes.push("カード削除");
      else {
        const before = n.before.content,
          after = n.after.content;
        const keys = new Set([
          ...Object.keys(before),
          ...Object.keys(after),
        ] as (keyof FlowNode)[]);
        changes.push(
          ...Array.from(keys).filter(
            (k) =>
              JSON.stringify(before[k]) !==
              JSON.stringify(after[k]),
          ),
        );
      }
    }
    for (const edge of edges) {
      const value = isSome(edge.after)
        ? edge.after
        : edge.before;
      if (isSome(value))
        changes.push(
          (!isSome(edge.before)
            ? "配線追加"
            : !isSome(edge.after)
              ? "配線削除"
              : "配線変更") +
            " " +
            value.content.source +
            " → " +
            value.content.target,
        );
    }
    rows.push(
      el(
        "li",
        [],
        [
          text(
            (i > s.before.length
              ? "やり直し可能"
              : "編集") +
              " " +
              i +
              " · " +
              changes.join("、"),
          ),
        ],
      ),
    );
  }
  return el(
    "section",
    [attr("aria-label", "カード別の編集履歴")],
    [
      el("strong", [], [text(id)]),
      track,
      btn("編集履歴を閉じる", (state) => {
        const { trackedCard, ...rest } = state;
        return rest;
      }),
      ...(rows.length
        ? [el("ol", [], rows)]
        : [
            text(
              "このカードの編集記録はありません",
            ),
          ]),
    ],
  );
};
const hierarchyBrowser = (
  s: Session,
): Html<Action> => {
  if (!s.outline)
    return btn(
      "グループ一覧を開く",
      (current) => ({ ...current, outline: {} }),
    );
  const parent = s.flow.nodes.find(
    (n) => n.id === s.outline?.parent,
  );
  const children = s.flow.nodes.filter(
    (n) => n.parent === parent?.id,
  );
  const containers = new Set(
    s.flow.nodes.map((n) => n.parent),
  );
  const enter =
    (id?: string): Edit =>
    (current) => ({
      ...current,
      outline:
        id === undefined ? {} : { parent: id },
    });
  return el(
    "section",
    [attr("aria-label", "グループ一覧")],
    [
      el(
        "strong",
        [],
        [
          text(
            parent
              ? ownershipPath(
                  s.flow.nodes,
                  parent.id,
                )
                  .map((n) => n.label)
                  .join(" › ")
              : "図面の最上位",
          ),
        ],
      ),
      ...(parent
        ? [
            btn(
              "一つ上の階層へ",
              enter(parent.parent),
            ),
          ]
        : []),
      btn("グループ一覧を閉じる", (current) => {
        const { outline, ...rest } = current;
        return rest;
      }),
      el(
        "ul",
        [],
        children.map((node) =>
          el(
            "li",
            [],
            [
              btn(node.label, (s) => ({
                ...apply(focusNode(node))(s),
                back: [
                  ...s.back.slice(-49),
                  visit(s.flow),
                ],
                forward: [],
              })),
              ...(containers.has(node.id)
                ? [
                    btn(
                      node.label + " の中を見る",
                      enter(node.id),
                    ),
                  ]
                : []),
            ],
          ),
        ),
      ),
    ],
  );
};
const reviewQueue = (flow: Flow) => {
  const byId = new Map(
    flow.nodes.map((n) => [n.id, n]),
  );
  const byOwner = new Map<
    string,
    Html<Action>[]
  >();
  let count = 0;
  (flow.marks ?? []).forEach((mark) => {
    if (mark.kind !== "review" || mark.resolved)
      return;
    const node =
      mark.node === undefined
        ? undefined
        : byId.get(mark.node);
    const caption =
      (node?.label ?? mark.node ?? "空間注釈") +
      " · " +
      (mark.messages[0] ?? mark.id);
    const owner = mark.assignee ?? "";
    const group = byOwner.get(owner) ?? [];
    group.push(
      btn(
        caption,
        navigate((f) => {
          const next = node
            ? focusNode(node)(f)
            : center({
                position: mark.position,
              })(f);
          return {
            ...next,
            activeMark: mark.id,
          };
        }),
      ),
    );
    byOwner.set(owner, group);
    count++;
  });
  const items = [...byOwner].map(
    ([owner, buttons]) =>
      el(
        "fieldset",
        [],
        [
          el(
            "legend",
            [],
            [text(owner || "未担当")],
          ),
          ...buttons,
        ],
      ),
  );
  return items.length
    ? [
        el(
          "details",
          [attr("class", "review-queue")],
          [
            el(
              "summary",
              [],
              [
                text(
                  "未解決のレビュー（" +
                    count +
                    "）",
                ),
              ],
            ),
            ...items,
          ],
        ),
      ]
    : [];
};
const connectionLinks = (flow: Flow) => {
  const current = selected(flow);
  if (!current) return [];
  const byId = new Map(
    flow.nodes.map((n) => [n.id, n]),
  );
  const links = flow.edges.flatMap((edge) => {
    const outgoing = edge.source === current.id;
    if (!outgoing && edge.target !== current.id)
      return [];
    const target = byId.get(
      outgoing ? edge.target : edge.source,
    );
    if (!target) return [];
    const handle = outgoing
      ? edge.targetHandle
      : edge.sourceHandle;
    const caption = [
      outgoing ? "出力 →" : "入力 ←",
      target.label,
      handle,
      edge.label ?? edge.id,
    ]
      .filter(Boolean)
      .join(" ");
    return [
      btn(caption, navigate(focusNode(target))),
    ];
  });
  return links.length
    ? [
        el(
          "details",
          [attr("class", "connection-links")],
          [
            el(
              "summary",
              [],
              [
                text(
                  "配線をたどる（" +
                    links.length +
                    "）",
                ),
              ],
            ),
            ...links,
          ],
        ),
      ]
    : [];
};
const angle = (radians: number) =>
  Math.atan2(
    Math.sin(radians),
    Math.cos(radians),
  );
const controls = (
  id: DemoId,
  s: Session,
): Html<Action>[] => {
  const f = s.flow,
    process = f.nodes.find(
      (n) => n.id === "Process",
    );
  switch (id) {
    case "space":
      return [
        input(
          "水平角",
          String(
            Math.round(
              (angle(f.camera.yaw) * 180) /
                Math.PI,
            ),
          ),
          (v) => (f) =>
            viewAt(
              (Number(v) * Math.PI) / 180,
              f.camera.pitch,
            )(f),
          [-180, 180],
        ),
        input(
          "仰角",
          String(
            Math.round(
              (angle(f.camera.pitch) * 180) /
                Math.PI,
            ),
          ),
          (v) => (f) =>
            viewAt(
              f.camera.yaw,
              (Number(v) * Math.PI) / 180,
            )(f),
          [-180, 180],
        ),
      ];
    case "split":
      return [
        change(
          "接続の途中に挿入",
          (f) => {
            const e = f.edges[0],
              a = f.nodes.find(
                (n) => n.id === e?.source,
              ),
              b = f.nodes.find(
                (n) => n.id === e?.target,
              );
            if (!e || !a || !b) return f;
            const id = unique("Step ", f);
            return {
              ...f,
              ...splitEdge(
                f,
                e,
                {
                  id,
                  label: id,
                  position: {
                    x:
                      (a.position.x +
                        b.position.x) /
                      2,
                    y:
                      (a.position.y +
                        b.position.y) /
                        2 +
                      65,
                    z:
                      (a.position.z +
                        b.position.z) /
                      2,
                  },
                },
                f.allowConnection
                  ? { allow: f.allowConnection }
                  : {},
              ),
            };
          },
          !f.edges.length,
        ),
      ];
    case "reconnect":
      return [
        change("接続先を切替", (f) => ({
          ...f,
          edges: f.edges.map((e) =>
            e.source === "Route"
              ? {
                  ...e,
                  target:
                    e.target === "Live"
                      ? "Backup"
                      : "Live",
                }
              : e,
          ),
        })),
      ];
    case "cycles":
    case "limit":
      return [
        el(
          "output",
          [],
          [
            text(
              s.message ||
                (id === "cycles"
                  ? "制約：有向非巡回グラフ"
                  : "制約：出力は各ノードに1本"),
            ),
          ],
        ),
      ];
    case "bypass":
      return [
        change(
          "Process をバイパス",
          (f) => ({
            ...f,
            ...bypassNode(f, "Process"),
          }),
          !process,
        ),
      ];
    case "snap":
      return [
        change(
          `吸着間隔：${f.snap} → ${f.snap === 32 ? 64 : 32}`,
          (f) => ({
            ...f,
            snap: f.snap === 32 ? 64 : 32,
          }),
        ),
      ];
    case "resize":
      return [
        input(
          "Process の幅",
          String(process?.width ?? 104),
          (v) =>
            revise("Process", (n) => ({
              ...n,
              width: Number(v),
            })),
          [70, 250],
        ),
      ];
    case "rename":
      return [
        input(
          "表示名",
          process?.label ?? "",
          (v) =>
            revise("Process", (n) => ({
              ...n,
              label: v,
            })),
        ),
      ];
    case "routes":
      return (
        [
          "straight",
          "step",
          "curve",
        ] satisfies Array<
          "straight" | "step" | "curve"
        >
      ).map((route) =>
        change(route, (f) => ({
          ...f,
          edges: f.edges.map((e) => ({
            ...e,
            route,
          })),
        })),
      );
    case "motion":
      return [
        change(
          f.edges.some((e) => e.animated)
            ? "停止"
            : "再生",
          (f) => ({
            ...f,
            edges: f.edges.map((e) => ({
              ...e,
              animated: !e.animated,
            })),
          }),
        ),
      ];
    case "labels":
      return [
        input(
          "分岐条件",
          f.edges.find(
            (e) => e.source === "Route",
          )?.label ?? "",
          (v) => (f) => ({
            ...f,
            edges: f.edges.map((e) =>
              e.source === "Route"
                ? { ...e, label: v }
                : e,
            ),
          }),
        ),
      ];
    case "collapse":
      return [
        btn(
          isSome(s.hidden)
            ? "展開"
            : "折りたたむ",
          (s) => {
            if (isSome(s.hidden)) {
              const nodes = [
                  ...s.flow.nodes,
                  ...s.hidden.content.nodes,
                ],
                ids = new Set(
                  nodes.map((n) => n.id),
                );
              return {
                ...s,
                flow: {
                  ...s.flow,
                  nodes,
                  edges: [
                    ...s.flow.edges,
                    ...s.hidden.content.edges,
                  ].filter(
                    (e) =>
                      ids.has(e.source) &&
                      ids.has(e.target),
                  ),
                },
                hidden: none(),
              };
            }
            const ids = new Set(
              reachable(s.flow, "Route"),
            );
            ids.delete("Route");
            const incident = (e: {
              source: string;
              target: string;
            }) =>
              ids.has(e.source) ||
              ids.has(e.target);
            return {
              ...s,
              hidden: some({
                nodes: s.flow.nodes.filter((n) =>
                  ids.has(n.id),
                ),
                edges:
                  s.flow.edges.filter(incident),
              }),
              flow: {
                ...s.flow,
                nodes: s.flow.nodes.filter(
                  (n) => !ids.has(n.id),
                ),
                edges: s.flow.edges.filter(
                  (e) => !incident(e),
                ),
              },
            };
          },
        ),
      ];
    case "group": {
      const ids = selectedNodes(f),
        active = selected(f),
        group = active?.group === true;
      return [
        change(
          "選択をグループ化",
          (f) => {
            const id = unique("Group ", f),
              members = f.nodes.filter((n) =>
                ids.includes(n.id),
              );
            const first = members[0];
            if (!first) return f;
            const g = enclose(f, ids, {
              id,
              label: id,
              position: {
                ...first.position,
                x: first.position.x - 50,
                y: first.position.y - 70,
              },
            });
            return g === f
              ? f
              : selectNodes([id])({ ...f, ...g });
          },
          !ids.length ||
            new Set(
              f.nodes
                .filter((n) => ids.includes(n.id))
                .map((n) => n.parent),
            ).size > 1,
        ),
        change(
          active?.collapsed
            ? "グループを展開"
            : "グループを収納",
          (f) =>
            active
              ? {
                  ...f,
                  ...foldGroup(f, active.id),
                }
              : f,
          !group,
        ),
        change(
          "グループを解除",
          (f) =>
            active
              ? selectNodes([])({
                  ...f,
                  ...dissolve(f, active.id),
                })
              : f,
          !group,
        ),
        change(
          "一階層外へ",
          (f) =>
            active
              ? {
                  ...f,
                  ...reparent(
                    f,
                    active.id,
                    f.nodes.find(
                      (n) =>
                        n.id === active.parent,
                    )?.parent,
                  ),
                }
              : f,
          !active?.parent,
        ),
        change(
          "配下を整理",
          (f) =>
            active
              ? fitFlow({
                  ...f,
                  ...arrangeHierarchy(
                    f,
                    active.id,
                  ),
                })
              : f,
          !group,
        ),
        change(
          "枝を削除",
          (f) =>
            selectNodes([])({
              ...f,
              ...prune(f, ids),
            }),
          !ids.length,
        ),
        ...f.nodes
          .filter(
            (n) =>
              active &&
              n.group &&
              n.id !== active.id &&
              active.parent !== n.id &&
              reparent(f, active.id, n.id) !== f,
          )
          .map((n) =>
            change(n.label + " に移す", (f) =>
              active
                ? {
                    ...f,
                    ...reparent(
                      f,
                      active.id,
                      n.id,
                    ),
                  }
                : f,
            ),
          ),
      ];
    }
    case "layout":
      return [
        change("階層を自動配置", arrange),
        change("放射状配置", (f) =>
          fitFlow({ ...f, ...radialLayout(f) }),
        ),
        change("重なりを解消", (f) => ({
          ...f,
          ...removeOverlaps(f),
        })),
        change("深さに層を割当", (f) =>
          viewAt(
            -0.45,
            0.6,
          )(fitFlow({ ...f, ...depthLayers(f) })),
        ),
      ];
    case "copy":
      return [
        btn(
          "コピー",
          (s) => {
            const n = selected(s.flow);
            return n
              ? { ...s, clipboard: some(n) }
              : s;
          },
          !selected(f),
        ),
        btn(
          "貼り付け",
          (s) => {
            if (!isSome(s.clipboard)) return s;
            const n = s.clipboard.content,
              id = unique(n.label + " ", s.flow),
              offset =
                24 *
                (1 +
                  s.flow.nodes.filter((p) =>
                    p.id.startsWith(
                      n.label + " ",
                    ),
                  ).length);
            return apply((f) => ({
              ...f,
              nodes: [
                ...f.nodes,
                {
                  ...n,
                  id,
                  label: id,
                  position: {
                    ...n.position,
                    x: n.position.x + offset,
                    y: n.position.y + offset,
                  },
                },
              ],
              selected: some(id),
            }))(s);
          },
          !isSome(s.clipboard),
        ),
      ];
    case "history":
      return [
        btn(
          "元に戻す",
          historyEdit(false),
          !s.before.length,
        ),
        btn(
          "やり直す",
          historyEdit(true),
          !s.after.length,
        ),
        change(
          "選択ノードを削除",
          deleteSelected,
          !selected(f),
        ),
      ];
    case "checkpoint":
      return [
        btn("現在の状態を保存", (s) => ({
          ...s,
          saved: some(s.flow),
          message: "保存しました",
        })),
        btn(
          "保存状態を復元",
          (s) =>
            isSome(s.saved)
              ? {
                  ...s,
                  flow: s.saved.content,
                  message: "復元しました",
                }
              : s,
          !isSome(s.saved),
        ),
        el("output", [], [text(s.message)]),
      ];
    case "compute":
      return ["A", "B"].map((id) =>
        input(
          id,
          String(
            f.nodes.find((n) => n.id === id)
              ?.value ?? 0,
          ),
          (v) =>
            revise(id, (n) => ({
              ...n,
              value: Number(v),
            })),
          [0, 20],
        ),
      );
    case "overview":
      return [
        el(
          "svg",
          [
            attr("class", "minimap"),
            attr("viewBox", "-400 -210 800 420"),
            attr("aria-label", "ミニマップ"),
          ],
          [
            ...f.edges.flatMap((e) => {
              const a = f.nodes.find(
                  (n) => n.id === e.source,
                ),
                b = f.nodes.find(
                  (n) => n.id === e.target,
                );
              return a && b
                ? [
                    el(
                      "line",
                      [
                        attr(
                          "x1",
                          String(a.position.x),
                        ),
                        attr(
                          "y1",
                          String(a.position.y),
                        ),
                        attr(
                          "x2",
                          String(b.position.x),
                        ),
                        attr(
                          "y2",
                          String(b.position.y),
                        ),
                        attr("stroke", "#6d9186"),
                        attr("stroke-width", "5"),
                      ],
                      [],
                    ),
                  ]
                : [];
            }),
            ...f.nodes.map((n) =>
              el(
                "circle",
                [
                  attr("aria-label", n.label),
                  attr(
                    "cx",
                    String(n.position.x),
                  ),
                  attr(
                    "cy",
                    String(n.position.y),
                  ),
                  attr("r", "24"),
                  attr("fill", "#167b70"),
                  onClick(edit(apply(center(n)))),
                ],
                [],
              ),
            ),
          ],
        ),
      ];
  }
};
const diagram = (id: DemoId, f: Flow) =>
  flowView(f, (n) => {
    const sum =
      id !== "compute"
        ? 0
        : f.edges
            .filter((e) => e.target === n.id)
            .reduce(
              (v, e) =>
                v +
                (f.nodes.find(
                  (input) =>
                    input.id === e.source,
                )?.value ?? 0),
              0,
            );
    return el(
      "text",
      [
        attr("text-anchor", "middle"),
        attr("y", "5"),
      ],
      [
        text(
          id === "compute"
            ? n.label + " = " + (n.value ?? sum)
            : n.label,
        ),
      ],
    );
  });
const view = (m: Model): Html<Action> => {
  const e = examples[m.index],
    s = m.sessions[m.index];
  if (!e || !s)
    return text("Example unavailable");
  return el(
    "main",
    [
      onEvent<Action>("keydown", (e) => {
        if (
          !(e instanceof KeyboardEvent) ||
          !(e.ctrlKey || e.metaKey) ||
          e.isComposing
        )
          return none();
        if (
          e.key.toLowerCase() === "k" &&
          e.currentTarget instanceof Element
        ) {
          const panel =
              e.currentTarget.querySelector(
                "details.editing-tools",
              ),
            input = panel?.querySelector(
              'input[type="search"]',
            );
          if (
            panel instanceof HTMLDetailsElement &&
            input instanceof HTMLInputElement
          ) {
            e.preventDefault();
            panel.open = true;
            input.focus();
            input.select();
          }
          return none();
        }
        if (
          e.target instanceof Element &&
          e.target.closest(
            "input,textarea,[contenteditable=true]",
          )
        )
          return none();
        if (
          e.key.toLowerCase() === "z" ||
          e.key.toLowerCase() === "y"
        ) {
          e.preventDefault();
          return some(
            edit(
              historyEdit(
                e.shiftKey ||
                  e.key.toLowerCase() === "y",
              ),
            ),
          );
        }
        return none();
      }),
    ],
    [
      el(
        "aside",
        [],
        [
          el("h1", [], [text("Flow atlas")]),
          el("a",[attr("href","./diagram.html"),attr("style","color:inherit")],[text("図面を文章で書く")]),
          el(
            "p",
            [],
            [text("インタラクション実例集")],
          ),
          el(
            "nav",
            [attr("aria-label", "Examples")],
            examples.map((e, i) =>
              el(
                "button",
                [
                  onClick((m: Model) => ({
                    ...m,
                    index: i,
                  })),
                  attr(
                    "aria-pressed",
                    String(i === m.index),
                  ),
                ],
                [text(e.name)],
              ),
            ),
          ),
        ],
      ),
      el(
        "section",
        [],
        [
          el(
            "header",
            [],
            [
              el("h2", [], [text(e.name)]),
              el(
                "span",
                [],
                [
                  text(
                    `${s.flow.nodes.length} nodes · ${s.flow.edges.length} edges`,
                  ),
                ],
              ),
            ],
          ),
          el(
            "p",
            [attr("class", "hint")],
            [text(e.hint)],
          ),
          el(
            "div",
            [attr("class", "feature")],
            controls(e.id, s),
          ),
          el(
            "small",
            [],
            [
              text(
                "背景ドラッグでパン · Shift＋ドラッグで回転 · Alt＋ドラッグで範囲選択 · スクロールでズーム。タッチは1本指でパン、2本指で回転・ピンチズーム。",
              ),
            ],
          ),
          el(
            "div",
            [attr("class", "canvas-wrap")],
            [
              mapHtml((fn: Change) =>
                edit(apply(fn)),
              )(diagram(e.id, s.flow)),
              el(
                "output",
                [
                  attr("class", "ground-side"),
                  attr("aria-live", "off"),
                ],
                [
                  text(
                    {
                      above: "地面の表側",
                      below: "地面の裏側",
                      level: "地面と同じ高さ",
                    }[groundSide(s.flow.camera)],
                  ),
                ],
              ),
            ],
          ),
          el(
            "div",
            [attr("class", "toolbar")],
            [
              btn(
                "正面に戻す",
                (s) => ({
                  ...s,
                  returning: true,
                }),
                s.flow.camera.yaw === 0 &&
                  s.flow.camera.pitch === 0,
              ),
              change("−", zoom(0.8)),
              change("+", zoom(1.25)),
              change("全体表示", fitFlow),
              btn("初期状態", () =>
                session(e.initial()),
              ),
              change("ノードを追加", (f) => {
                const id = unique("Node ", f);
                return addNode({
                  id,
                  label: id,
                  position: { x: 0, y: 90, z: 0 },
                })(f);
              }),
              change(
                "選択を削除",
                deleteSelected,
                !selected(s.flow),
              ),
            ],
          ),
          el(
            "div",
            [],
            [
              ...(s.flow.isolatedBranch !==
              undefined
                ? [
                    change(
                      "単独表示を終了",
                      (f) => {
                        const {
                          isolatedBranch,
                          ...rest
                        } = f;
                        return rest;
                      },
                    ),
                  ]
                : []),
              hierarchyBrowser(s),
              cardHistory(s),
              ...ownershipTrail(s.flow),
              ...connectionLinks(s.flow),
              ...reviewQueue(s.flow),
              ...(s.back.length ||
              s.forward.length
                ? [
                    el(
                      "div",
                      [
                        attr(
                          "class",
                          "visit-history",
                        ),
                      ],
                      [
                        btn(
                          "移動履歴を戻る",
                          revisit(false),
                          !s.back.length,
                        ),
                        btn(
                          "移動履歴を進む",
                          revisit(true),
                          !s.forward.length,
                        ),
                      ],
                    ),
                  ]
                : []),
              ...(s.flow.wiringMessage
                ? [
                    el(
                      "output",
                      [
                        attr(
                          "aria-live",
                          "polite",
                        ),
                      ],
                      [
                        text(
                          s.flow.wiringMessage,
                        ),
                      ],
                    ),
                  ]
                : []),
            ],
          ),
          mapHtml(
            (
              tool: import("./workbench").ToolEdit,
            ) =>
              edit((s) => {
                const result = tool(s);
                return {
                  ...(result.flow === s.flow
                    ? s
                    : apply(() => result.flow)(
                        s,
                      )),
                  tools: result.tools,
                };
              }),
          )(workbench(s)),
          btn(
            s.draft
              ? "下書きの自動保存を終了"
              : "端末に下書きを自動保存",
            (current) => {
              if (current.draft) {
                const { draft, ...rest } =
                  current;
                return rest;
              }
              const id = Array.from(
                crypto.getRandomValues(
                  new Uint32Array(3),
                ),
                (n) => n.toString(36),
              ).join("-");
              return {
                ...current,
                draft: {
                  name:
                    "下書き " +
                    e.name +
                    " " +
                    new Date().toISOString() +
                    " " +
                    id,
                  revision: 0,
                  busy: false,
                },
              };
            },
            s.draft?.busy,
          ),
          ...(s.draft
            ? [
                el(
                  "output",
                  [attr("aria-live", "polite")],
                  [
                    text(
                      s.draft.busy
                        ? "下書きを保存中…"
                        : "保存済み：" +
                            s.draft.name +
                            "（端末の図面一覧から再開）",
                    ),
                  ],
                ),
              ]
            : []),
          mapHtml((fn: FileEdit) =>
            edit((s) => ({
              ...s,
              files: fn(s.files),
            })),
          )(filesView(s.files)),
        ],
      ),
    ],
  );
};
const fileUpdate = (
  next: Model,
): [Model, Cmd<Action>] => {
  const index = next.index,
    s = next.sessions[index];
  if (!s || !isSome(s.files.job))
    return [next, cmdNone()];
  const job = s.files.job.content,
    source = s.flow,
    files = s.files;
  return [
    edit((s) => ({
      ...s,
      files: { ...s.files, job: none() },
    }))(next),
    cmdEffect<Action>(async () => {
      const outcome = await perform(
        job,
        files,
        source,
      );
      return (model) => ({
        ...model,
        sessions: model.sessions.map(
          (current, i) => {
            if (
              i !== index ||
              current.files.sequence !==
                files.sequence
            )
              return current;
            if (
              outcome.drawing &&
              current.flow !== source
            )
              return {
                ...current,
                files: {
                  ...current.files,
                  report:
                    "読み込み中に図面が更新されました。もう一度開いてください",
                },
              };
            const drawing = outcome.drawing;
            const updated = drawing
              ? apply(() => ({
                  ...createFlow(drawing),
                  ...drawing,
                }))(current)
              : current;
            return {
              ...updated,
              files: {
                ...updated.files,
                report: outcome.report,
                ...(outcome.available
                  ? {
                      available:
                        outcome.available,
                    }
                  : {}),
                ...(outcome.revision === undefined
                  ? {}
                  : {
                      revision: outcome.revision,
                      opened: files.name,
                    }),
              },
            };
          },
        ),
      });
    }),
  ];
};
const root = document.getElementById("app");
if (root)
  sandbox<Model, Action>({
    init: [
      {
        index: 0,
        sessions: examples.map((e) =>
          session(e.initial()),
        ),
      },
      cmdNone(),
    ],
    view,
    subscriptions: (m) => {
      const current = m.sessions[m.index];
      if (!current?.returning) return subNone();
      const { yaw, pitch } = current.flow.camera;
      return custom<Action>(
        "front-" + m.index,
        (dispatch) => {
          const started = performance.now();
          const duration = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches
            ? 0
            : 320;
          let frame = 0;
          const tick = (now: number) => {
            const t = duration
              ? Math.min(
                  1,
                  (now - started) / duration,
                )
              : 1;
            const weight =
              1 - t * t * (3 - 2 * t);
            dispatch(
              edit((s) => ({
                ...s,
                flow: viewAt(
                  angle(yaw) * weight,
                  angle(pitch) * weight,
                )(s.flow),
                returning: t < 1,
              })),
            );
            if (t < 1)
              frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
          return () =>
            cancelAnimationFrame(frame);
        },
      );
    },
    update: (fn, m) => {
      const next = fn(m);
      const [updated, fileCommand] =
        fileUpdate(next);
      const commands = [fileCommand];
      const sessions = updated.sessions.map(
        (s, i) => {
          const d = s.draft;
          if (
            !d ||
            d.busy ||
            d.saved === s.flow ||
            isSome(s.flow.drag) ||
            s.returning
          )
            return s;
          const source = s.flow;
          commands.push(
            cmdEffect<Action>(async () => {
              const result = await writeDrawing(
                d.name,
                source,
                d.revision,
              );
              return (model) => ({
                ...model,
                sessions: model.sessions.map(
                  (current, index) => {
                    if (
                      index !== i ||
                      current.draft?.name !==
                        d.name
                    )
                      return current;
                    if (result.__tag === "Err") {
                      const { draft, ...rest } =
                        current;
                      return {
                        ...rest,
                        files: {
                          ...rest.files,
                          report:
                            "自動保存停止：" +
                            result.content,
                        },
                      };
                    }
                    return {
                      ...current,
                      draft: {
                        ...d,
                        busy: false,
                        revision: result.content,
                        saved: source,
                      },
                    };
                  },
                ),
              });
            }),
          );
          return {
            ...s,
            draft: { ...d, busy: true },
          };
        },
      );
      return [
        { ...updated, sessions },
        cmdBatch(commands),
      ];
    },
  })(root);
