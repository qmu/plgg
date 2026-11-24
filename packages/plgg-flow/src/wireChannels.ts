import { outline } from "plgg-flow/wireInteraction";
import {
  cache,
  pathValues,
} from "plgg-flow/wireMemo";
import {
  corridor,
  intersects,
} from "plgg-flow/wireCorridors";
import type { Point } from "plgg-board";
import type { Wire } from "./wiring";
import {
  crossesItself,
  distance,
  pt,
  required,
} from "plgg-flow/wireGeometry";

type Segment = {
  a: Point;
  dx: number;
  dy: number;
  length: number;
};
type Contact = {
  side: number;
  gap: number;
  alignment: number;
};
const cell = (x: number, y: number) =>
  x + "," + y;

const indexPath = (w: Wire) => {
  const bins = new Map<string, Segment[]>();
  // Nearly collinear samples occupy one track through the channel.
  const poly = outline(w.points, 0.2);
  poly.forEach((b, j) => {
    const a = poly[j - 1];
    if (!a) return;
    const length = distance(a, b);
    if (!length) return;
    const seg = {
      a,
      dx: (b.x - a.x) / length,
      dy: (b.y - a.y) / length,
      length,
    };
    // Clip each column to the segment so long diagonals occupy a narrow strip.
    const low = Math.floor(
      (Math.min(a.x, b.x) - 14) / 32,
    );
    const high = Math.floor(
      (Math.max(a.x, b.x) + 14) / 32,
    );
    for (let x = low; x <= high; x++) {
      let first = a.y,
        last = b.y;
      if (high - low > 2 && b.x !== a.x) {
        const at = (u: number) =>
          a.y +
          (b.y - a.y) *
            Math.max(
              0,
              Math.min(
                1,
                (u - a.x) / (b.x - a.x),
              ),
            );
        first = at(x * 32 - 14);
        last = at((x + 1) * 32 + 14);
      }
      for (
        let y = Math.floor(
          (Math.min(first, last) - 14) / 32,
        );
        y <=
        Math.floor(
          (Math.max(first, last) + 14) / 32,
        );
        y++
      ) {
        const key = cell(x, y),
          bin = bins.get(key);
        if (bin) bin.push(seg);
        else bins.set(key, [seg]);
      }
    }
  });
  const normals = w.points.map((p, j) => {
    const a = w.points[j - 1] ?? p,
      b = w.points[j + 1] ?? p,
      d = distance(a, b) || 1;
    return pt((a.y - b.y) / d, (b.x - a.x) / d);
  });
  const cells = w.points.map((p) =>
    cell(
      Math.floor(p.x / 32),
      Math.floor(p.y / 32),
    ),
  );
  return {
    bins,
    normals,
    cells,
    bounds: corridor(w.points, 7),
  };
};
const indices = new WeakMap<
  Wire["points"],
  ReturnType<typeof indexPath>
>();
const indexed = (w: Wire) => {
  const old = indices.get(w.points);
  if (old) return old;
  const data = indexPath(w);
  indices.set(w.points, data);
  return data;
};
type Shift = { j: number; amount: number };
const contacts = new WeakMap<
  Wire["points"],
  WeakMap<Wire["points"], Shift[]>
