import { dependencyLevels } from "plgg-flow/topology";
import { routeAssignment } from "plgg-flow/spaceRouting";
export { routeSpace } from "plgg-flow/spaceRouting";
import type { Point3 } from "plgg-board";
import type { FlowNode } from "./model";
import type { Classification } from "plgg-flow/classify";
import type {
  View,
  Role,
} from "plgg-flow/spaceView";
import { nodeSize } from "plgg-flow/nodeSize";

const round = (n: number) =>
  Math.ceil(n / 16) * 16;
export const planSpace = (
  data: Classification,
  view: View,
  sizes: (node: FlowNode) => {
    width: number;
    height: number;
  } = nodeSize,
) => {
  const axis = (role: Role) =>
    data.axes.findIndex(
      (a) => a.attribute === view[role],
    );
  const values = (role: Role) =>
    data.axes[axis(role)]?.values ?? ["—"];
  const cake = data.axes.length === 1 && !!view.y;
  const spans = {
    x: values("x").map(() => 112),
    y: values("y").map((): number =>
      cake ? 144 : 256,
    ),
    z: values("z").map((): number =>
      cake ? 160 : 176,
    ),
  };
  const index = (address: number[], role: Role) =>
    address[axis(role)] ?? 0;
  const storey = (address: number[]) =>
    cake
      ? spans.y.length - 1 - index(address, "y")
      : index(address, "y");
  const local = new Map<string, Point3>();
  const visible = data.cells.filter((c) =>
    data.axes.every(
      (a, i) =>
        !Object.prototype.hasOwnProperty.call(
          view.pins,
          a.attribute,
        ) ||
        a.values[c.address[i]!] ===
          view.pins[a.attribute],
    ),
  );
  const ranks = new Map(
    data.cells.flatMap((c) =>
      c.nodes.map(
        (n) =>
          [
            n.id,
            index(c.address, "x"),
          ] satisfies [string, number],
      ),
    ),
  );
  const boardLevels = new Map<string, number>();
  if (cake)
    for (const { nodes } of visible) {
      for (const [id, rank] of dependencyLevels({
        nodes,
        edges: data.edges,
      })) {
        boardLevels.set(id, rank);
        ranks.set(id, rank);
      }
    }
  const neighbours = new Map<string, number[]>();
  for (const e of data.edges)
    for (const [source, target] of [
      [e.source, e.target],
      [e.target, e.source],
    ] satisfies [string, string][]) {
      const list = neighbours.get(source) ?? [];
      list.push(ranks.get(target) ?? 0);
      neighbours.set(source, list);
    }
  const mean = (n: FlowNode) => {
    const ns = neighbours.get(n.id);
    return ns
      ? ns.reduce((a, b) => a + b, 0) / ns.length
      : 0;
  };
  const pitches = spans.x.map(() => 96);
  for (const cell of visible) {
    const i = index(cell.address, "x");
    for (const n of cell.nodes) {
      const degree =
        neighbours.get(n.id)?.length ?? 0;
      const aisle = Math.max(
        32,
        round(Math.ceil(degree / 4) * 8),
      );
      pitches[i] = Math.max(
        pitches[i]!,
        round(sizes(n).width) + aisle,
      );
    }
  }
  for (const { address, nodes } of visible) {
    const i = index(address, "x"),
      j = storey(address),
      k = index(address, "z");
    const count = Math.ceil(
      Math.sqrt(nodes.length),
    );

    const ordered = [...nodes].sort(
      (a, b) => mean(a) - mean(b),
    );
    const layered =
      cake &&
      ordered.some(
        (n) => boardLevels.get(n.id)! > 0,
      );
    const rows = new Map<number, number>();
    const pitch = pitches[i]!;
    ordered.forEach((n, t) => {
      const { width, height } = sizes(n);
      const col = layered
        ? boardLevels.get(n.id)!
        : cake
          ? t
          : t % count;
      const row = cake
        ? (rows.get(col) ?? 0)
        : Math.floor(t / count);
      rows.set(col, row + 1);
      const left = (cake ? 32 : 16) + pitch * col;
      const z = 32 + 80 * row;
      local.set(n.id, {
        x: left + width / 2,
        y: (cake ? 0 : 16) + height / 2,
        z,
      });

      spans.x[i] = Math.max(
        spans.x[i]!,
        cake
          ? round(left + width + 32)
          : left + pitch,
      );
      spans.y[j] = Math.max(
        spans.y[j]!,
        round(height) + 32,
      );
      spans.z[k] = Math.max(spans.z[k]!, z + 32);
    });
  }
  if (cake) spans.y.fill(Math.max(...spans.y));
  const bounds = (s: number[]) =>
    s.reduce<number[]>(
      (b, v) => [...b, b[b.length - 1]! + v],
      [0],
    );
  const slabs = {
    x: bounds(spans.x),
    y: bounds(spans.y),
    z: bounds(spans.z),
  };
  const extent = {
    x: slabs.x[spans.x.length]!,
    y: slabs.y[spans.y.length]!,
    z: slabs.z[spans.z.length]!,
  };
  const positions = new Map<string, Point3>();
  const blocks = values("row").flatMap((row, r) =>
    values("column").map((column, c) => {
      const min = {
        x: c * (extent.x + 96),
        y: 0,
        z: r * (extent.z + 96),
      };
      const max = {
        x: min.x + extent.x,
        y: extent.y,
        z: min.z + extent.z,
      };
      const cells = visible
        .filter(
          (v) =>
            index(v.address, "row") === r &&
            index(v.address, "column") === c,
        )
        .map((cell) => {
          const i = index(cell.address, "x"),
            j = storey(cell.address),
            k = index(cell.address, "z");
          const lo = {
            x: min.x + slabs.x[i]!,
            y: extent.y - slabs.y[j + 1]!,
            z: min.z + slabs.z[k]!,
          };
          // Nodes stand in the middle of their cell, not against
          // its back-left corner.
          const placed = cell.nodes.map((n) => ({
            n,
            p: local.get(n.id)!,
            half: sizes(n).width / 2,
          }));
          const middle = (
            lows: number[],
            highs: number[],
            span: number,
          ) =>
            placed.length
              ? Math.round(
                  (span -
                    Math.min(...lows) -
                    Math.max(...highs)) /
                    2 /
                    16,
                ) * 16
              : 0;
          const shift = {
            x: middle(
              placed.map((q) => q.p.x - q.half),
              placed.map((q) => q.p.x + q.half),
              spans.x[i]!,
            ),
            z: middle(
              placed.map((q) => q.p.z),
              placed.map((q) => q.p.z),
              spans.z[k]!,
            ),
          };
          // Keep the same slot grid across an aisle, even when a cell is sparse.
          if (cake) {
            shift.x = 0;
            shift.z = 0;
          }
          if (view.z) {
            const pitch = pitches[i]!;
            // Reserve the widest occupant of an exchangeable slot.
            const lastLeft = Math.max(
              0,
              ...placed.map(
                (q) => q.p.x - q.half,
              ),
            );
            const lastZ = Math.max(
              0,
              ...placed.map((q) => q.p.z),
            );
            shift.x =
              Math.max(
                0,
                Math.min(
                  Math.round(shift.x / pitch),
                  Math.floor(
                    (spans.x[i]! -
                      lastLeft -
                      Math.max(
                        0,
                        ...placed.map(
                          (q) => 2 * q.half,
                        ),
                      ) -
                      16) /
                      pitch,
                  ),
                ),
              ) * pitch;
            shift.z =
              Math.max(
                0,
                Math.min(
                  Math.round(shift.z / 80),
                  Math.floor(
                    (spans.z[k]! - lastZ - 32) /
                      80,
                  ),
                ),
              ) * 80;
          }
          for (const { n, p } of placed)
            positions.set(n.id, {
              x: lo.x + p.x + shift.x,
              y: extent.y - slabs.y[j]! - p.y,
              z: lo.z + p.z + shift.z,
            });
          return {
            ...cell,
            index: [i, j, k] satisfies [
              number,
              number,
              number,
            ],
            values: [
              values("x")[i]!,
              values("y")[
                index(cell.address, "y")
              ]!,
              values("z")[k]!,
            ] satisfies [string, string, string],
            min: lo,
            max: {
              x: min.x + slabs.x[i + 1]!,
              y: extent.y - slabs.y[j]!,
              z: min.z + slabs.z[k + 1]!,
            },
          };
        });
      return {
        address: { row, column },
        min,
        max,
        cells,
      };
    }),
  );
  const cells = blocks.flatMap((b, block) =>
    b.cells.map((c) => ({
      ...c,
      block,
      members: c.nodes.map((n) => n.id),
    })),
  );
  const nodes = visible.flatMap((c) =>
    c.nodes.map((n) => ({
      ...n,
      position: positions.get(n.id)!,
    })),
  );
  const edges = data.edges;
  const ids = new Map(
    nodes.map((n, i) => [n.id, i]),
  );
  const links = edges.flatMap((e) => {
    const a = ids.get(e.source),
      b = ids.get(e.target);
    return a === undefined || b === undefined
      ? []
      : [{ a, b }];
  });
  const swaps = cells.flatMap((cell) =>
    cell.nodes.flatMap((a, i) =>
      cell.nodes.slice(i + 1).flatMap((b) => {
        const p = positions.get(a.id)!,
          q = positions.get(b.id)!;
        return cake &&
          p.x - sizes(a).width / 2 !==
            q.x - sizes(b).width / 2
          ? []
          : [
              [
                ids.get(a.id)!,
                ids.get(b.id)!,
              ] satisfies [number, number],
            ];
      }),
    ),
  );
  // Score a slot exchange cheaply before spending time assigning lanes.
  const slots = nodes.map((n) => n.position);
  const evaluate = (assignment: Point3[]) => {
    let score = 0;
    for (let i = 0; i < links.length; i++) {
      const { a, b } = links[i]!,
        p = assignment[a]!,
        q = assignment[b]!;
      score +=
        Math.abs(p.x - q.x) +
        Math.abs(p.y - q.y) +
        Math.abs(p.z - q.z);
      for (let j = 0; j < i; j++) {
        const link = links[j]!;
        if (
          link.a === a ||
          link.b === a ||
          link.a === b ||
          link.b === b
        )
          continue;
        const r = assignment[link.a]!,
          t = assignment[link.b]!;
        const crosses = (
          ax: number,
          ay: number,
          bx: number,
          by: number,
          cx: number,
          cy: number,
          dx: number,
          dy: number,
        ) => {
          const u = bx - ax,
            v = by - ay,
            w = dx - cx,
            h = dy - cy;
          return (
            (u * (cy - ay) - v * (cx - ax)) *
              (u * (dy - ay) - v * (dx - ax)) <
              0 &&
            (w * (ay - cy) - h * (ax - cx)) *
              (w * (by - cy) - h * (bx - cx)) <
              0
          );
        };
        score +=
          10000 *
          (Number(
            crosses(
              p.x,
              p.y,
              q.x,
              q.y,
              r.x,
              r.y,
              t.x,
              t.y,
            ),
          ) +
            Number(
              crosses(
                p.x,
                p.z,
                q.x,
                q.z,
                r.x,
                r.z,
                t.x,
                t.z,
              ),
            ) +
            Number(
              crosses(
                p.y,
                p.z,
                q.y,
                q.z,
                r.y,
                r.z,
                t.y,
                t.z,
              ),
            ));
      }
    }
    return score;
  };
  const exchange = (
    assignment: Point3[],
    a: number,
    b: number,
  ) => {
    const copy = assignment.slice(),
      p = copy[a]!,
      q = copy[b]!;
    const delta =
      (sizes(nodes[a]!).width -
        sizes(nodes[b]!).width) /
      2;
    copy[a] = { ...q, x: q.x + delta, y: p.y };
    copy[b] = { ...p, x: p.x - delta, y: q.y };
    return copy;
  };
  const routed = (assignment: Point3[]) =>
    routeAssignment(
      {
        nodes: nodes.map((n, i) => ({
          ...n,
          position: assignment[i]!,
        })),
        edges,
      },
      cells,
      sizes,
    );
  let chosen = slots,
    result = routed(slots);
  if (
    swaps.length &&
    links.length &&
    result.cost >= 1000000
  ) {
    let trial = slots;
    let estimate = evaluate(trial);
    for (
      let round = 0;
      round < (links.length > 32 ? 2 : 4);
      round++
    ) {
      let next = trial;
      for (const [a, b] of swaps) {
        const alt = exchange(trial, a, b),
          cost = evaluate(alt);
        if (cost < estimate) {
          estimate = cost;
          next = alt;
        }
      }
      if (next === trial) break;
      trial = next;
    }
    if (trial !== slots) {
      const candidate = routed(trial);
      if (candidate.cost < result.cost) {
        chosen = trial;
        result = candidate;
      }
    }
    if (nodes.length <= 20) {
      for (const [a, b] of swaps.slice(
        0,
        links.length > 24 ? 2 : 4,
      )) {
        if (result.cost < 1000000) break;
        const alt = exchange(chosen, a, b),
          candidate = routed(alt);
        if (candidate.cost < result.cost) {
          chosen = alt;
          result = candidate;
        }
      }
    }
  }
  for (
    let pass = 0;
    pass < (nodes.length > 20 ? 1 : 2) &&
    result.cost >= 1000000;
    pass++
  ) {
    const improved = routeAssignment(
      {
        nodes: nodes.map((n, i) => ({
          ...n,
          position: chosen[i]!,
        })),
        edges,
      },
      cells,
      sizes,
      undefined,
      result,
    );
    if (improved.cost >= result.cost) break;
    result = improved;
  }
  nodes.forEach((n, i) =>
    positions.set(n.id, chosen[i]!),
  );
  const routes = result.routes;
  return {
    routes,
    blocks,
    slabs,
    place: (n: FlowNode) => positions.get(n.id),
  };
};
export type Space = ReturnType<typeof planSpace>;
