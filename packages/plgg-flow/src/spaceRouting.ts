import type { Point3 } from "plgg-board";
import type { Graph, FlowNode } from "./model";
import { nodeSize } from "plgg-flow/nodeSize";
import { bodyDepth } from "plgg-flow/nodeBody";
import { aisleRuns } from "plgg-flow/path3";
type Bounds = { min: Point3; max: Point3 };
type RouteCell = Bounds & {
  block: number;
  members: readonly string[];
};
const shift = (
  p: Point3,
  k: keyof Point3,
  value: number,
) => ({
  x: k === "x" ? value : p.x,
  y: k === "y" ? value : p.y,
  z: k === "z" ? value : p.z,
});
export const routeAssignment = (
  graph: Graph,
  cells: readonly RouteCell[],
  sizes: (n: FlowNode) => {
    width: number;
    height: number;
  } = nodeSize,
  moved?: ReadonlySet<string>,
  initial?: {
    routes: Map<string | number, Point3[]>;
    cost: number;
  },
) => {
  const axes = [
    "x",
    "y",
    "z",
  ] satisfies (keyof Point3)[];
  const members = new Set(
    cells.flatMap((c) => c.members),
  );
  // A stack of equal horizontal footprints has clear risers around its rim.
  const board = cells[0];
  const stack =
    board &&
    cells.length > 1 &&
    cells.every(
      (c) =>
        c.block === board.block &&
        c.min.x === board.min.x &&
        c.max.x === board.max.x &&
        c.min.z === board.min.z &&
        c.max.z === board.max.z,
    )
      ? board
      : undefined;
  const boxes = graph.nodes
    .filter((n) => members.has(n.id))
    .map((n) => ({
      id: n.id,
      p: n.position,
      x: sizes(n).width / 2,
      y: sizes(n).height / 2,
      z: bodyDepth(n),
    }));
  const byId = new Map(
    boxes.map((b) => [b.id, b]),
  );
  const routes = new Map<
    string | number,
    Point3[]
  >();
  const occupied: ReturnType<typeof aisleRuns> =
    [];
  const owners: (typeof graph.edges)[number][] =
    [];
  const reserve = (
    path: readonly Point3[],
    edge: (typeof graph.edges)[number],
  ) => {
    for (const run of aisleRuns(path)) {
      occupied.push(run);
      owners.push(edge);
    }
  };
  const ordered = graph.edges
    .map((edge, i) => ({ edge, i }))
    .filter(({ edge }) => {
      if (
        !moved ||
        moved.has(edge.source) ||
        moved.has(edge.target)
      )
        return true;
      if (edge.path) reserve(edge.path, edge);
      return false;
    })
    .sort(
      (a, b) =>
        a.edge.source.localeCompare(
          b.edge.source,
        ) ||
        a.edge.target.localeCompare(
          b.edge.target,
        ) ||
        String(a.edge.id).localeCompare(
          String(b.edge.id),
        ),
    );
  let total = initial?.cost ?? 0;
  if (initial)
    for (const { edge, i } of ordered) {
      const path = initial.routes.get(
        edge.id ?? i,
      );
      if (path) {
        reserve(path, edge);
        routes.set(edge.id ?? i, path);
      }
    }
  for (const { edge, i } of ordered) {
    const a = byId.get(edge.source),
      b = byId.get(edge.target);
    if (!a || !b || a === b) continue;
    let best: Point3[] | undefined,
      cost = Infinity;
    const previous = initial?.routes.get(
      edge.id ?? i,
    );
    if (previous) {
      for (let j = owners.length - 1; j >= 0; j--)
        if (owners[j] === edge) {
          owners.splice(j, 1);
          occupied.splice(j, 1);
        }
    }
    const scorePath = (path: Point3[]) => {
      const runs = aisleRuns(path);
      let score = (runs.length - 1) * 10000;
      if (score >= cost && cost < 1000000) return;
      for (const r of runs) {
        const k = r.axis,
          u = k === "x" ? "y" : "x",
          v = k === "z" ? "y" : "z";
        if (
          boxes.some(
            (q) =>
              q !== a &&
              q !== b &&
              Math.abs(r.start[u] - q.p[u]) <
                q[u] + 6 &&
              Math.abs(r.start[v] - q.p[v]) <
                q[v] + 6 &&
              r.lo < q.p[k] + q[k] + 6 &&
              r.hi > q.p[k] - q[k] - 6,
          )
        )
          return;
        score += r.hi - r.lo;
        for (
          let j = 0;
          j < occupied.length;
          j++
        ) {
          const t = occupied[j]!,
            l = t.axis;
          if (k === l) {
            if (
              r.lo < t.hi &&
              t.lo < r.hi &&
              (r.start[u] - t.start[u]) ** 2 +
                (r.start[v] - t.start[v]) ** 2 <
                64
            )
              return;
          } else if (
            t.start[k] > r.lo &&
            t.start[k] < r.hi &&
            r.start[l] > t.lo &&
            r.start[l] < t.hi
          ) {
            const peer = owners[j]!;
            if (
              peer.source !== a.id &&
              peer.target !== a.id &&
              peer.source !== b.id &&
              peer.target !== b.id
            )
              score += 1000000;
          }
        }
        if (score >= cost) return;
      }
      cost = score;
      best = path;
    };
    if (previous) scorePath(previous);
    const oldCost = cost;
    if (previous && oldCost < 1000000) {
      reserve(previous, edge);
      continue;
    }
    const consider = (raw: Point3[]) => {
      const path: Point3[] = [];
      for (const p of raw) {
        const b = path[path.length - 1],
          a = path[path.length - 2];
        if (
          b &&
          p.x === b.x &&
          p.y === b.y &&
          p.z === b.z
        )
          continue;
        if (
          a &&
          b &&
          ((a.x === b.x &&
            b.x === p.x &&
            a.y === b.y &&
            b.y === p.y) ||
            (a.x === b.x &&
              b.x === p.x &&
              a.z === b.z &&
              b.z === p.z) ||
            (a.y === b.y &&
              b.y === p.y &&
              a.z === b.z &&
              b.z === p.z))
        )
          path.pop();
        path.push(p);
      }
      if (
        path.length < 2 ||
        (path.length - 2) * 10000 >= cost
      )
        return;
      for (const index of [0, path.length - 1]) {
        const box = index === 0 ? a : b,
          end = path[index]!,
          next =
            path[index === 0 ? 1 : index - 1]!;
        const k =
          end.x !== next.x
            ? "x"
            : end.y !== next.y
              ? "y"
              : "z";
        const direction = Math.sign(
          next[k] - end[k],
        );
        if (
          (next[k] - box.p[k]) * direction <=
          box[k]
        )
          return;
        path[index] = shift(
          end,
          k,
          box.p[k] + direction * box[k],
        );
      }
      scorePath(path);
    };
    const candidates = (
      s: Point3,
      t: Point3,
      detour: boolean,
    ) => {
      for (const k of axes)
        for (const l of axes) {
          if (l === k) continue;

          const via = shift(s, k, t[k]);
          if (!detour)
            consider([
              s,
              via,
              shift(via, l, t[l]),
              t,
            ]);
          if (!detour) continue;
          for (const level of [
            (s[k] + t[k]) / 2,
            s[k] + a[k] + 16,
            s[k] - a[k] - 16,
            t[k] + b[k] + 16,
            t[k] - b[k] - 16,
            ...(stack && k !== "y" && s.y !== t.y
              ? [
                  stack.min[k] - 8,
                  stack.max[k] + 8,
                ]
              : []),
          ]) {
            const start = shift(s, k, level),
              end = shift(t, k, level);
            consider([
              s,
              start,
              shift(start, l, t[l]),
              end,
              t,
            ]);
          }
        }
    };
    candidates(a.p, b.p, false);
    if (!best || cost >= 1000000)
      candidates(a.p, b.p, true);
    if (stack && a.p.y !== b.p.y && !best) {
      for (const k of ["x", "z"] satisfies (
        | "x"
        | "z"
      )[]) {
        const l = k === "x" ? "z" : "x";
        for (const level of [
          stack.min[k] - 8,
          stack.max[k] + 8,
        ]) {
          for (const offset of [
            0, 8, -8, 16, -16,
          ]) {
            if (
              Math.abs(offset) >=
              Math.min(a[l], b[l])
            )
              continue;
            const s = shift(
                a.p,
                l,
                a.p[l] + offset,
              ),
              t = shift(b.p, l, b.p[l] + offset);
            const from = shift(s, k, level),
              to = shift(t, k, level);
            consider([
              s,
              from,
              shift(from, l, to[l]),
              to,
              t,
            ]);
            consider([
              s,
              from,
              shift(from, "y", to.y),
              to,
              t,
            ]);
          }
        }
      }
    }
    if (stack && !best && a.p.y !== b.p.y) {
      for (const k of ["x", "z"] satisfies (
        | "x"
        | "z"
      )[]) {
        const l = k === "x" ? "z" : "x";
        for (const sign of [-1, 1]) {
          for (
            let lane = 0;
            lane <= ordered.length && !best;
            lane++
          ) {
            const rim =
              (sign < 0
                ? stack.min[k]
                : stack.max[k]) +
              sign * (8 + lane * 8);
            for (const sa of [-1, 1])
              for (const sb of [-1, 1]) {
                const exit = shift(
                  a.p,
                  l,
                  a.p[l] + sa * (a[l] + 8),
                );
                const entry = shift(
                  b.p,
                  l,
                  b.p[l] + sb * (b[l] + 8),
                );
                const from = shift(exit, k, rim),
                  to = shift(entry, k, rim);
                consider([
                  a.p,
                  exit,
                  from,
                  shift(from, "y", to.y),
                  to,
                  entry,
                  b.p,
                ]);
                consider([
                  a.p,
                  exit,
                  from,
                  shift(from, l, to[l]),
                  to,
                  entry,
                  b.p,
                ]);
              }
          }
        }
      }
    }
    if (!best) {
      // Fan sockets along the flank when centre sockets are occupied.
      for (const k of axes) {
        for (const offset of [
          8, -8, 16, -16, 24, -24,
        ]) {
          if (
            Math.abs(offset) >=
            Math.min(a[k], b[k])
          )
            continue;
          candidates(
            { ...a.p, [k]: a.p[k] + offset },
            { ...b.p, [k]: b.p[k] + offset },
            true,
          );
          if (best) break;
        }
        if (best) break;
      }
    }
    total +=
      (best ? cost : 1e12) -
      (previous ? oldCost : 0);
    if (best) {
      routes.set(edge.id ?? i, best);
      reserve(best, edge);
    }
  }
  return { routes, cost: total };
};

export const routeSpace = (
  ...args: Parameters<typeof routeAssignment>
) => routeAssignment(...args).routes;
