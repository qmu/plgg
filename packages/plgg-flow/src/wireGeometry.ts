import type { Point } from "plgg-board";
import type { Graph, FlowNode } from "./model";
import type { Side } from "./nodeBody";
import { nodeSize } from "plgg-flow/nodeSize";
export const vertical = (side: Side) =>
  side === "top" || side === "bottom";
export const frame = (side: Side) => {
  const v = vertical(side),
    sign =
      side === "top" || side === "left" ? -1 : 1;
  // Every facing pair uses the same forward routing geometry.
  const local = (p: Point) =>
    v ? pt(sign * p.y, p.x) : pt(sign * p.x, p.y);
  const world = (p: Point) =>
    v ? pt(p.y, sign * p.x) : pt(sign * p.x, p.y);
  return { local, world };
};
export const required = <T>(
  value: T | undefined,
): T => {
  if (value === undefined)
    throw new Error("Missing routing geometry");
  return value;
};
export const pt = (
  x: number,
  y: number,
): Point => ({
  x,
  y,
});
export const distance = (a: Point, b: Point) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
export const box = (n: FlowNode) => {
  const { width, height } = nodeSize(n);
  return {
    id: n.id,
    l: n.position.x - width / 2,
    r: n.position.x + width / 2,
    t: n.position.y - height / 2,
    b: n.position.y + height / 2,
  };
};
export type Box = ReturnType<typeof box>;
export const obstacles = (graph: Graph) =>
  graph.nodes
    .filter(
      (n) =>
        !n.hidden && (!n.group || n.collapsed),
    )
    .map(box);
export const pointGap = (p: Point, b: Box) =>
  Math.hypot(
    Math.max(0, b.l - p.x, p.x - b.r),
    Math.max(0, b.t - p.y, p.y - b.b),
  );
