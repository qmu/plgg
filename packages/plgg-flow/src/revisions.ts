import { neighborhood } from "plgg-flow/analysis";
import {
  pipe,
  isErr,
  isOk,
  err,
  ok,
  fromNullable,
  matchOption,
  mapResult,
  isSome,
  none,
  some,
  type Option,
  type Result,
} from "plgg";
import type {
  Graph,
  FlowNode,
  Edge,
} from "./model";
import { inspectGraph } from "plgg-flow/interchange";

export type RevisionEdit<T> = Readonly<{
  key: string;
  before: Option<T>;
  after: Option<T>;
}>;
export type Patch = Readonly<{
  nodes: readonly RevisionEdit<FlowNode>[];
  edges: readonly RevisionEdit<Edge>[];
}>;
export type Conflict = Readonly<{
  kind: "node" | "edge" | "graph";
  key: string;
  reason: string;
}>;
const nodeKey = (node: FlowNode) => node.id;
const edgeKey = (edge: Edge) =>
  edge.id !== undefined
    ? JSON.stringify(["id", edge.id])
    : JSON.stringify([
        "ends",
        edge.source,
        edge.sourceHandle ?? null,
        edge.target,
        edge.targetHandle ?? null,
      ]);
/** Field order in imported JSON has no effect on revision comparisons. */
const equivalent = (
  a: unknown,
  b: unknown,
): boolean => {
  if (a === b) return true;
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  )
    return false;
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => equivalent(v, b[i]))
    );
  const left = Object.entries(a).filter(
      ([, v]) => v !== undefined,
    ),
    right = new Map(
      Object.entries(b).filter(
        ([, v]) => v !== undefined,
      ),
    );
  return (
    left.length === right.size &&
    left.every(
      ([k, v]) =>
        right.has(k) &&
        equivalent(v, right.get(k)),
    )
  );
};
const index = <T>(
  list: readonly T[],
  key: (item: T) => string,
) =>
  new Map(list.map((item) => [key(item), item]));
const lookup = <T>(
  map: Map<string, T>,
  key: string,
): Option<T> => {
  const value = map.get(key);
  return value === undefined
    ? none()
    : some(value);
};
const differences = <T>(
  base: readonly T[],
  next: readonly T[],
  key: (item: T) => string,
): readonly RevisionEdit<T>[] => {
  const left = index(base, key),
    right = index(next, key),
    changes: RevisionEdit<T>[] = [];
  for (const id of new Set([
    ...left.keys(),
    ...right.keys(),
  ])) {
    const before = lookup(left, id),
      after = lookup(right, id);
    if (!equivalent(before, after))
      changes.push({ key: id, before, after });
  }
  return changes;
};
export const diffGraph = (
  base: Graph,
  next: Graph,
): Result<Patch, string> => {
  for (const graph of [base, next]) {
    if (
      index(graph.nodes, nodeKey).size !==
        graph.nodes.length ||
      index(graph.edges, edgeKey).size !==
        graph.edges.length
    )
      return err(
        "Revision tracking requires unique node and edge identities",
      );
  }
  return ok({
    nodes: differences(
      base.nodes,
      next.nodes,
      nodeKey,
    ),
    edges: differences(
      base.edges,
      next.edges,
      edgeKey,
    ),
  });
};
const inverted = <T>(
  e: RevisionEdit<T>,
): RevisionEdit<T> => ({
  ...e,
  before: e.after,
  after: e.before,
});
export const invertPatch = (
  patch: Patch,
): Patch => ({
  nodes: patch.nodes.map(inverted),
  edges: patch.edges.map(inverted),
});
/** Apply atomically; repeated deliveries and independent edits converge. */
export const applyPatch = (
  current: Graph,
  patch: Patch,
): Result<Graph, readonly Conflict[]> => {
  const conflicts: Conflict[] = [];
  const update = <T>(
    list: readonly T[],
    changes: readonly RevisionEdit<T>[],
    key: (t: T) => string,
    kind: "node" | "edge",
  ) => {
    const table = index(list, key);
    if (table.size !== list.length) {
      conflicts.push({
        kind,
        key: "",
        reason: "Duplicate identity",
      });
      return list;
    }
    for (const change of changes) {
      const local = lookup(table, change.key);
      if (equivalent(local, change.after))
        continue;
      if (!equivalent(local, change.before)) {
        conflicts.push({
          kind,
          key: change.key,
          reason: "Concurrent edit",
        });
        continue;
      }
      if (isSome(change.after)) {
        if (
          key(change.after.content) !== change.key
        ) {
          conflicts.push({
            kind,
            key: change.key,
            reason: "Identity mismatch",
          });
          continue;
        }
        table.set(
          change.key,
          change.after.content,
        );
      } else table.delete(change.key);
    }
    return [...table.values()];
  };
  const graph = {
    nodes: update(
      current.nodes,
      patch.nodes,
      nodeKey,
      "node",
    ),
    edges: update(
      current.edges,
      patch.edges,
      edgeKey,
      "edge",
    ),
  };
  for (const reason of inspectGraph(graph))
    conflicts.push({
      kind: "graph",
      key: "",
      reason,
    });
  return conflicts.length
    ? err(conflicts)
    : ok(graph);
};
export const mergeRevision = (
  base: Graph,
  local: Graph,
  remote: Graph,
): Result<Graph, readonly Conflict[]> => {
  const result = diffGraph(base, remote);
  return result.__tag === "Err"
    ? err([
        {
          kind: "graph",
          key: "",
          reason: result.content,
        },
      ])
    : applyPatch(local, result.content);
};
export const summarizePatch = (
  patch: Patch,
): readonly string[] => {
  const describe = <T>(
    label: string,
    e: RevisionEdit<T>,
  ) =>
    (!isSome(e.before)
      ? "+"
      : !isSome(e.after)
        ? "−"
        : "~") +
    " " +
    label +
    " " +
    e.key;
  return [
    ...patch.nodes.map((e) =>
      describe("node", e),
    ),
    ...patch.edges.map((e) =>
      describe("edge", e),
    ),
  ];
};

