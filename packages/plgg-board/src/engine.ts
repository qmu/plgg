import {
  project,
  type Camera,
  type Point3,
} from "plgg-board/index";
import type {
  Scene,
  Light,
  Item,
  PlaneAxes,
} from "plgg-board/scene";
import {
  compiled,
  walk,
  type Face,
} from "plgg-board/bsp";
import {
  unit,
  dot,
  sub,
  mix,
  shift,
  cross,
  clip,
  epsilon,
  side,
} from "plgg-board/geometry";
import {
  surface,
  bounds,
  grid,
  depth,
  inside,
  hidden,
  segmentBounds,
  type Interval,
  type Surface,
} from "plgg-board/visibility";
import { shadows } from "plgg-board/shadow";
import { clearLabelStrokes } from "plgg-board/drawing";
import type {
  Drawing,
  Ink,
  Matrix,
  Tone,
} from "plgg-board/drawing";

export const render = (
  scene: Scene,
  camera: Camera,
  light: Light,
  options: { deferLabelClear?: boolean } = {},
): Drawing => {
  const model = compiled(scene),
    projected = project(camera),
    k =
      Math.min(
        1,
        Math.max(
          0,
          Number(camera.perspective ?? 0),
        ),
      ) / 1000;
  // z/w is affine in screen space; all depth comparisons use that coordinate.
  const at = (p: Point3) => {
    const q = projected(p);
    return k
      ? {
          ...q,
          z: q.z / Math.max(0.1, 1 - q.z * k),
        }
      : q;
  };
  const coords = new Map<Point3, Point3>();
  const vertex = (p: Point3) => {
    const old = coords.get(p);
    if (old) return old;
    const q = at(p);
    coords.set(p, q);
    return q;
  };
  const eye = {
    x:
      -Math.sin(camera.yaw) *
      Math.cos(camera.pitch),
    y: Math.sin(camera.pitch),
    z:
      Math.cos(camera.yaw) *
      Math.cos(camera.pitch),
  };
  const near = (p: Point3) =>
    0.9 - k * dot(eye, p);
  const projectLoop = (
    points: readonly Point3[],
  ) =>
    (k ? clip(points, near) : points).map(vertex);
  const faces = new Map<Face, Surface>();
  for (const f of model.faces) {
    const facing =
      dot(f.normal, eye) - f.offset * k;
    if (
      f.double
        ? Math.abs(facing) > epsilon
        : facing > epsilon
    ) {
      const points = projectLoop(f.points);
      if (points.length >= 3)
        faces.set(f, surface(f, points));
    }
  }
  const visible = [...faces.values()],
    query = grid(visible);
  const drawing: Drawing = {
    fills: [],
    strokes: [],
    marks: [],
    labels: [],
    shadows: shadows(
      scene,
      light,
      visible,
      vertex,
      near,
    ),
  };
  walk(model.tree, eye, k, ({ face, points }) => {
    const s = faces.get(face);
    if (!s) return;
    const sign =
      face.double &&
      dot(face.normal, eye) < face.offset * k
        ? -1
        : 1;
    const tone: Tone =
      sign * face.normal.y < -0.707
        ? "up"
        : sign *
              dot(face.normal, light.direction) <
            0
          ? "lit"
          : "shade";
    const polygon =
      points === face.points
        ? s.points
        : projectLoop(points);
    if (polygon.length < 3) return;
    drawing.fills.push({
      id: face.item.id,
      style: face.item.style,
      tone,
      points: polygon,
    });
  });
  const covered = (
    p: Point3,
    opaqueOnly = false,
  ) => {
    let result = false;
    query(segmentBounds(p, p), (s) => {
      if (
        (!opaqueOnly || s.face.item.opaqueInk) &&
        depth(s, p) > p.z + epsilon &&
        inside(s, p)
      )
        result = true;
    });
    return result;
  };
  const matrix = (
    p: Point3,
    axes?: PlaneAxes,
  ): Matrix => {
    const o = vertex(p);
    if (!axes) return [1, 0, 0, 1, o.x, o.y];
    const u = at(shift(p, axes.u, 1)),
      v = at(shift(p, axes.v, 1));
    return [
      u.x - o.x,
      u.y - o.y,
      v.x - o.x,
      v.y - o.y,
      o.x,
      o.y,
    ];
  };
  const segment = (
    item: Item,
    a: Point3,
    b: Point3,
    kind: Ink["kind"],
    own: readonly Face[],
    interior: readonly [Point3, Point3][] = [],
  ) => {
    if (k) {
      const da = near(a),
        db = near(b);
      if (da < 0 && db < 0) return;
      if (da < 0) a = mix(a, b, da / (da - db));
      else if (db < 0)
        b = mix(a, b, da / (da - db));
    }
    a = vertex(a);
    b = vertex(b);
    const intervals: Interval[] = [];
    const suppressed: Interval[] = [];
    if (interior.length) {
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const parameter = (p: Point3) =>
        Math.abs(dx) > Math.abs(dy)
          ? (p.x - a.x) / dx
          : dy
            ? (p.y - a.y) / dy
            : b.z !== a.z
              ? (p.z - a.z) / (b.z - a.z)
              : 0;
      for (let [u, v] of interior) {
        const du = near(u),
          dv = near(v);
        if (du < 0 && dv < 0) continue;
        if (du < 0) u = mix(u, v, du / (du - dv));
        else if (dv < 0)
          v = mix(u, v, du / (du - dv));
        const lo = Math.max(0, parameter(at(u))),
          hi = Math.min(1, parameter(at(v)));
        if (hi > lo) intervals.push({ lo, hi });
      }
    }
    const outline = kind === "silhouette";
    const write = (
      kind: Ink["kind"],
      lo: number,
      hi: number,
    ) =>
      drawing.strokes.push({
        id: item.id,
        style: item.style,
        kind,
        ...(outline && { outline }),
        points: [
          lo === 0 ? a : mix(a, b, lo),
          hi === 1 ? b : mix(a, b, hi),
        ],
      });
    const emit = (
      ink: Ink["kind"],
      lo: number,
      hi: number,
    ) => {
      if (ink === "hidden")
        for (const part of suppressed) {
          if (part.lo >= hi) break;
          if (part.lo > lo)
            write(ink, lo, part.lo);
          lo = Math.max(lo, part.hi);
          if (lo >= hi) return;
        }
      write(ink, lo, hi);
    };
    if (kind === "hidden") {
      emit(kind, 0, 1);
      return;
    }
    query(segmentBounds(a, b), (s) => {
      if (own.includes(s.face)) return;
      const interval = hidden(a, b, s);
      if (interval) {
        intervals.push(interval);
        if (s.face.item.opaqueInk)
          suppressed.push(interval);
      }
    });
    suppressed.sort((x, y) => x.lo - y.lo);
    intervals.sort((x, y) => x.lo - y.lo);
    let cursor = 0,
      start = 0;
    for (const { lo, hi } of intervals) {
      if (lo > cursor + epsilon) {
        if (cursor > start)
          emit("hidden", start, cursor);
        emit(kind, cursor, lo);
        start = lo;
      }
      cursor = Math.max(cursor, hi);
    }
    if (cursor > start)
      emit("hidden", start, cursor);
    if (cursor < 1) emit(kind, cursor, 1);
  };
  for (const edge of model.edges) {
    const count = edge.faces.reduce(
      (n, f) => n + Number(faces.has(f)),
      0,
    );
    segment(
      edge.item,
      edge.a,
      edge.b,
      count === 0
        ? "hidden"
        : count === 1
          ? "silhouette"
          : "crease",
      edge.faces,
    );
  }
  const wireStart = drawing.strokes.length;
  const pierced = model.faces.filter((f) =>
    scene.sheets.some((s) => s === f.item),
  );
  for (const line of scene.lines) {
    for (let i = 1; i < line.points.length; i++) {
      const a = line.points[i - 1]!,
        b = line.points[i]!;
      const candidates = model.volumes.filter(
        ({ min, max }) =>
          Math.max(a.x, b.x) >= min.x &&
          Math.min(a.x, b.x) <= max.x &&
          Math.max(a.y, b.y) >= min.y &&
          Math.min(a.y, b.y) <= max.y &&
          Math.max(a.z, b.z) >= min.z &&
          Math.min(a.z, b.z) <= max.z,
      );
      const interior: [Point3, Point3][] = [];
      for (const volume of candidates) {
        let lo = 0,
          hi = 1;
        for (const f of volume.faces) {
          const da = dot(f.normal, a) - f.offset,
            db = dot(f.normal, b) - f.offset;
          if (da >= -epsilon && db >= -epsilon) {
            hi = 0;
            break;
          }
          if (da > 0)
            lo = Math.max(lo, da / (da - db));
          if (db > 0)
            hi = Math.min(hi, da / (da - db));
        }
        if (hi > lo)
          interior.push([
            mix(a, b, lo),
            mix(a, b, hi),
          ]);
      }
      segment(line, a, b, "line", [], interior);
      for (const f of [
        ...pierced,
        ...candidates.flatMap((v) => v.faces),
      ]) {
        const da = dot(f.normal, a) - f.offset,
          db = dot(f.normal, b) - f.offset;
        // Count a crossing at a polyline joint once, only if it changes sides.
        const before = line.points[i - 2];
        const joint =
          da === 0 &&
          before &&
          (dot(f.normal, before) - f.offset) *
            db <
            0;
        if (da * db >= 0 && !joint) continue;
        const p = mix(a, b, da / (da - db));
        if (near(p) < 0) continue;
        if (
          !f.points.every(
            (v, j) =>
              dot(
                cross(
                  sub(
                    f.points[
                      (j + 1) % f.points.length
                    ]!,
                    v,
                  ),
                  sub(p, v),
                ),
                f.normal,
              ) >= -epsilon,
          )
        )
          continue;
        const u = unit(
          sub(f.points[1]!, f.points[0]!),
        );
        drawing.marks.push({
          id: line.id,
          style: line.style,
          receiver: f.item.id,
          point: at(p),
          kind: "hole",
          matrix: matrix(p, {
            u,
            v: cross(f.normal, u),
          }),
          covered: covered(at(p)),
        });
      }
    }
  }
  const wires = drawing.strokes
    .slice(wireStart)
    .flatMap((stroke, i) =>
      stroke.kind === "line"
        ? [
            {
              stroke,
              i: wireStart + i,
              box: segmentBounds(
                ...stroke.points,
              ),
            },
          ]
        : [],
    );
  const nearby = grid(wires);
  for (const w of wires) {
    const [a, b] = w.stroke.points;
    nearby(w.box, (v) => {
      if (v.i <= w.i) return;
      const [c, d] = v.stroke.points;
      const u = side(a, b, c),
        v1 = side(a, b, d),
        s = side(c, d, a),
        t = side(c, d, b);
      if (u * v1 >= 0 || s * t >= 0) return;
      const p = mix(a, b, s / (s - t)),
        q = mix(c, d, u / (u - v1));
      if (Math.abs(p.z - q.z) < epsilon) return;
      const far = p.z < q.z ? w.stroke : v.stroke;
      const [f, g] = far.points,
        len = Math.hypot(g.x - f.x, g.y - f.y),
        x = (g.x - f.x) / len,
        y = (g.y - f.y) / len;
      drawing.marks.push({
        id: far.id,
        style: far.style,
        receiver:
          p.z < q.z ? v.stroke.id : w.stroke.id,
        kind: "gap",
        strokeIndex: p.z < q.z ? w.i : v.i,
        point: p.z < q.z ? p : q,
        matrix: [x, y, -y, x, p.x, p.y],
        covered: false,
      });
    });
  }
  for (const m of scene.marks)
    drawing.marks.push({
      id: m.id,
      style: m.style,
      kind: "mark",
      point: vertex(m.point),
      matrix: matrix(m.point, m.axes),
      covered:
        near(m.point) < 0 ||
        covered(vertex(m.point)),
    });
  for (const l of scene.labels) {
    const buried = covered(vertex(l.point), true);
    if (buried && l.behind === undefined)
      continue;
    const transform = matrix(
        l.point,
        buried ? undefined : l.axes,
      ),
      [a, b, c, d, x, y] = transform,
      { x: width, y: height } = l.size ?? {
        x: l.text.length * 8,
        y: 16,
      };
    drawing.labels.push({
      id: l.id,
      style:
        buried && l.behind !== undefined
          ? l.behind
          : l.style,
      text: l.text,
      ...(l.clear && { clear: true }),
      point: vertex(l.point),
      matrix: transform,
      covered:
        !buried &&
        (near(l.point) < 0 ||
          covered(vertex(l.point))),
      box: bounds(
        [0, width].flatMap((u) =>
          [0, -height].map((v) => ({
            x: x + a * u + c * v,
            y: y + b * u + d * v,
          })),
        ),
      ),
    });
  }
  if (!options.deferLabelClear)
    clearLabelStrokes(drawing);
  return drawing;
};