export const gap = (
  a: Point,
  b: Point,
  r: Box,
) => {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  if (!dx || !dy)
    return Math.hypot(
      Math.max(
        0,
        r.l - Math.max(a.x, b.x),
        Math.min(a.x, b.x) - r.r,
      ),
      Math.max(
        0,
        r.t - Math.max(a.y, b.y),
        Math.min(a.y, b.y) - r.b,
      ),
    );
  const x1 = (r.l - a.x) / dx,
    x2 = (r.r - a.x) / dx,
    y1 = (r.t - a.y) / dy,
    y2 = (r.b - a.y) / dy;
  if (
    Math.max(
      0,
      Math.min(x1, x2),
      Math.min(y1, y2),
    ) <=
    Math.min(
      1,
      Math.max(x1, x2),
      Math.max(y1, y2),
    )
  )
    return 0;
  let best = Math.min(
    pointGap(a, r),
    pointGap(b, r),
  );
  for (const x of [r.l, r.r])
    for (const y of [r.t, r.b]) {
      const t = Math.min(
        1,
        Math.max(
          0,
          ((x - a.x) * dx + (y - a.y) * dy) /
            (dx * dx + dy * dy),
        ),
      );
      best = Math.min(
        best,
        Math.hypot(
          x - a.x - t * dx,
          y - a.y - t * dy,
        ),
      );
    }
  return best;
};
export const cross = (
  x: number,
  y: number,
  u: number,
  v: number,
) => x * v - y * u;
// At a sampled vertex, the four incident rays must alternate.
export const crossing = (
  p: readonly Point[],
  i: number,
  q: readonly Point[],
  j: number,
) => {
  const a = required(p[i - 1]),
    b = required(p[i]),
    c = required(q[j - 1]),
    d = required(q[j]);
  if (
    Math.max(a.x, b.x) < Math.min(c.x, d.x) ||
    Math.max(c.x, d.x) < Math.min(a.x, b.x) ||
    Math.max(a.y, b.y) < Math.min(c.y, d.y) ||
    Math.max(c.y, d.y) < Math.min(a.y, b.y)
  )
    return false;
  const dx = b.x - a.x,
    dy = b.y - a.y,
    ux = d.x - c.x,
    uy = d.y - c.y,
    den = cross(dx, dy, ux, uy);
  if (!den) return false;
  const t =
      cross(c.x - a.x, c.y - a.y, ux, uy) / den,
    s = cross(c.x - a.x, c.y - a.y, dx, dy) / den;
  if (t <= 0 || s <= 0 || t > 1 || s > 1)
    return false;
  if (t < 1 && s < 1) return true;
  const e = t === 1 ? p[i + 1] : b,
    f = s === 1 ? q[j + 1] : d;
  if (!e || !f) return false;
  const x = a.x + t * dx,
    y = a.y + t * dy;
  const angles = [a, e, c, f].map((h) =>
    Math.atan2(h.y - y, h.x - x),
  );
  const between = (angle: number) =>
    (angle - required(angles[0]) + 2 * Math.PI) %
      (2 * Math.PI) <
    (required(angles[1]) -
      required(angles[0]) +
      2 * Math.PI) %
      (2 * Math.PI);
  return (
    between(required(angles[2])) !==
    between(required(angles[3]))
  );
};
export const crossesItself = (path: Point[]) => {
  // A strictly monotone coordinate rules out a self-intersection.
  for (const axis of ["x", "y"] satisfies (
    | "x"
    | "y"
  )[]) {
    const direction = Math.sign(
      required(path[path.length - 1])[axis] -
        required(path[0])[axis],
    );
    if (
      direction &&
      path.every(
        (p, i) =>
          i === 0 ||
          direction *
            (p[axis] -
              required(path[i - 1])[axis]) >
            0,
      )
    )
      return false;
  }
  // Cull distant spans before testing individual segment pairs.
  const blocks = [];
  for (
    let start = 1;
    start < path.length;
    start += 12
  ) {
    const end = Math.min(path.length, start + 12);
    let l = Infinity,
      r = -Infinity,
      t = Infinity,
      b = -Infinity;
    for (let k = start - 1; k < end; k++) {
      const p = required(path[k]);
      l = Math.min(l, p.x);
      r = Math.max(r, p.x);
      t = Math.min(t, p.y);
      b = Math.max(b, p.y);
    }
    blocks.push({ start, end, l, r, t, b });
  }
  for (let k = 0; k < blocks.length; k++) {
    const a = required(blocks[k]);
    for (let h = k; h < blocks.length; h++) {
      const b = required(blocks[h]);
      if (
        a.l > b.r ||
        b.l > a.r ||
        a.t > b.b ||
        b.t > a.b
      )
        continue;
      for (let i = a.start; i < a.end; i++) {
        for (
          let j = Math.max(b.start, i + 2);
          j < b.end;
          j++
        )
          if (crossing(path, i, path, j))
            return true;
      }
    }
  }
  return false;
};
export const rounded = (
  path: Point[],
  radius: number,
  stemFraction = 1,
) => {
  const out = [required(path[0])];
  for (let i = 1; i < path.length - 1; i++) {
    const a = required(path[i - 1]),
      b = required(path[i]),
      c = required(path[i + 1]),
      u = distance(a, b),
      v = distance(b, c);
    if (!u || !v) continue;
    const r = Math.min(
      radius,
      // Leave a straight run between neighbouring quarter circles.
      u * 0.38,
      v * 0.38,
      i === 1
        ? stemFraction * Math.max(0, u - 14)
        : Infinity,
      i === path.length - 2
        ? stemFraction * Math.max(0, v - 14)
        : Infinity,
    );
    const dx = (a.x - b.x) / u,
      dy = (a.y - b.y) / u,
      ex = (c.x - b.x) / v,
      ey = (c.y - b.y) / v;
    if (
      !r ||
      Math.abs(dx * ey - dy * ex) < 0.01
    ) {
      out.push(b);
      continue;
    }
    for (let k = 0; k <= 6; k++) {
      const t = (Math.PI * k) / 12;
      out.push(
        pt(
          b.x +
            r *
              (dx * (1 - Math.sin(t)) +
                ex * (1 - Math.cos(t))),
          b.y +
            r *
              (dy * (1 - Math.sin(t)) +
                ey * (1 - Math.cos(t))),
        ),
      );
    }
  }
  out.push(required(path[path.length - 1]));
  return out;
};
export const normal = {
  left: pt(-1, 0),
  right: pt(1, 0),
  top: pt(0, -1),
  bottom: pt(0, 1),
};
export const move = (
  p: Point,
  side: Side,
  along: number,
  across = 0,
) =>
  pt(
    p.x +
      normal[side].x * along +
      (vertical(side) ? across : 0),
    p.y +
      normal[side].y * along +
      (vertical(side) ? 0 : across),
  );