/** Extract a review drawing containing changed cards, before/after wiring
 * and the ancestors needed to interpret them. Deleted cards use base geometry. */
export const revisionDrawing = (
  base: Graph,
  current: Graph,
): Result<Graph, string> => {
  const patch = diffGraph(base, current);
  if (isErr(patch)) return err(patch.content);
  const cards = new Map(
    [...base.nodes, ...current.nodes].map((n) => [
      n.id,
      n,
    ]),
  );
  const included = new Set<string>(),
    labels = new Map<string, string>();
  for (const edit of patch.content.nodes) {
    included.add(edit.key);
    labels.set(
      edit.key,
      !isSome(edit.before)
        ? "追加"
        : !isSome(edit.after)
          ? "削除"
          : "変更",
    );
  }
  const edges: Edge[] = [];
  const wire = (edge: Edge, status: string) => {
    included.add(edge.source);
    included.add(edge.target);
    edges.push({
      ...edge,
      id: "review-" + (edges.length + 1),
      hidden: false,
      label:
        status +
        " · " +
        (edge.label ??
          edge.id ??
          edge.source + " → " + edge.target),
    });
  };
  for (const edit of patch.content.edges) {
    if (isSome(edit.before))
      wire(
        edit.before.content,
        isSome(edit.after) ? "変更前" : "削除",
      );
    if (isSome(edit.after))
      wire(
        edit.after.content,
        isSome(edit.before) ? "変更後" : "追加",
      );
  }
  for (const id of included) {
    const parent = cards.get(id)?.parent;
    if (parent !== undefined)
      included.add(parent);
  }
  const nodes: FlowNode[] = [];
  for (const id of included) {
    const node = cards.get(id);
    if (node)
      nodes.push({
        ...node,
        label:
          (labels.get(id) ?? "参照") +
          " · " +
          node.label,
        hidden: false,
        collapsed: false,
      });
  }
  return ok({ nodes, edges });
};

/** A field a card always has. */
type Required = "label" | "position";
/** A field a card may lack. */
type Optional =
  | "width"
  | "height"
  | "origin"
  | "type"
  | "data"
  | "value";
const settings: readonly (Required | Optional)[] =
  ["label", "type", "data", "value"];
const geometry: readonly (Required | Optional)[] =
  ["position", "width", "height", "origin"];
const fieldsOf = (
  mode: "settings" | "geometry" | "both",
): readonly (Required | Optional)[] => [
  ...(mode !== "geometry" ? settings : []),
  ...(mode !== "settings" ? geometry : []),
];
const without = (
  key: Optional,
  { [key]: _gone, ...rest }: FlowNode,
): FlowNode => rest;
/** One field as the baseline had it: its value there,
 * or absent as it was there. A field keeps its place
 * among the card's fields. */
