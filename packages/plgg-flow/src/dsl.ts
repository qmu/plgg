import { renameFlowIdentity } from "plgg-flow/edits";
import { edgeIndex } from "plgg-flow/connections";
import {
  selectNodes,
  selectedNodes,
  chooseEdges,
  selectedEdges,
  type Change,
} from "plgg-flow/model";
import {
  planLayers,
  planRooms,
  type RoomAxes,
  type LayerOptions,
} from "plgg-flow/autoLayout";
import { grid } from "plgg-flow/nodeSize";
import { ok, err, type Result } from "plgg";
import {
  acyclicConnection,
  limitOutputs,
} from "plgg-flow/graph";
import {
  createFlow,
  type Edge,
  type Flow,
  type FlowNode,
  type Graph,
} from "plgg-flow/model";

/**
 * A line-based text form for every gallery diagram.
 *
 *   snap 32
 *   rule acyclic
 *   rule max-outputs 1
 *   node Team at -250 -100 0 group
 *   node Review at 105 10 100 in Design label "査読"
 *   node A at -180 -75 value 3 width 160
 *   node Team at 0 0 group grow 80 40
 *   Route -> Live "条件" curve animated
 *
 * `#` starts a comment. Names with spaces are quoted.
 */
export type Rule =
  | Readonly<{ kind: "acyclic" }>
  | Readonly<{
      kind: "max-outputs";
      limit: number;
    }>;
export type Spec = Readonly<{
  graph: Graph;
  rules: readonly Rule[];
  snap?: number;
  axes?: RoomAxes;
  layout?: LayerOptions;
  pinned?: readonly string[];
}>;

