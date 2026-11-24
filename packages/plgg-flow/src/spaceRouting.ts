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
      z: bodyDepth(n) + 24,
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
    // All candidate runs on one lattice line see the same obstacles.
    // Project them onto the line once, then score only its 1-D intervals.
    type Track = {
      blocked: { lo: number; hi: number }[];
      crossings: number[];
    };
    const tracks: Record<
      keyof Point3,
      Map<number, Map<number, Track>>
    > = {
      x: new Map(),
      y: new Map(),
      z: new Map(),
    };
    const track = (
      k: keyof Point3,
      start: Point3,
    ) => {
      const u = k === "x" ? "y" : "x",
        v = k === "z" ? "y" : "z",
        x = start[u],
        y = start[v];
      let row = tracks[k].get(x);
      if (!row) {
        row = new Map();
        tracks[k].set(x, row);
      }
      const existing = row.get(y);
      if (existing) return existing;
      const line: Track = {
        blocked: [],
        crossings: [],
      };
      row.set(y, line);
      for (const q of boxes)
        if (
          q !== a &&
          q !== b &&
          Math.abs(x - q.p[u]) < q[u] + 6 &&
          Math.abs(y - q.p[v]) < q[v] + 6
        )
          line.blocked.push({
            lo: q.p[k] - q[k] - 6,
            hi: q.p[k] + q[k] + 6,
          });
      for (let j = 0; j < occupied.length; j++) {
        const t = occupied[j]!,
          l = t.axis;
        if (k === l) {
          if (
            (x - t.start[u]) ** 2 +
              (y - t.start[v]) ** 2 <
            64
          )
            line.blocked.push(t);
        } else if (
          start[l] > t.lo &&
          start[l] < t.hi
        ) {
          const peer = owners[j]!;
          if (
            peer.source !== a.id &&
            peer.target !== a.id &&
            peer.source !== b.id &&
            peer.target !== b.id
          )
            line.crossings.push(t.start[k]);
        }
      }
      return line;
    };
    const drop = stack && a.p.y !== b.p.y;
    const bendCost = drop ? 0.0001 : 10000;
    const scorePath = (path: Point3[]) => {
      let score = (path.length - 2) * bendCost;
      let length = 0;
      if (score >= cost) return;
      for (let j = 1; j < path.length; j++) {
        const start = path[j - 1]!,
          end = path[j]!;
        const k =
          start.x !== end.x
            ? "x"
            : start.y !== end.y
              ? "y"
              : "z";
        if (
          stack &&
          k === "y" &&
          a.p.y !== b.p.y &&
          cells.some(
            (cell) =>
              Math.min(start.y, end.y) <=
                cell.max.y &&
              cell.max.y <=
                Math.max(start.y, end.y),
          )
        ) {
          const rank =
            start.z > stack.max.z
              ? 0
              : start.x < stack.min.x
                ? 1
                : start.z >
                      Math.max(a.p.z, b.p.z) &&
                    start.z < stack.max.z &&
                    start.x < stack.max.x
                  ? 2
                  : 3;
          score +=
            rank === 3 ? 180000 : rank * 0.001;
        }
        const lo = Math.min(start[k], end[k]),
          hi = Math.max(start[k], end[k]);
        const line = track(k, start);
        if (
          line.blocked.some(
            (t) => lo < t.hi && t.lo < hi,
          )
        )
          return;
        length += hi - lo;
        score += hi - lo;
        for (const cross of line.crossings)
          if (lo < cross && cross < hi)
            score += 1000000;
        if (score >= cost) return;
      }
      if (stack && a.p.y !== b.p.y) {
        const first = path[0]!,
          last = path[path.length - 1]!;
        const direct =
          Math.abs(first.x - last.x) +
          Math.abs(first.y - last.y) +
          Math.abs(first.z - last.z);
        if (length > 1.6 * direct)
          score += 300000;
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
        (path.length - 2) * bendCost >= cost
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
          k === "z" ||
          end.z !== box.p.z ||
          (next[k] - box.p[k]) * direction <
            box[k] + 16
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
          if (l === k || (k === "z" && detour))
            continue;

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
    if (stack && a.p.y !== b.p.y) {
      for (const z of [
        stack.max.z + 8,
        stack.max.z + 16,
        Math.max(a.p.z, b.p.z) + 32,
      ]) {
        for (const sa of [-1, 1])
          for (const sb of [-1, 1]) {
            const exit = shift(
              a.p,
              "x",
              a.p.x + sa * (a.x + 16),
            );
            const entry = shift(
              b.p,
              "x",
              b.p.x + sb * (b.x + 16),
            );
            const from = shift(exit, "z", z),
              to = shift(entry, "z", z);
            for (const axis of [
              "x",
              "y",
            ] satisfies ("x" | "y")[])
              consider([
                a.p,
                exit,
                from,
                shift(from, axis, to[axis]),
                to,
                entry,
                b.p,
              ]);
          }
      }
    }
    if (!best || drop || cost >= 1000000)
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
      for (const k of ["x", "y"] satisfies (
        | "x"
        | "y"
      )[]) {
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
    // Leave each endpoint on a flank before changing depth. Independent
    // end choices also let a crowded socket use the next lane on its flank.
    if (!best || (initial && cost >= 1000000)) {
      const exits = (
        box: typeof a,
        offset: number,
      ) =>
        (
          ["x", "y"] satisfies ("x" | "y")[]
        ).flatMap((k) => {
          const other = k === "x" ? "y" : "x";
          if (Math.abs(offset) >= box[other])
            return [];
          const port = shift(
            box.p,
            other,
            box.p[other] + offset,
          );
          return [-1, 1].map((sign) => ({
            port,
            tip: shift(
              port,
              k,
              port[k] + sign * (box[k] + 16),
            ),
          }));
        });
      for (const offset of [
        0, 8, -8, 16, -16, 24, -24,
      ]) {
        if (offset && best) break;
        const targets = exits(b, offset);
        for (const source of exits(a, offset))
          for (const target of targets) {
            for (const z of [
              a.p.z,
              b.p.z,
              (a.p.z + b.p.z) / 2,
              a.p.z + a.z + 16,
              b.p.z - b.z - 16,
            ]) {
              const u = { ...source.tip, z },
                v = { ...target.tip, z };
              for (const k of [
                "x",
                "y",
              ] satisfies ("x" | "y")[])
                consider([
                  source.port,
                  source.tip,
                  u,
                  shift(u, k, v[k]),
                  v,
                  target.tip,
                  target.port,
                ]);
            }
          }
      }
    }
    total +=
      (best ? cost : 1e12) -
      (previous ? oldCost : initial ? 1e12 : 0);
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
