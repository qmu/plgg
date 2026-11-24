import {
  history,
  record,
  travel,
  sheetEdited,
  type Travel,
} from "plgg-ir-diagram/sheetHistory";
import {
  cmdNone,
  cmdEffect,
  type Cmd,
} from "plgg-view/client";
import { resizeNode, nodeSize } from "plgg-flow";
import { diffGraph } from "plgg-flow/revisions";
import {
  filesView,
  initialFiles,
  perform,
  type Files,
  type FileEdit,
} from "plgg-ir-diagram/files";
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
  onInput,
  mapHtml,
  type Html,
} from "plgg-view";
import {
  createFlow,
  selectNodes,
  selectedNodes,
  fitFlow,
  frameOf,
  flowView,
  viewAt,
  deleteSelected,
  bypassNode,
  reachable,
  type Change,
  type Flow,
  type FlowNode,
  type Graph,
} from "plgg-flow";
import { type Rule } from "plgg-flow/dsl";

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
type Revision = Readonly<{
  hidden: Option<Graph>;
  fittedCamera: Flow["camera"];
  flow: Flow;
  rules: readonly Rule[];
}>;
const revision = (s: Revision): Revision => ({
  hidden: s.hidden,
  flow: s.flow,
  rules: s.rules,
  fittedCamera: s.fittedCamera,
});
export type Session = Readonly<{
  fittedCamera: Flow["camera"];
  help?: boolean;
  trackedCard?: string;
  outline?: { parent?: string };
  back: readonly Visit[];
  forward: readonly Visit[];
  flow: Flow;
  files: Files;
  opening: Revision;
  before: readonly Revision[];
  after: readonly Revision[];
  start: Option<Flow>;
  saved: Option<Flow>;
  clipboard: Option<FlowNode>;
  hidden: Option<Graph>;
  message: string;
  rules: readonly Rule[];
  /** Text being typed in the DSL panel, tied to the flow it produced. */
  dsl?: Readonly<{
    text: string;
    flow: Flow;
    error?: string;
  }>;
}>;
export const session = (
  flow: Flow,
  rules: readonly Rule[] = [],
): Session => ({
  flow,
  fittedCamera: flow.camera,
  rules,
  back: [],
  forward: [],
  files: initialFiles(),
  ...history({
    hidden: none(),
    flow,
    rules,
    fittedCamera: flow.camera,
  }),
  start: none(),
  saved: none(),
  clipboard: none(),
  hidden: none(),
  message: "",
});
export type Action = (
  session: Session,
) => Session;
type Edit = Action;
export const edit =
  (fn: Edit): Action =>
  (s) => {
    const next = fn(s);
    // Some sample controls edit the graph and their own session state together.
    return next.before === s.before &&
      !isSome(next.flow.drag) &&
      (sheetEdited(s.flow, next.flow) ||
        s.rules !== next.rules)
      ? {
          ...next,
          ...record<Revision>(s, revision(s)),
        }
      : next;
  };
export const travelSheet =
  (way: Travel): Edit =>
  (s) => {
    const next = travel<Revision>(
      s,
      revision(s),
      way,
    );
    return {
      ...s,
      ...next.history,
      ...next.current,
      start: none(),
    };
  };
const historyEdit = (redo: boolean): Edit =>
  travelSheet(redo ? "next" : "back");
export const apply =
  (fn: Change, force = false): Edit =>
  (s) => {
    const flow = fn(s.flow);
    const start = isSome(s.start)
      ? s.start.content
      : s.flow;
    const changed =
      force || sheetEdited(start, flow);
    const dragging = isSome(flow.drag);
    const rejected =
      isSome(s.flow.source) &&
      !isSome(flow.source) &&
      flow.edges === s.flow.edges &&
      s.flow.allowConnection;
    return {
      ...s,
      flow,
      ...(s.dsl?.flow === s.flow &&
        flow.suggestions &&
        flow.declaredAxes ===
          s.flow.declaredAxes &&
        (flow.suggestions !==
          s.flow.suggestions ||
          (flow.nodes === s.flow.nodes &&
            flow.edges === s.flow.edges)) && {
          dsl: { ...s.dsl, flow },
        }),
      start: dragging ? some(start) : none(),
      ...(!dragging && changed
        ? record<Revision>(
            s,
            revision({ ...s, flow: start }),
          )
        : {}),
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
          x:
            f.camera.origin.x +
            (frameOf(f).x -
              (f.cover ?? 0) +
              (f.sheetInsets?.left ?? 0)) /
              2 -
            p.x,
          y:
            f.camera.origin.y +
            (frameOf(f).y -
              (f.sheetInsets?.bottom ?? 0) +
              (f.sheetInsets?.top ?? 0)) /
              2 -
            p.y,
        },
      },
    };
  };