const tokens = (line: string) =>
  Array.from(
    line.matchAll(
      /"((?:\\.|[^"\\])*)"|([^\s#]+)/g,
    ),
    (m) =>
      m[1] !== undefined
        ? {
            quoted: true,
            text: m[1].replace(
              /\\(["\\])/g,
              "$1",
            ),
          }
        : { quoted: false, text: m[2] ?? "" },
  );
type Lexeme = ReturnType<typeof tokens>[number];

const num = (
  t: Lexeme | undefined,
): number | undefined => {
  if (!t || t.quoted) return undefined;
  const n = Number(t.text);
  return Number.isFinite(n) ? n : undefined;
};

const routes = ["straight", "step", "curve"];
const isRoute = (
  s: string,
): s is NonNullable<Edge["route"]> =>
  routes.includes(s);

const parseNode = (
  ts: readonly Lexeme[],
): Result<
  { node: FlowNode; pinned: boolean },
  string
> => {
  const id = ts[1];
  if (!id) return err("node の名前がありません");
  let node: FlowNode = {
    id: id.text,
    label: id.text,
    position: { x: 0, y: 0, z: 0 },
  };
  let pinned = false;
  let i = 2;
  while (i < ts.length) {
    const word = ts[i]?.text;
    if (word === "at") {
      pinned = true;
      const x = num(ts[i + 1]),
        y = num(ts[i + 2]);
      if (x === undefined || y === undefined)
        return err(
          `${id.text}: at には x y [z] が必要です`,
        );
      const z = num(ts[i + 3]);
      node = {
        ...node,
        position: { x, y, z: z ?? 0 },
      };
      i += z === undefined ? 3 : 4;
    } else if (word === "group") {
      node = { ...node, group: true };
      i += 1;
    } else if (word === "collapsed") {
      node = { ...node, collapsed: true };
      i += 1;
    } else if (
      word === "in" ||
      word === "label"
    ) {
      const v = ts[i + 1];
      if (!v)
        return err(
          `${id.text}: ${word} の値がありません`,
        );
      node =
        word === "in"
          ? { ...node, parent: v.text }
          : { ...node, label: v.text };
      i += 2;
    } else if (word === "grow") {
      const x = num(ts[i + 1]),
        y = num(ts[i + 2]);
      if (x === undefined || y === undefined)
        return err(
          `${id.text}: grow には数値が2つ必要です`,
        );
      node = { ...node, grow: { x, y } };
      i += 3;
    } else if (
      word === "value" ||
      word === "height" ||
      word === "width"
    ) {
      const v = num(ts[i + 1]);
      if (v === undefined)
        return err(
          `${id.text}: ${word} には数値が必要です`,
        );
      node =
        word === "value"
          ? { ...node, value: v }
          : { ...node, [word]: v };
      i += 2;
    } else if (word && word.indexOf("=") > 0) {
      const iEq = word.indexOf("=");
      node = {
        ...node,
        data: {
          ...node.data,
          [word.slice(0, iEq)]: word.slice(
            iEq + 1,
          ),
        },
      };
      i++;
    } else
      return err(
        `${id.text}: 不明な指定「${word ?? ""}」`,
      );
  }
  return ok({ node, pinned });
};

const parseEdge = (
  ts: readonly Lexeme[],
): Result<Edge, string> => {
  const source = ts[0],
    target = ts[2];
  if (!source || !target)
    return err("接続は「A -> B」と書きます");
  let edge: Edge = {
    source: source.text,
    target: target.text,
  };
  for (const t of ts.slice(3)) {
    if (t.quoted)
      edge = { ...edge, label: t.text };
    else if (t.text === "animated")
      edge = { ...edge, animated: true };
    else if (isRoute(t.text))
      edge = { ...edge, route: t.text };
    else
      return err(
        `${source.text} -> ${target.text}: 不明な指定「${t.text}」`,
      );
  }
  return ok(edge);
};

export const parseSpec = (
  source: string,
): Result<Spec, string> => {
  const nodes: FlowNode[] = [],
    edges: Edge[] = [],
    rules: Rule[] = [];
  let rooms = false;
  let axes: RoomAxes = {};
  let layout: LayerOptions | undefined;
  const pinned: string[] = [];
  let snap: number | undefined = grid;
  const lines = source.split("\n");
  for (const [n, raw] of lines.entries()) {
    const line = raw
      .replace(
        /"(?:(?:\\.)|[^"\\])*"|#.*$/g,
        (part) =>
          part.startsWith("#") ? "" : part,
      )
      .trim();
    if (!line) continue;
    const ts = tokens(line),
      head = ts[0]?.text,
      at = `${n + 1} 行目: `;
    if (
      head === "node" &&
      (ts[1]?.quoted || ts[1]?.text !== "->")
    ) {
      const r = parseNode(ts);
      if (r.__tag === "Err")
        return err(at + r.content);
      nodes.push(r.content.node);
      if (r.content.pinned)
        pinned.push(r.content.node.id);
    } else if (ts[1]?.text === "->") {
      const r = parseEdge(ts);
      if (r.__tag === "Err")
        return err(at + r.content);
      edges.push(r.content);
    } else if (head === "axis") {
      const [, dir, key, ...values] = ts.map(
        (t) => t.text,
      );
      if (
        (dir !== "x" &&
          dir !== "y" &&
          dir !== "z") ||
        !key
      )
        return err(at + "axis x|y|z 属性 [値…]");
      axes = {
        ...axes,
        [dir]: { attribute: key, values },
      };
    } else if (head === "layout") {
      const [, kind, ...args] = ts.map(
        (t) => t.text,
      );
      if (kind === "rooms" && !args.length) {
        rooms = true;
        continue;
      }
      const direction = args[0];
      const explicit =
        direction === "down" ||
        direction === "right";
      if (explicit) args.shift();
      const depth = args[0] === "depth";
      if (
        kind !== "layered" ||
        args.length !== Number(depth)
      )
        return err(
          at +
            "layout layered [right|down] [depth] と書きます",
        );
      layout = {
        ...(explicit ? { direction } : {}),
        ...(depth ? { depth } : {}),
      };
    } else if (head === "snap") {
      snap =
        ts[1]?.text === "off" ? 0 : num(ts[1]);
      if (
        snap === undefined ||
        snap < 0 ||
        ts.length !== 2
      )
        return err(
          at + "snap には数値が必要です",
        );
    } else if (head === "rule") {
      const kind = ts[1]?.text,
        limit = num(ts[2]);
      if (kind === "acyclic")
        rules.push({ kind });
      else if (
        kind === "max-outputs" &&
        limit !== undefined
      )
        rules.push({ kind, limit });
      else
        return err(
          at +
            "rule は acyclic か max-outputs <数> です",
        );
    } else
      return err(
        at + `解釈できません「${line}」`,
      );
  }
  const ids = new Set(nodes.map((x) => x.id));
  if (ids.size !== nodes.length)
    return err("同じ名前のノードがあります");
  for (const { source, target } of edges)
    for (const id of [source, target])
      if (!ids.has(id)) {
        ids.add(id);
        nodes.push({
          id,
          label: id,
          position: { x: 0, y: 0, z: 0 },
        });
      }
  const stray = nodes
    .map((n) => n.parent)
    .find(
      (id) => id !== undefined && !ids.has(id),
    );
  if (stray !== undefined)
    return err(`未定義のノード「${stray}」`);
  return ok({
    graph: { nodes, edges },
    ...(rooms ? { axes } : {}),
    ...(layout ? { layout, pinned } : {}),
    rules,
    ...(snap === undefined ? {} : { snap }),
  });
};