const fieldFrom =
  (old: FlowNode) =>
  (
    node: FlowNode,
    key: Required | Optional,
  ): FlowNode =>
    key === "label" || key === "position"
      ? { ...node, [key]: old[key] }
      : old[key] === undefined
        ? without(key, node)
        : { ...node, [key]: old[key] };
const restoredCard =
  (
    originals: ReadonlyMap<string, FlowNode>,
    selected: ReadonlySet<string>,
    fields: readonly (Required | Optional)[],
  ) =>
  (node: FlowNode): Result<FlowNode, string> =>
    !selected.has(node.id)
      ? ok(node)
      : pipe(
          fromNullable(originals.get(node.id)),
          matchOption(
            (): Result<FlowNode, string> =>
              err(
                "基準版に存在しないカード：" +
                  node.id,
              ),
            (old: FlowNode) =>
              ok(
                fields.reduce(
                  fieldFrom(old),
                  node,
                ),
              ),
          ),
        );
/** Every card when all are sound; the first refusal
 * otherwise. */
const allCards = (
  results: readonly Result<FlowNode, string>[],
): Result<readonly FlowNode[], string> =>
  pipe(
    fromNullable(
      results.flatMap((r) =>
        isErr(r) ? [r.content] : [],
      )[0],
    ),
    matchOption(
      (): Result<readonly FlowNode[], string> =>
        ok(
          results.flatMap((r) =>
            isOk(r) ? [r.content] : [],
          ),
        ),
      (refusal: string) => err(refusal),
    ),
  );
/** Revert selected fields on existing cards, including fields absent in the
 * baseline. Identity, ownership and connection contracts stay in the current revision. */
export const restoreCardFields = (
  base: Graph,
  current: Graph,
  ids: readonly string[],
  mode: "settings" | "geometry" | "both",
): Result<Graph, string> =>
  pipe(
    allCards(
      current.nodes.map(
        restoredCard(
          index(base.nodes, nodeKey),
          new Set(ids),
          fieldsOf(mode),
        ),
      ),
    ),
    mapResult(
      (nodes: readonly FlowNode[]): Graph => ({
        ...current,
        nodes,
      }),
    ),
  );

/** Compare world displacement and movement relative to the same parent.
 * A reparented card has no shared parent frame for the latter comparison. */
export const layoutDisplacements = (
  base: Graph,
  current: Graph,
) => {
  const before = index(base.nodes, nodeKey),
    after = index(current.nodes, nodeKey);
  const rows = current.nodes.flatMap((n) => {
    const old = before.get(n.id);
    if (!old) return [];
    const dx = n.position.x - old.position.x,
      dy = n.position.y - old.position.y,
      dz = n.position.z - old.position.z;
    const distance = Math.hypot(dx, dy, dz);
    const a =
        old.parent === undefined
          ? undefined
          : before.get(old.parent),
      b =
        n.parent === undefined
          ? undefined
          : after.get(n.parent);
    const relative =
      old.parent !== n.parent
        ? undefined
        : Math.hypot(
            dx -
              (b?.position.x ?? 0) +
              (a?.position.x ?? 0),
            dy -
              (b?.position.y ?? 0) +
              (a?.position.y ?? 0),
            dz -
              (b?.position.z ?? 0) +
              (a?.position.z ?? 0),
          );
    return distance ||
      relative ||
      old.parent !== n.parent
      ? [
          {
            id: n.id,
            dx,
            dy,
            dz,
            distance,
            relative,
          },
        ]
      : [];
  });
  return rows.sort(
    (a, b) => b.distance - a.distance,
  );
};

/** Compare downstream reachability from a common origin, including destinations
 * added or deleted between versions. Alternate paths preserve reachability. */
export const compareReachability = (
  base: Graph,
  current: Graph,
  start: string,
): Result<
  { gained: string[]; lost: string[] },
  string
> => {
  if (
    ![base, current].every((g) =>
      g.nodes.some((n) => n.id === start),
    )
  )
    return err(
      "両方の図面に存在する起点を選択してください",
    );
  const before = neighborhood(
      base,
      [start],
      Infinity,
    ),
    after = neighborhood(
      current,
      [start],
      Infinity,
    );
  return ok({
    gained: [...after].filter(
      (id) => !before.has(id),
    ),
    lost: [...before].filter(
      (id) => !after.has(id),
    ),
  });
};
