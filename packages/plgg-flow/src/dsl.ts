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
  placeOnLayers,
  roles,
  type Axis,
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
  const definitions: Axis[] = [];
  const axisLines: string[] = [];
  const assignments = new Map<string, string>();
  const pins = new Map<string, string>();
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
      const words = ts
        .slice(1)
        .map((t) => t.text);
      const legacy =
        ["x", "y", "z"].includes(
          words[0] ?? "",
        ) &&
        words.length >= 2 &&
        !ts[1]?.quoted;
      const role = legacy
        ? words.shift()
        : undefined;
      const attribute = words.shift();
      if (
        !attribute ||
        definitions.some(
          (a) => a.attribute === attribute,
        )
      )
        return err(at + "axis 属性 [値…]");
      axisLines.push(at);
      definitions.push({
        attribute,
        values: words,
      });
      if (role) assignments.set(attribute, role);
    } else if (head === "view") {
      for (const t of ts.slice(1)) {
        const [role, attribute, ...value] =
          t.text.split("=");
        if (
          !attribute ||
          (!roles.some((r) => r === role) &&
            role !== "layer" &&
            role !== "pin")
        )
          return err(
            at + "view x=属性 / pin=属性=値",
          );
        assignments.set(attribute, role!);
        if (role === "pin" && value.length)
          pins.set(attribute, value.join("="));
      }
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
  if (layout && definitions.length) {
    if (definitions.length > 1)
      return err(
        axisLines[1] +
          "layered は軸を1つだけ指定できます",
      );
    if (layout.depth)
      return err(
        axisLines[0] +
          "depth と layer 軸は併用できません",
      );
    const layerAxis = definitions[0]!;
    if (
      [...assignments.values()].some(
        (role) => role !== "layer",
      )
    )
      return err(
        axisLines[0] +
          "layered の軸の役割は layer です",
      );
    layout = { ...layout, layerAxis };
  } else if (
    [...assignments.values()].includes("layer")
  )
    return err(
      "view layer は layout layered の指定です",
    );
  const axes: Record<
    string,
    Axis & { pin?: string }
  > = {};
  for (const attribute of assignments.keys())
    if (
      !definitions.some(
        (a) => a.attribute === attribute,
      )
    )
      return err("未定義の軸 " + attribute);
  for (const [i, a] of definitions.entries()) {
    const role =
      assignments.get(a.attribute) ??
      roles[i] ??
      "pin";
    const key =
      role === "pin"
        ? "pin:" + a.attribute
        : role;
    if (axes[key])
      return err("軸の役割が重複 " + role);
    const pin = pins.get(a.attribute);
    axes[key] = {
      ...a,
      ...(pin !== undefined && { pin }),
    };
  }
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
        camera: {
          ...flow.camera,
          perspective: false,
        },
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
    const positioned = spec.graph.nodes.map(
      (n) => ({
        ...n,
        position:
          computed.get(n.id) ?? n.position,
      }),
    );
    const axis = spec.layout?.layerAxis;
    const lifted =
      axis &&
      placeOnLayers(
        {
          nodes: positioned,
          edges: spec.graph.edges.map(
            (e, i) => routed.get(i) ?? e,
          ),
        },
        axis,
        spec.layout?.direction ?? "right",
      );
    for (const n of lifted?.graph.nodes ?? [])
      if (computed.has(n.id))
        computed.set(n.id, n.position);
    return {
      ...rest,
      ...spec.graph,
      ...(rooms && {
        camera: {
          ...flow.camera,
          perspective: 0,
        },
      }),
      ...(spec.layout
        ? {
            ...(axis && {
              camera: {
                ...flow.camera,
                perspective: false,
                ...(!layered?.options
                  .layerAxis && {
                  yaw: -0.5,
                  pitch: 0.35,
                }),
              },
            }),
            edges:
              lifted?.graph.edges ??
              spec.graph.edges.map(
                (e, i) => routed.get(i) ?? e,
              ),
            layered: {
              options: spec.layout,
              computed,
            },
            nodes:
              lifted?.graph.nodes ?? positioned,
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
      name:
        | "layout"
        | "axis"
        | "view"
        | "snap"
        | "rule";
    }>;
export type Line = Readonly<{
  subject: Subject;
  text: string;
}>;

export const placedByLayout = (
  flow: Flow,
  node: FlowNode,
) => {
  const p = flow.layered?.computed.get(node.id);
  return (
    !!flow.rooms ||
    !!(
      p &&
      p.x === node.position.x &&
      p.y === node.position.y &&
      p.z === node.position.z
    )
  );
};
const nodeWords = (f: Flow, n: FlowNode) => {
  const position = f.layered ? String : coord;
  return [
    "node",
    name(n.id),
    ...(placedByLayout(f, n)
      ? []
      : [
          "at",
          position(n.position.x),
          position(n.position.y),
          ...(Number(position(n.position.z))
            ? [position(n.position.z)]
            : []),
        ]),
    ...Object.entries(n.data ?? {}).flatMap(
      ([k, v]) =>
        typeof v === "string"
          ? [name(k + "=" + v)]
          : [],
    ),
    ...(n.group ? ["group"] : []),
    ...(n.collapsed ? ["collapsed"] : []),
    ...(n.parent ? ["in", name(n.parent)] : []),
    ...(n.id !== n.label
      ? ["label", quoted(n.label)]
      : []),
    ...(
      [
        "value",
        "height",
        "width",
      ] satisfies (keyof FlowNode)[]
    ).flatMap((k) =>
      n[k] === undefined ? [] : [k, String(n[k])],
    ),
    ...(n.grow && (n.grow.x || n.grow.y)
      ? ["grow", coord(n.grow.x), coord(n.grow.y)]
      : []),
  ];
};
const directive = (
  key: Extract<
    Subject,
    { kind: "directive" }
  >["name"],
  words: readonly string[],
): Line => ({
  subject: { kind: "directive", name: key },
  text: [key, ...words].join(" "),
});
const buildLines = (
  flow: Flow,
  rules: readonly Rule[],
): readonly Line[] => {
  const endpoints = new Set(
    flow.edges.flatMap((e) => [
      e.source,
      e.target,
    ]),
  );
  const options = flow.layered?.options;
  return [
    ...(flow.rooms
      ? [
          directive("layout", ["rooms"]),
          ...Object.entries(flow.rooms.axes).map(
            ([, axis]) =>
              directive("axis", [
                ["x", "y", "z"].includes(
                  axis.attribute,
                )
                  ? JSON.stringify(axis.attribute)
                  : name(axis.attribute),
                ...axis.values.map(name),
              ]),
          ),
          ...(Object.entries(
            flow.rooms.axes,
          ).some(
            ([key, a], i) =>
              key !==
                (roles[i] ??
                  "pin:" + a.attribute) ||
              (a.pin !== undefined &&
                a.pin !== a.values[0]),
          )
            ? [
                directive(
                  "view",
                  Object.entries(
                    flow.rooms.axes,
                  ).map(([key, a]) =>
                    name(
                      key.startsWith("pin:")
                        ? "pin=" +
                            a.attribute +
                            (a.pin === undefined
                              ? ""
                              : "=" + a.pin)
                        : key + "=" + a.attribute,
                    ),
                  ),
                ),
              ]
            : []),
        ]
      : []),
    ...(options
      ? [
          directive("layout", [
            "layered",
            ...(options.direction
              ? [options.direction]
              : []),
            ...(options.depth ? ["depth"] : []),
          ]),
          ...(options.layerAxis
            ? [
                directive("axis", [
                  name(
                    options.layerAxis.attribute,
                  ),
                  ...options.layerAxis.values.map(
                    name,
                  ),
                ]),
              ]
            : []),
        ]
      : []),
    ...(flow.snap === undefined ||
    flow.snap === grid
      ? []
      : [
          directive("snap", [
            String(flow.snap || "off"),
          ]),
        ]),
    ...rules.map((r) =>
      directive(
        "rule",
        r.kind === "acyclic"
          ? [r.kind]
          : [r.kind, String(r.limit)],
      ),
    ),
    ...flow.nodes.flatMap((n): Line[] => {
      const words = nodeWords(flow, n);
      return words.length > 2 ||
        !endpoints.has(n.id)
        ? [
            {
              subject: { kind: "node", id: n.id },
              text: words.join(" "),
            },
          ]
        : [];
    }),
    ...flow.edges.map(
      (e, index): Line => ({
        subject: { kind: "edge", index },
        text: [
          name(e.source),
          "->",
          name(e.target),
          ...(e.label ? [quoted(e.label)] : []),
          ...(e.route ? [e.route] : []),
          ...(e.animated ? ["animated"] : []),
        ].join(" "),
      }),
    ),
  ];
};
export const joinLine = (line: Line) => line.text;
const printed = new WeakMap<
  Flow["nodes"],
  {
    inputs: readonly unknown[];
    lines: readonly Line[];
    source: string;
  }
>();
const printedSheet = (
  flow: Flow,
  rules: readonly Rule[],
) => {
  const inputs = [
    flow.edges,
    flow.rooms?.axes,
    flow.layered,
    flow.snap,
    rules,
  ];
  const known = printed.get(flow.nodes);
  if (
    known &&
    inputs.every((v, i) => known.inputs[i] === v)
  )
    return known;
  const lines = buildLines(flow, rules);
  const sheet = {
    inputs,
    lines,
    source: lines.map(joinLine).join("\n"),
  };
  printed.set(flow.nodes, sheet);
  return sheet;
};
export const printLines = (
  flow: Flow,
  rules: readonly Rule[],
) => printedSheet(flow, rules).lines;
export const printSpec = (
  flow: Flow,
  rules: readonly Rule[],
) => printedSheet(flow, rules).source;
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