const allow = (rules: readonly Rule[]) => {
  const checks = rules.map((r) =>
    r.kind === "acyclic"
      ? acyclicConnection
      : limitOutputs(r.limit),
  );
  return checks.length
    ? {
        allowConnection: (
          edge: Edge,
          graph: Graph,
        ) => checks.every((c) => c(edge, graph)),
      }
    : {};
};

/** Lay a spec onto a flow, keeping its camera. */
const laySpec =
  (spec: Spec) =>
  (flow: Flow): Flow => {
    const {
      allowConnection,
      snap,
      layered,
      rooms,
      ...rest
    } = flow;
    if (spec.axes) {
      const { graph, rooms, axes } = planRooms(
        spec.graph,
        spec.axes,
      );
      return {
        ...rest,
        ...graph,
        rooms: { rooms, axes },
        snap: spec.snap ?? grid,
        ...allow(spec.rules),
      };
    }
    const pins = new Set(spec.pinned);
    const unpinned = spec.graph.edges.flatMap(
      (edge, index) =>
        pins.has(edge.source) ||
        pins.has(edge.target)
          ? []
          : [{ edge, index }],
    );
    const plan =
      spec.layout &&
      planLayers(
        {
          nodes: spec.graph.nodes.filter(
            (n) => !pins.has(n.id),
          ),
          edges: unpinned.map(({ edge }) => edge),
        },
        spec.layout,
      );
    const computed = new Map(
      plan?.graph.nodes.map((n) => [
        n.id,
        n.position,
      ]),
    );
    const routed = new Map(
      unpinned.map(({ index }, i) => [
        index,
        plan?.graph.edges[i],
      ]),
    );
    return {
      ...rest,
      ...spec.graph,
      ...(spec.layout
        ? {
            edges: spec.graph.edges.map(
              (e, i) => routed.get(i) ?? e,
            ),
            layered: {
              options: spec.layout,
              computed,
            },
            nodes: spec.graph.nodes.map((n) => ({
              ...n,
              position:
                computed.get(n.id) ?? n.position,
            })),
          }
        : {}),
      ...allow(spec.rules),
      snap: spec.snap ?? grid,
    };
  };

// A reparse creates fresh edges. Rebind selection before the board falls
// back to endpoint matching (which conflates parallel connections).
export const applySpec =
  (spec: Spec) =>
  (flow: Flow): Flow => {
    const next = laySpec(spec)(flow);
    const wires = selectedEdges(flow),
      ids = selectedNodes(flow);
    if (!wires.length && !ids.length) return next;
    const edges = wires.flatMap((e) => {
      const index = edgeIndex(flow.edges, e);
      if (index < 0) return [];
      if (flow.edges.length === next.edges.length)
        return next.edges[index] ?? [];
      const same = (v: Edge) =>
        v.source === e.source &&
        v.target === e.target &&
        v.label === e.label &&
        v.route === e.route &&
        !!v.animated === !!e.animated;
      const ordinal = flow.edges
        .slice(0, index)
        .filter(same).length;
      return (
        next.edges.filter(same)[ordinal] ?? []
      );
    });
    return chooseEdges(edges)(
      selectNodes(ids)(next),
    );
  };

export const specFlow = (spec: Spec): Flow =>
  applySpec(spec)(createFlow(spec.graph));

