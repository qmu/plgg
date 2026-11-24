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
      left += round(width) + 16;
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
          for (const n of cell.nodes) {
            const p = local.get(n.id)!;
            positions.set(n.id, {
              x: lo.x + p.x,
              y: extent.y - slabs.y[j]! - p.y,
              z: lo.z + p.z,
            });
          }
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
  return {
    blocks,
    slabs,
    place: (n: FlowNode) => positions.get(n.id),
  };
};
export type Space = ReturnType<typeof planSpace>;