const navigate =
  (fn: Change): Edit =>
  (s) => ({
    ...s,
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
    "履歴を追う",
    (state) =>
      current
        ? { ...state, trackedCard: current.id }
        : state,
    !current,
  );
  if (id === undefined) return track;
  const states = [
    ...s.before.map((r) => r.flow),
    s.flow,
    ...s.after.map((r) => r.flow).reverse(),
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
        const beforeFields = new Map(
            Object.entries(before),
          ),
          afterFields = new Map(
            Object.entries(after),
          );
        const keys = new Set([
          ...beforeFields.keys(),
          ...afterFields.keys(),
        ]);
        changes.push(
          ...Array.from(keys).filter(
            (k) =>
              JSON.stringify(
                beforeFields.get(k),
              ) !==
              JSON.stringify(afterFields.get(k)),
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
          [
            attr("class", "connection-links"),
            attr("open", ""),
          ],
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
export const sessionControls = (
  id: string,
  s: Session,
): Html<Action>[] => {
  const f = s.flow,
    process = f.nodes.find(
      (n) => n.id === "Process",
    );
  switch (id) {
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
    case "resize":
      return [
        input(
          "Process の幅",
          String(
            process
              ? nodeSize(process).width
              : 96,
          ),
          (v) =>
            revise("Process", (n) =>
              resizeNode(n, Number(v)),
            ),
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
    case "snapshots":
      return [
        btn("現在の状態を保存", (s) => ({
          ...s,
          saved: some(s.flow),
          message: "保存しました",
        })),
        btn(
          "保存状態を復元",
          (s) => {
            const saved = s.saved;
            return isSome(saved)
              ? {
                  ...apply(
                    () => saved.content,
                    true,
                  )(s),
                  message: "復元しました",
                }
              : s;
          },
          !isSome(s.saved),
        ),
        el("output", [], [text(s.message)]),
      ];
    case "computed":
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
    case "minimap":
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
                        attr(
                          "stroke",
                          "var(--graphite)",
                        ),
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
                  attr("fill", "var(--ink)"),
                  onClick(edit(apply(center(n)))),
                ],
                [],
              ),
            ),
          ],
        ),
      ];
    case "trace":
      return [
        ...connectionLinks(f),
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
      ];
    case "revisions":
      return [cardHistory(s)];
    case "outline":
      return [hierarchyBrowser(s)];
    case "routes":
    case "snap":
    case "split":
    case "dimensions":
    case "layered":
      return [];
    case "hidden":
      return [
        change(
          s.flow.hidden === "none"
            ? "隠線を表示"
            : "隠線を隠す",
          (f) => ({
            ...f,
            hidden:
              f.hidden === "none"
                ? "lines"
                : "none",
          }),
        ),
      ];
    case "files":
      return [
        mapHtml((fn: FileEdit) =>
          edit((s) => ({
            ...s,
            files: fn(s.files),
          })),
        )(filesView(s.files)),
      ];
  }
  return [];
};
const labelText = (label: string) =>
  el(
    "text",
    [
      attr("text-anchor", "middle"),
      attr("y", "5"),
    ],
    [text(label)],
  );
export const diagram = (
  computed: boolean,
  f: Flow,
) =>
  flowView(
    f,
    !computed
      ? undefined
      : (n) =>
          labelText(
            n.label +
              " = " +
              (n.value ??
                f.edges
                  .filter(
                    (e) => e.target === n.id,
                  )
                  .reduce(
                    (v, e) =>
                      v +
                      (f.nodes.find(
                        (input) =>
                          input.id === e.source,
                      )?.value ?? 0),
                    0,
                  )),
          ),
  );
export const fileUpdate = (
  s: Session,
): [Session, Cmd<Action>] => {
  if (!isSome(s.files.job)) return [s, cmdNone()];
  const job = s.files.job.content,
    source = s.flow,
    files = s.files;
  return [
    { ...s, files: { ...files, job: none() } },
    cmdEffect<Action>(async () => {
      const outcome = await perform(
        job,
        files,
        source,
      );
      return (current) => {
        if (
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
                  available: outcome.available,
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
      };
    }),
  ];
};