const quoted = (s: string) =>
  '"' +
  s.replace(/["\\]/g, (c) => "\\" + c) +
  '"';
const name = (s: string) =>
  /^[^\s"#]+$/.test(s) && s !== "->"
    ? s
    : quoted(s);
const coord = (n: number) =>
  String(Math.round(n));

export type Subject =
  | Readonly<{ kind: "node"; id: string }>
  | Readonly<{ kind: "edge"; index: number }>
  | Readonly<{
      kind: "directive";
      name: "layout" | "axis" | "snap" | "rule";
    }>;
export type Act = Readonly<{
  kind: "field" | "number" | "choice" | "toggle";
  label: string;
  value: string;
  choices?: readonly string[];
  change: (value: string) => Change;
}>;
export type Token = Readonly<{
  text: string;
  role:
    | "keyword"
    | "name"
    | "arrow"
    | "label"
    | "number"
    | "route"
    | "flag"
    | "attribute"
    | "value"
    | "plain";
  act?: Act;
}>;
export type Line = Readonly<{
  subject: Subject;
  tokens: readonly Token[];
  ghosts?: readonly Token[];
}>;
const word = (
  text: string,
  role: Token["role"] = "keyword",
  act?: Act,
): Token => ({
  text,
  role,
  ...(act ? { act } : {}),
});
const editNode =
  (
    id: string,
    update: (n: FlowNode) => FlowNode,
  ): Change =>
  (f) => ({
    ...f,
    nodes: f.nodes.map((n) =>
      n.id === id ? update(n) : n,
    ),
  });
const nodeName = (id: string): Token =>
  word(name(id), "name", {
    kind: "field",
    label: "ノード名を変更",
    value: id,
    change: (v) => (flow) => {
      const renamed = renameFlowIdentity(
        flow,
        id,
        v,
      );
      if (renamed === flow) return flow;
      const computed =
        flow.layered?.computed.get(id);
      const positions = new Map(
        flow.layered?.computed,
      );
      positions.delete(id);
      if (computed) positions.set(v, computed);
      return {
        ...renamed,
        ...(flow.layered
          ? {
              layered: {
                ...flow.layered,
                computed: positions,
              },
            }
          : {}),
        nodes: renamed.nodes.map((node) =>
          node.id === v && node.label === id
            ? { ...node, label: v }
            : node,
        ),
      };
    },
  });
const nodeLine = (
  f: Flow,
  n: FlowNode,
  groupIds: readonly string[],
  axisValues: ReadonlyMap<
    string,
    readonly string[]
  >,
): Line => {
  const set = (
    update: (n: FlowNode) => FlowNode,
  ) => editNode(n.id, update);
  const position = f.layered ? String : coord;
  const computed = f.layered?.computed.get(n.id);
  const number = (
    key:
      | "x"
      | "y"
      | "z"
      | "value"
      | "height"
      | "width",
    value: string,
  ) =>
    word(value, "number", {
      kind: "number",
      label: key + " を変更",
      value,
      change: (v) =>
        set((node) =>
          !v.trim() || !Number.isFinite(Number(v))
            ? node
            : key === "x" ||
                key === "y" ||
                key === "z"
              ? {
                  ...node,
                  position: {
                    ...node.position,
                    [key]: Number(v),
                  },
                }
              : { ...node, [key]: Number(v) },
        ),
    });
  const flag = (key: "group" | "collapsed") =>
    word(key, "flag", {
      kind: "toggle",
      label:
        key === "group"
          ? "グループを切り替え"
          : "折りたたみを切り替え",
      value: key,
      change: () =>
        set((node) => ({
          ...node,
          [key]: !node[key],
        })),
    });
  const groups = n.group
    ? groupIds.filter((id) => id !== n.id)
    : groupIds;
  const parent = word(
    name(n.parent ?? "in"),
    "name",
    {
      kind: "choice",
      label: "所属グループを選択",
      value: n.parent ?? "",
      choices: ["", ...groups],
      change: (v) =>
        set((node) => {
          const { parent, ...rest } = node;
          return v
            ? { ...rest, parent: v }
            : rest;
        }),
    },
  );
  return {
    subject: { kind: "node", id: n.id },
    tokens: [
      word("node"),
      nodeName(n.id),
      ...(f.rooms ||
      (computed &&
        computed.x === n.position.x &&
        computed.y === n.position.y &&
        computed.z === n.position.z)
        ? []
        : [
            word("at"),
            number("x", position(n.position.x)),
            number("y", position(n.position.y)),
            ...(Number(position(n.position.z))
              ? [
                  number(
                    "z",
                    position(n.position.z),
                  ),
                ]
              : []),
          ]),
      ...Object.entries(n.data ?? {}).flatMap(
        ([k, v]) => {
          if (typeof v !== "string") return [];
          const choices = axisValues.get(k);
          return [
            word(
              name(k + "=" + v),
              "attribute",
              choices
                ? {
                    kind: "choice",
                    value: v,
                    label: k + " を選択",
                    choices,
                    change: (value) =>
                      set((node) => ({
                        ...node,
                        data: {
                          ...node.data,
                          [k]: value,
                        },
                      })),
                  }
                : undefined,
            ),
          ];
        },
      ),
      ...(n.group ? [flag("group")] : []),
      ...(n.collapsed ? [flag("collapsed")] : []),
      ...(n.parent ? [word("in"), parent] : []),
      ...(n.id !== n.label
        ? [
            word("label"),
            word(quoted(n.label), "label", {
              kind: "field",
              label: "表示名を変更",
              value: n.label,
              change: (label) =>
                set((node) => ({
                  ...node,
                  label,
                })),
            }),
          ]
        : []),
      ...(
        ["value", "height", "width"] satisfies (
          | "value"
          | "height"
          | "width"
        )[]
      ).flatMap((k) =>
        n[k] === undefined
          ? []
          : [word(k), number(k, String(n[k]))],
      ),
      ...(n.grow && (n.grow.x || n.grow.y)
        ? [
            word("grow"),
            word(coord(n.grow.x), "number"),
            word(coord(n.grow.y), "number"),
          ]
        : []),
    ],
    ghosts: [
      ...(!n.group ? [flag("group")] : []),
      ...(!n.collapsed
        ? [flag("collapsed")]
        : []),
      ...(!n.parent && groups.length
        ? [parent]
        : []),
    ],
  };
};
const edgeLine = (
  e: Edge,
  index: number,
): Line => {
  const set =
    (update: (edge: Edge) => Edge): Change =>
    (f) => ({
      ...f,
      edges: f.edges.map((edge, i) =>
        i === index ? update(edge) : edge,
      ),
    });
  const route = word(e.route ?? "step", "route", {
    kind: "choice",
    label: "経路を選択",
    value: e.route ?? "",
    choices: routes,
    change: (v) =>
      set((edge) =>
        isRoute(v) ? { ...edge, route: v } : edge,
      ),
  });
  const animated = word("animated", "flag", {
    kind: "toggle",
    label: "アニメーションを切り替え",
    value: "animated",
    change: () =>
      set((edge) => ({
        ...edge,
        animated: !edge.animated,
      })),
  });
  return {
    subject: { kind: "edge", index },
    tokens: [
      nodeName(e.source),
      word("->", "arrow", {
        kind: "toggle",
        label: "接続を反転",
        value: "->",
        change: () =>
          set((edge) => ({
            ...edge,
            source: edge.target,
            target: edge.source,
          })),
      }),
      nodeName(e.target),
      ...(e.label
        ? [
            word(quoted(e.label), "label", {
              kind: "field",
              label: "接続ラベルを変更",
              value: e.label,
              change: (label) =>
                set((edge) => ({
                  ...edge,
                  label,
                })),
            }),
          ]
        : []),
      ...(e.route ? [route] : []),
      ...(e.animated ? [animated] : []),
    ],
    ghosts: [
      ...(!e.route ? [route] : []),
      ...(!e.animated ? [animated] : []),
    ],
  };
};
const directive = (
  name: Extract<
    Subject,
    { kind: "directive" }
  >["name"],
  tokens: readonly Token[],
  ghosts: readonly Token[] = [],
): Line => ({
  subject: { kind: "directive", name },
  tokens: [word(name), ...tokens],
  ghosts,
});
const layered = (
  key: "direction" | "depth",
  text: string,
): Token =>
  word(text, "flag", {
    kind: "toggle",
    label:
      key === "depth"
        ? "奥行きを切り替え"
        : "配置方向を切り替え",
    value: text,
    change: () => (f) =>
      f.layered
        ? {
            ...f,
            layered: {
              ...f.layered,
              options: {
                ...f.layered.options,
                [key]:
                  key === "depth"
                    ? !f.layered.options.depth
                    : f.layered.options
                          .direction === "right"
                      ? "down"
                      : "right",
              },
            },
          }
        : f,
  });
export const snapToken = (
  snap = grid,
  ghost = false,
): Token => {
  const value = String(snap || "off");
  return word(
    ghost ? "snap " + value : value,
    "value",
    {
      kind: "choice",
      label: "格子間隔を選択",
      value,
      choices: ["off", "8", "16", "32"],
      change: (v) => (f) => ({
        ...f,
        snap: v === "off" ? 0 : Number(v),
      }),
    },
  );
};
export const printLines = (
  flow: Flow,
  rules: readonly Rule[],
): readonly Line[] => {
  const endpoints = new Set(
    flow.edges.flatMap((e) => [
      e.source,
      e.target,
    ]),
  );
  const axisValues = new Map(
    Object.values(flow.rooms?.axes ?? {}).map(
      (axis) => [
        axis.attribute,
        [
          ...new Set([
            ...axis.values,
            ...flow.nodes.flatMap((n) => {
              const v = n.data?.[axis.attribute];
              return typeof v === "string"
                ? [v]
                : [];
            }),
          ]),
        ],
      ],
    ),
  );
  const groups = flow.nodes
    .filter((n) => n.group)
    .map((n) => n.id);
  const options = flow.layered?.options;
  const depth = layered("depth", "depth"),
    direction = layered(
      "direction",
      options?.direction ?? "right",
    );
  return [
    ...(flow.rooms
      ? [
          directive("layout", [word("rooms")]),
          ...Object.entries(
            flow.rooms.axes,
          ).flatMap(([dir, axis]) => {
            if (
              dir !== "x" &&
              dir !== "y" &&
              dir !== "z"
            )
              return [];
            return [
              directive("axis", [
                word(dir, "value", {
                  kind: "toggle",
                  label: "分類軸を回転",
                  value: dir,
                  change: () => (f) => {
                    if (!f.rooms) return f;
                    const next =
                      dir === "x"
                        ? "y"
                        : dir === "y"
                          ? "z"
                          : "x";
                    const axes = Object.entries(
                      f.rooms.axes,
                    ).reduce<RoomAxes>(
                      (axes, [letter, axis]) => ({
                        ...axes,
                        [letter === dir
                          ? next
                          : letter === next
                            ? dir
                            : letter]: axis,
                      }),
                      {},
                    );
                    return {
                      ...f,
                      rooms: { ...f.rooms, axes },
                    };
                  },
                }),
                word(
                  name(axis.attribute),
                  "attribute",
                ),
                ...axis.values.map((v) =>
                  word(name(v), "value"),
                ),
              ]),
            ];
          }),
        ]
      : []),
    ...(options
      ? [
          directive(
            "layout",
            [
              word("layered"),
              ...(options.direction
                ? [direction]
                : []),
              ...(options.depth ? [depth] : []),
            ],
            [
              ...(!options.direction
                ? [direction]
                : []),
              ...(!options.depth ? [depth] : []),
            ],
          ),
        ]
      : []),
    ...(flow.snap === undefined ||
    flow.snap === grid
      ? []
      : [
          directive("snap", [
            snapToken(flow.snap),
          ]),
        ]),
    ...rules.map((r) =>
      directive(
        "rule",
        r.kind === "acyclic"
          ? [word(r.kind)]
          : [
              word(r.kind),
              word(String(r.limit), "number"),
            ],
      ),
    ),
    ...flow.nodes
      .map((n) =>
        nodeLine(flow, n, groups, axisValues),
      )
      .filter(
        (l) =>
          l.subject.kind === "node" &&
          (l.tokens.length > 2 ||
            !endpoints.has(l.subject.id)),
      ),
    ...flow.edges.map(edgeLine),
  ];
};
export const joinLine = (line: Line) =>
  line.tokens.map((t) => t.text).join(" ");
export const printSpec = (
  flow: Flow,
  rules: readonly Rule[],
) =>
  printLines(flow, rules)
    .map(joinLine)
    .join("\n");
export const subjectSelected = (
  s: Subject,
  f: Flow,
) =>
  s.kind === "node"
    ? selectedNodes(f).includes(s.id)
    : s.kind === "edge" &&
      selectedEdges(f).some(
        (e) => edgeIndex(f.edges, e) === s.index,
      );
export const selectSubject =
  (s: Subject, add: boolean): Change =>
  (f) => {
    if (s.kind === "directive") return f;
    if (s.kind === "node")
      return selectNodes(
        [...(add ? selectedNodes(f) : []), s.id],
        add,
      )(f);
    const edge = f.edges[s.index];
    return edge
      ? chooseEdges([
          ...new Set([
            ...(add ? selectedEdges(f) : []),
            edge,
          ]),
        ])(add ? f : selectNodes([])(f))
      : f;
  };
