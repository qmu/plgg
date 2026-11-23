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
}>;

const tokens = (line: string) =>
  Array.from(
    line.matchAll(/"([^"]*)"|(\S+)/g),
    (m) =>
      m[1] !== undefined
        ? { quoted: true, text: m[1] }
        : { quoted: false, text: m[2] ?? "" },
  );
type Token = ReturnType<typeof tokens>[number];

const num = (
  t: Token | undefined,
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
  ts: readonly Token[],
): Result<FlowNode, string> => {
  const id = ts[1];
  if (!id) return err("node の名前がありません");
  let node: FlowNode = {
    id: id.text,
    label: id.text,
    position: { x: 0, y: 0, z: 0 },
  };
  let i = 2;
  while (i < ts.length) {
    const word = ts[i]?.text;
    if (word === "at") {
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
    } else if (
      word === "value" ||
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
          : { ...node, width: v };
      i += 2;
    } else
      return err(
        `${id.text}: 不明な指定「${word ?? ""}」`,
      );
  }
  return ok(node);
};

const parseEdge = (
  ts: readonly Token[],
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
  let snap: number | undefined;
  const lines = source.split("\n");
  for (const [n, raw] of lines.entries()) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const ts = tokens(line),
      head = ts[0]?.text,
      at = `${n + 1} 行目: `;
    if (head === "node") {
      const r = parseNode(ts);
      if (r.__tag === "Err")
        return err(at + r.content);
      nodes.push(r.content);
    } else if (ts[1]?.text === "->") {
      const r = parseEdge(ts);
      if (r.__tag === "Err")
        return err(at + r.content);
      edges.push(r.content);
    } else if (head === "snap") {
      snap = num(ts[1]);
      if (snap === undefined)
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
  const stray = [
    ...edges.flatMap((e) => [e.source, e.target]),
    ...nodes.flatMap((x) =>
      x.parent ? [x.parent] : [],
    ),
  ].find((id) => !ids.has(id));
  if (stray !== undefined)
    return err(`未定義のノード「${stray}」`);
  return ok({
    graph: { nodes, edges },
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
export const applySpec =
  (spec: Spec) =>
  (flow: Flow): Flow => {
    const { allowConnection, snap, ...rest } =
      flow;
    return {
      ...rest,
      ...spec.graph,
      ...allow(spec.rules),
      ...(spec.snap === undefined
        ? {}
        : { snap: spec.snap }),
    };
  };

export const specFlow = (spec: Spec): Flow =>
  applySpec(spec)(createFlow(spec.graph));

const name = (s: string) =>
  /^[^\s"#]+$/.test(s) && s !== "->"
    ? s
    : `"${s}"`;
const coord = (n: number) =>
  String(Math.round(n));

export const printSpec = (
  flow: Flow,
  rules: readonly Rule[],
): string =>
  [
    ...(flow.snap ? [`snap ${flow.snap}`] : []),
    ...rules.map((r) =>
      r.kind === "acyclic"
        ? "rule acyclic"
        : `rule max-outputs ${r.limit}`,
    ),
    ...flow.nodes.map((n) =>
      [
        "node",
        name(n.id),
        "at",
        coord(n.position.x),
        coord(n.position.y),
        ...(Math.round(n.position.z)
          ? [coord(n.position.z)]
          : []),
        ...(n.group ? ["group"] : []),
        ...(n.collapsed ? ["collapsed"] : []),
        ...(n.parent
          ? ["in", name(n.parent)]
          : []),
        ...(n.label !== n.id
          ? ["label", `"${n.label}"`]
          : []),
        ...(n.value === undefined
          ? []
          : ["value", String(n.value)]),
        ...(n.width === undefined
          ? []
          : ["width", coord(n.width)]),
      ].join(" "),
    ),
    ...flow.edges.map((e) =>
      [
        name(e.source),
        "->",
        name(e.target),
        ...(e.label ? [`"${e.label}"`] : []),
        ...(e.route ? [e.route] : []),
        ...(e.animated ? ["animated"] : []),
      ].join(" "),
    ),
  ].join("\n");