>();
// Only changed pairs need their shared stretches measured again.
const shiftsFor = (
  w: Wire,
  v: Wire,
  orderSign: number,
) => {
  const { normals, cells } = indexed(w),
    { bins, bounds } = indexed(v);
  const same = (a: Point, b: Point) =>
    a.x === b.x && a.y === b.y;
  const socket = [w.source, w.target].find(
    (p) => same(p, v.source) || same(p, v.target),
  );
  const points = new Map<number, Contact>();
  w.points.forEach((p, j) => {
    if (
      p.x < bounds.l - 7 ||
      p.x > bounds.r + 7 ||
      p.y < bounds.t - 7 ||
      p.y > bounds.b + 7
    )
      return;
    const { x: nx, y: ny } = required(normals[j]);
    for (const seg of bins.get(
      required(cells[j]),
    ) ?? []) {
      const normalComponent = Math.abs(
        nx * seg.dx + ny * seg.dy,
      );
      const alignment = socket
        ? Number(normalComponent <= 0.5)
        : Math.min(
            1,
            Math.max(
              0,
              (0.65 - normalComponent) / 0.3,
            ),
          );
      if (!alignment) continue;
      const x = p.x - seg.a.x,
        y = p.y - seg.a.y;
      const t = Math.max(
        0,
        Math.min(
          seg.length,
          x * seg.dx + y * seg.dy,
        ),
      );
      const rx = x - t * seg.dx,
        ry = y - t * seg.dy,
        gap = rx * rx + ry * ry;
      if (gap >= 196) continue;
      if (gap < (points.get(j)?.gap ?? Infinity))
        points.set(j, {
          side: rx * nx + ry * ny,
          gap,
          alignment,
        });
    }
  });
  const shifts: Shift[] = [];
  const indices = [...points.keys()];
  for (let begin = 0; begin < indices.length; ) {
    let end = begin;
    while (
      end + 1 < indices.length &&
      required(indices[end + 1]) ===
        required(indices[end]) + 1
    )
      end++;
    const side = (k: number) =>
      required(points.get(required(indices[k])))
        .side;
    const first = side(begin),
      last = side(end);
    const j = required(indices[begin]),
      n = required(normals[j]);
    const order =
      (w.source.x +
        w.target.x -
        v.source.x -
        v.target.x) *
        n.x +
      (w.source.y +
        w.target.y -
        v.source.y -
        v.target.y) *
        n.y;
    const tie =
      Math.sign(order) ||
      orderSign *
        (n.x < 0 || (n.x === 0 && n.y < 0)
          ? -1
          : 1);
    const far =
      socket === w.source ? w.target : w.source;
    const other =
      socket &&
      socket.x === v.source.x &&
      socket.y === v.source.y
        ? v.target
        : v.source;
    const fan = socket
      ? ((far.x - socket.x) * n.x +
          (far.y - socket.y) * n.y) /
          (distance(socket, far) || 1) -
        ((other.x - socket.x) * n.x +
          (other.y - socket.y) * n.y) /
          (distance(socket, other) || 1)
      : 0;
    // The open end of a shared shoulder fixes its order around obstacles.
    const exit =
      socket === w.source ? last : first;
    const sign =
      (socket && Math.abs(exit) > 2
        ? Math.sign(exit)
        : 0) ||
      Math.sign(fan) ||
      (Math.abs(first) > 2
        ? Math.sign(first)
        : Math.abs(last) > 2
          ? Math.sign(last)
          : tie);
    const crossing = !fan && first * last < -4;
    // Passing chords need less displacement than sustained parallel runs.
    let sharedLength = 0;
    for (let k = begin + 1; k <= end; k++) {
      sharedLength += distance(
        required(
          w.points[required(indices[k - 1])],
        ),
        required(w.points[required(indices[k])]),
      );
    }
    const strength = socket
      ? Math.min(1, (sharedLength + 8) / 24)
      : Math.min(1, sharedLength / 28);
    const mid = (begin + end) / 2;
    for (let k = begin; k <= end; k++) {
      const j = required(indices[k]),
        desired =
          crossing && k > mid ? -sign : sign;
      shifts.push({
        j,
        amount:
          strength *
          desired *
          required(points.get(j)).alignment *
          0.7 *
          Math.min(
            1,
            (14 -
              Math.sqrt(
                required(points.get(j)).gap,
              )) /
              4,
          ) *
          Math.min(
            socket ? 12 : 10,
            Math.max(0, 10 - desired * side(k)),
          ),
      });
    }
    begin = end + 1;
  }
  return shifts;
};
const forwardContacts = new WeakMap<
  Wire["points"],
  WeakMap<Wire["points"], Shift[]>
