import {
  aisleRuns,
  lanesOverlap,
  simplifyPath,
} from "plgg-flow/path3";
import type { Point3 } from "plgg-board";
import { bodyDepth } from "plgg-flow/nodeBody";
import type { Graph, FlowNode } from "./model";
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
  const spans = {
    x: values("x").map(() => 112),
    y: values("y").map(() => 80),
    z: values("z").map(() => 176),
  };
  const index = (address: number[], role: Role) =>
    address[axis(role)] ?? 0;
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
  for (const { address, nodes } of visible) {
    const i = index(address, "x"),
      j = index(address, "y"),
      k = index(address, "z");
    const count = Math.ceil(
      Math.sqrt(nodes.length),
    );
    let left = 16;
    const ordered = [...nodes].sort(
      (a, b) => mean(a) - mean(b),
    );
    ordered.forEach((n, t) => {
      if (t % count === 0) left = 16;
      const { width, height } = sizes(n);
      const z = 32 + 64 * Math.floor(t / count);
      local.set(n.id, {
        x: left + width / 2,
        y: 16 + height / 2,
        z,
      });
      left += round(width) + 32;
      spans.x[i] = Math.max(spans.x[i]!, left);
      spans.y[j] = Math.max(
        spans.y[j]!,
        round(height) + 32,
      );
      spans.z[k] = Math.max(spans.z[k]!, z + 32);
    });
  }
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
            j = index(cell.address, "y"),
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
              values("y")[j]!,
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
  const routes = routeSpace(
    { nodes, edges: data.edges },
    cells,
    sizes,
  );
  return {
    routes,
    blocks,
    slabs,
    place: (n: FlowNode) => positions.get(n.id),
  };
};
export type Space = ReturnType<typeof planSpace>;