export const facing = (
  x: number,
  y: number,
): Side =>
  Math.abs(x) >= Math.abs(y)
    ? x < 0
      ? "left"
      : "right"
    : y < 0
      ? "top"
      : "bottom";

// Open interiors allow a shortest path to touch an inflated corner.
export const cuts = (
  a: Point,
  b: Point,
  q: Box,
) => {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const l = q.l + 0.00001,
    r = q.r - 0.00001,
    t = q.t + 0.00001,
    bot = q.b - 0.00001;
  if (
    Math.max(a.x, b.x) <= l ||
    Math.min(a.x, b.x) >= r ||
    Math.max(a.y, b.y) <= t ||
    Math.min(a.y, b.y) >= bot
  )
    return false;
  if (!dx || !dy) return true;
  const x1 = (l - a.x) / dx,
    x2 = (r - a.x) / dx,
    y1 = (t - a.y) / dy,
    y2 = (bot - a.y) / dy;
  return (
    Math.max(
      0,
      Math.min(x1, x2),
      Math.min(y1, y2),
    ) <
    Math.min(
      1,
      Math.max(x1, x2),
      Math.max(y1, y2),
    )
  );
};
export const free = (
  path: readonly Point[],
  boxes: Box[],
) => {
  let l = Infinity,
    r = -Infinity,
    t = Infinity,
    b = -Infinity;
  for (const p of path) {
    l = Math.min(l, p.x);
    r = Math.max(r, p.x);
    t = Math.min(t, p.y);
    b = Math.max(b, p.y);
  }
  for (const q of boxes) {
    if (
      q.r <= l ||
      q.l >= r ||
      q.b <= t ||
      q.t >= b
    )
      continue;
    for (let i = 1; i < path.length; i++)
      if (
        cuts(
          required(path[i - 1]),
          required(path[i]),
          q,
        )
      )
        return false;
  }
  return true;
};
export const inflate = (q: Box, p: number) => ({
  ...q,
  l: q.l - p,
  r: q.r + p,
  t: q.t - p,
  b: q.b + p,
});

export const simplify = (
  path: readonly Point[],
) => {
  const out: Point[] = [];
  for (const p of path) {
    const b = out[out.length - 1],
      a = out[out.length - 2];
    if (b && distance(b, p) < 1e-8) continue;
    if (
      a &&
      b &&
      Math.abs(
        cross(
          b.x - a.x,
          b.y - a.y,
          p.x - b.x,
          p.y - b.y,
        ),
      ) < 1e-8 &&
      (b.x - a.x) * (p.x - b.x) +
        (b.y - a.y) * (p.y - b.y) >=
        0
    )
      out.pop();
    out.push(p);
  }
  return out;
};
export const bezier = (
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  samples?: number,
) => {
  // The second derivative bounds the chord error independently of the span length.
  const count =
    samples ??
    Math.max(
      2,
      Math.ceil(
        Math.sqrt(
          6 *
            Math.max(
              Math.hypot(
                a.x - 2 * b.x + c.x,
                a.y - 2 * b.y + c.y,
              ),
              Math.hypot(
                b.x - 2 * c.x + d.x,
                b.y - 2 * c.y + d.y,
              ),
            ),
        ),
      ),
    );
  const points: Point[] = new Array(count + 1);
  for (let i = 0; i <= count; i++) {
    const t = i / count,
      u = 1 - t;
    points[i] = pt(
      u * u * u * a.x +
        3 * u * u * t * b.x +
        3 * u * t * t * c.x +
        t * t * t * d.x,
      u * u * u * a.y +
        3 * u * u * t * b.y +
        3 * u * t * t * c.y +
        t * t * t * d.y,
    );
  }
  return points;
};