>();
const paths = cache<Wire["points"]>(1024);
const identities = new WeakMap<object, number>();
let nextId = 0;
const identity = (value: object) => {
  const existing = identities.get(value);
  if (existing !== undefined) return existing;
  const id = ++nextId;
  identities.set(value, id);
  return id;
};
const knownPaths = new WeakMap<
  Wire["points"],
  Wire["points"]
>();
const canonical = (w: Wire) => {
  // Waypoints belong to the caller and may change between routes.
  if (w.edge.waypoints?.length)
    return paths(pathValues(w.points), () =>
      w.points.map((p) => ({ ...p })),
    );
  const known = knownPaths.get(w.points);
  if (known) return known;
  const path = paths(
    pathValues(w.points),
    () => w.points,
  );
  knownPaths.set(w.points, path);
  return path;
};
const shiftedPaths = cache<Wire["points"] | null>(
  1024,
);
export const curvedChannels = (input: Wire[]) => {
  const wires = input.map((w) => ({
    ...w,
    points: canonical(w),
  }));
  return (i: number, originWire: Wire) => {
    const w = required(wires[i]),
      { bounds, normals } = indexed(w);
    const contributions: Shift[][] = [];
    wires.forEach((v, j) => {
      if (
        i === j ||
        !intersects(bounds, indexed(v).bounds)
      )
        return;
      // Canonical argument order also preserves the tie at coincident sockets.
      const cache =
        i < j ? forwardContacts : contacts;
      let peers = cache.get(w.points);
      if (!peers) {
        peers = new WeakMap();
        cache.set(w.points, peers);
      }
      let shifts = peers.get(v.points);
      if (!shifts) {
        shifts = shiftsFor(
          w,
          v,
          Math.sign(i - j),
        );
        peers.set(v.points, shifts);
      }
      if (shifts.length)
        contributions.push(shifts);
    });
    contributions.sort(
      (a, b) =>
        required(a[0]).j - required(b[0]).j,
    );
    if (!contributions.length) return null;
    const originPoints = canonical(originWire);
    const key = [
      identity(w.points),
      identity(originPoints),
      ...contributions.map(identity),
    ].join(",");
    return shiftedPaths(key, () => {
      const offsets = w.points.map(() => 0);
      for (const shifts of contributions)
        for (const { j, amount } of shifts)
          offsets[j] =
            required(offsets[j]) + amount;
      const shifts = offsets.map((_, j) => {
        let sum = 0,
          weight = 0;
        for (
          let k = Math.max(0, j - 5);
          k <=
          Math.min(j + 5, offsets.length - 1);
          k++
        ) {
          const f = 6 - Math.abs(j - k);
          sum += f * required(offsets[k]);
          weight += f;
        }
        const n = required(normals[j]);
        return pt(
          (n.x * sum) / weight,
          (n.y * sum) / weight,
        );
      });
      if (
        !shifts.some(
          (q) =>
            Math.abs(q.x) + Math.abs(q.y) > 0.05,
        )
      )
        return null;
      const path = w.points.map((p, j) => {
        const f = Math.max(
          0,
          Math.min(
            1,
            (Math.min(
              distance(p, w.source),
              distance(p, w.target),
            ) -
              14) /
              20,
          ),
        );
        const q = required(shifts[j]);
        const origin = required(originPoints[j]);
        const dx = p.x + q.x * f * f - origin.x,
          dy = p.y + q.y * f * f - origin.y;
        // Successive passes share a lane allowance.
        const factor = Math.min(
          1,
          8 / (Math.hypot(dx, dy) || 1),
        );
        return {
          ...p,
          x: origin.x + factor * dx,
          y: origin.y + factor * dy,
        };
      });
      return crossesItself(path) ? null : path;
    });
  };
};