type Bounds = { min: Point3; max: Point3 };
type RouteCell = Bounds & {
  block: number;
  members: readonly string[];
};
export const routeSpace = (
  graph: Graph,
  cells: readonly RouteCell[],
  sizes: (n: FlowNode) => {
    width: number;
    height: number;
  } = nodeSize,
  moved?: ReadonlySet<string>,
) => {
  const blocks = new Map<number, Bounds>();
  const owners = new Map<string, Bounds>();
  for (const cell of cells) {
    const block = blocks.get(cell.block) ?? {
      min: { ...cell.min },
      max: { ...cell.max },
    };
    for (const k of [
      "x",
      "y",
      "z",
    ] satisfies (keyof Point3)[]) {
      block.min = {
        ...block.min,
        [k]: Math.min(block.min[k], cell.min[k]),
      };
      block.max = {
        ...block.max,
        [k]: Math.max(block.max[k], cell.max[k]),
      };
    }
    blocks.set(cell.block, block);
    for (const id of cell.members)
      owners.set(id, block);
  }
  const boxes = graph.nodes
    .filter((n) => owners.has(n.id))
    .map((n) => ({
      id: n.id,
      p: n.position,
      w: sizes(n).width / 2,
      h: sizes(n).height / 2,
      d: bodyDepth(n),
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
  const ordered = graph.edges
    .map((edge, i) => ({ edge, i }))
    .filter(({ edge }) => {
      if (
        !moved ||
        moved.has(edge.source) ||
        moved.has(edge.target)
      )
        return true;
      if (edge.path)
        occupied.push(...aisleRuns(edge.path));
      return false;
    })
    .sort(
      (a, b) =>
        (byId.get(a.edge.target)?.p.z ?? 0) -
          (byId.get(b.edge.target)?.p.z ?? 0) ||
        (byId.get(a.edge.target)?.p.y ?? 0) -
          (byId.get(b.edge.target)?.p.y ?? 0),
    );
  for (const { edge, i } of ordered) {
    const a = byId.get(edge.source),
      b = byId.get(edge.target);
    if (!a || !b || a === b) continue;
    const hits = (
      s: Point3,
      t: Point3,
      allowSource = true,
      allowTarget = true,
    ) =>
      boxes.some(
        (q) =>
          (!allowSource || q !== a) &&
          (!allowTarget || q !== b) &&
          Math.min(s.x, t.x) < q.p.x + q.w + 6 &&
          Math.max(s.x, t.x) > q.p.x - q.w - 6 &&
          Math.min(s.y, t.y) < q.p.y + q.h + 6 &&
          Math.max(s.y, t.y) > q.p.y - q.h - 6 &&
          Math.min(s.z, t.z) < q.p.z + q.d + 6 &&
          Math.max(s.z, t.z) > q.p.z - q.d - 6,
      );
    const id = edge.id ?? i;
    if (
      a.p.x === b.p.x &&
      a.p.z === b.p.z &&
      !hits(a.p, b.p)
    ) {
      const sign = Math.sign(b.p.y - a.p.y);
      routes.set(id, [
        { ...a.p, y: a.p.y + sign * a.h },
        { ...b.p, y: b.p.y - sign * b.h },
      ]);
      continue;
    }
    const sourceBlock = owners.get(a.id)!,
      targetBlock = owners.get(b.id)!;
    const between = sourceBlock !== targetBlock;
    if (
      !between &&
      a.p.y === b.p.y &&
      a.p.z === b.p.z &&
      !hits(a.p, b.p)
    )
      continue;
    const direction = b.p.x >= a.p.x ? 1 : -1;
    let best: Point3[] | undefined,
      cost = Infinity;
    const consider = (raw: Point3[]) => {
      const path = simplifyPath(raw);
      let length = 0;
      for (let j = 1; j < path.length; j++) {
        const p = path[j - 1]!,
          q = path[j]!;
        if (
          hits(
            p,
            q,
            j === 1,
            j === path.length - 1,
          )
        )
          return;
        if (
          between &&
          p.y !== sourceBlock.max.y - 16 - a.h
        ) {
          for (const k of ["x", "z"] satisfies (
            | "x"
            | "z"
          )[]) {
            if (
              sourceBlock.min[k] ===
              targetBlock.min[k]
            )
              continue;
            const near = Math.min(
                sourceBlock.max[k],
                targetBlock.max[k],
              ),
              far = Math.max(
                sourceBlock.min[k],
                targetBlock.min[k],
              );
            if (
              Math.min(p[k], q[k]) < far &&
              Math.max(p[k], q[k]) > near &&
              p[k] !== q[k]
            )
              return;
          }
        }
        length +=
          Math.abs(q.x - p.x) +
          Math.abs(q.y - p.y) +
          Math.abs(q.z - p.z);
      }
      const crowded = lanesOverlap(
        aisleRuns(path),
        occupied,
      );
      const first = path[0]!,
        last = path[path.length - 1]!;
      const direct =
        Math.abs(first.x - last.x) +
        Math.abs(first.y - last.y) +
        Math.abs(first.z - last.z);
      const score =
        length +
        (crowded ? 1000 : 0) +
        (path.length > 7 || length > 1.6 * direct
          ? 10000
          : 0);
      if (score < cost) {
        cost = score;
        best = path;
      }
    };
    const offsets = [16, 24, 32, 40, 48, 8];
    // The short route needs only one shaft. Look for a separate
    // arrival aisle when the target cannot be reached from it.
    for (const sign of [direction, -direction]) {
      const s = { ...a.p, x: a.p.x + sign * a.w };
      for (const offset of offsets) {
        const x = s.x + sign * offset,
          arrival = x < b.p.x ? -1 : 1;
        const t = {
          ...b.p,
          x: b.p.x + arrival * b.w,
        };
        if (
          between ||
          Math.abs(x - b.p.x) < b.w + 6
        )
          continue;
        const start = { ...s, x },
          end = { ...t, x };
        if (s.y === t.y && s.z === t.z) continue;
        consider([
          s,
          start,
          { ...start, z: t.z },
          end,
          t,
        ]);
        if (s.y !== t.y && s.z !== t.z)
          consider([
            s,
            start,
            { ...start, y: t.y },
            end,
            t,
          ]);
      }
    }
    if (
      between &&
      sourceBlock.min.z !== targetBlock.min.z
    ) {
      const ground = sourceBlock.max.y - 16 - a.h;
      for (const sign of [
        direction,
        -direction,
      ]) {
        const s = {
          ...a.p,
          x: a.p.x + sign * a.w,
        };
        for (const offset of offsets) {
          const x = s.x + sign * offset;
          if (Math.abs(x - b.p.x) < b.w + 6)
            continue;
          const t = {
              ...b.p,
              x: b.p.x + (x < b.p.x ? -b.w : b.w),
            },
            exit = { ...s, x },
            entry = { ...t, x };
          consider([
            s,
            exit,
            { ...exit, y: ground },
            { ...entry, y: ground },
            entry,
            t,
          ]);
        }
      }
    }
    if (
      between &&
      sourceBlock.min.x !== targetBlock.min.x
    ) {
      const sign = Math.sign(
        targetBlock.min.x - sourceBlock.min.x,
      );
      const s = { ...a.p, x: a.p.x + sign * a.w },
        t = { ...b.p, x: b.p.x - sign * b.w };
      const sourceX =
        sign > 0
          ? sourceBlock.max.x
          : sourceBlock.min.x;
      const targetX =
        sign > 0
          ? targetBlock.min.x
          : targetBlock.max.x;
      const ground = sourceBlock.max.y - 16 - a.h;
      for (const x of [
        sourceX,
        s.x + sign * 16,
      ]) {
        for (const tx of [
          targetX,
          t.x - sign * 16,
        ]) {
          const exit = { ...s, x },
            entry = { ...t, x: tx };
          for (const z of [s.z, t.z]) {
            const left = { ...exit, z },
              right = { ...entry, z };
            consider([
              s,
              exit,
              left,
              { ...left, y: ground },
              { ...right, y: ground },
              right,
              entry,
              t,
            ]);
          }
        }
      }
    }
    if (!best || cost >= 1000) {
      const ground = between
        ? sourceBlock.max.y - 16 - a.h
        : a.p.y;
      for (const sign of [
        direction,
        -direction,
      ]) {
        const s = {
          ...a.p,
          x: a.p.x + sign * a.w,
        };
        for (const arrival of [
          -direction,
          direction,
        ]) {
          const t = {
            ...b.p,
            x: b.p.x + arrival * b.w,
          };
          if (between) {
            // A far block can hide a whole row of intervening cards.
            // Use the clear vertical socket when the journey already
            // begins or ends with a change of storey.
            for (const z of [
              s.z + 32,
              s.z - 32,
              t.z + 32,
              t.z - 32,
            ]) {
              const entry = {
                  ...t,
                  x: t.x + arrival * 16,
                },
                start = {
                  ...s,
                  x: s.x + sign * 16,
                };
              if (ground > a.p.y + a.h) {
                const from = {
                    ...a.p,
                    y: a.p.y + a.h,
                  },
                  floor = { ...from, y: ground },
                  dest = { ...entry, z };
                consider([
                  from,
                  floor,
                  { ...floor, z },
                  { ...dest, y: ground },
                  dest,
                  entry,
                  t,
                ]);
              }
              if (ground > b.p.y + b.h) {
                const to = {
                    ...b.p,
                    y: b.p.y + b.h,
                  },
                  floor = { ...to, y: ground },
                  exit = { ...start, z };
                consider([
                  s,
                  start,
                  exit,
                  { ...exit, y: ground },
                  { ...floor, z },
                  floor,
                  to,
                ]);
              }
            }
          }
          for (const offset of [16, 8, 24]) {
            const start = {
                ...s,
                x: s.x + sign * offset,
              },
              entry = {
                ...t,
                x: t.x + arrival * offset,
              };
            if (hits(s, start) || hits(entry, t))
              continue;
            for (const z of new Set([
              s.z,
              t.z,
              s.z + 32,
              s.z - 32,
              t.z + 32,
              t.z - 32,
            ])) {
              const exit = { ...start, z },
                dest = { ...entry, z };
              consider([
                s,
                start,
                exit,
                { ...exit, y: ground },
                { ...dest, y: ground },
                dest,
                entry,
                t,
              ]);
            }
          }
        }
      }
    }
    if (best) {
      routes.set(id, best);
      occupied.push(...aisleRuns(best));
    }
  }
  return routes;
};
