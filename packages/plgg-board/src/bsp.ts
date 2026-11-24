import type { Point3 } from "plgg-board/index";
import type {
  Item,
  Scene,
  Sheet,
  Solid,
} from "plgg-board/scene";
import {
  dot,
  cross,
  sub,
  unit,
  clip,
  epsilon,
} from "plgg-board/geometry";
export type Face = {
  item: Item;
  points: readonly Point3[];
  normal: Point3;
  offset: number;
  double: boolean;
  pierce: boolean;
};
type Piece = {
  face: Face;
  points: readonly Point3[];
};
type Node = {
  normal: Point3;
  offset: number;
  pieces: Piece[];
  front: Node[];
  back: Node[];
};
type Edge = {
  item: Item;
  a: Point3;
  b: Point3;
  faces: Face[];
};
const axes: readonly (keyof Point3)[] = [
  "x",
  "y",
  "z",
];
// Separate disjoint bounds first, so a partition never cuts a distant box unnecessarily.
const build = (pieces: Piece[]): Node[] => {
  const first = pieces[0];
  if (!first) return [];
  for (const axis of axes) {
    const bounds = pieces
      .map((piece) => ({
        piece,
        min: Math.min(
          ...piece.points.map((p) => p[axis]),
        ),
        max: Math.max(
          ...piece.points.map((p) => p[axis]),
        ),
      }))
      .sort((a, b) => a.min - b.min);
    let end = -Infinity,
      best = 0,
      offset = 0;
    for (const [i, b] of bounds.entries()) {
      if (
        b.min > end + epsilon &&
        i &&
        (!best ||
          Math.abs(i - bounds.length / 2) <
            Math.abs(best - bounds.length / 2))
      ) {
        best = i;
        offset = (b.min + end) / 2;
      }
      end = Math.max(end, b.max);
    }
    if (best)
      return [
        {
          normal: {
            x: Number(axis === "x"),
            y: Number(axis === "y"),
            z: Number(axis === "z"),
          },
          offset,
          pieces: [],
          front: build(
            bounds
              .slice(best)
              .map((b) => b.piece),
          ),
          back: build(
            bounds
              .slice(0, best)
              .map((b) => b.piece),
          ),
        },
      ];
  }
  // Oblique separating planes often keep staggered rows of boxes intact.
  // These are exact partitions: only accept a plane in an empty gap.
  if (pieces.length > 6) {
    for (const x of [0, 1])
      for (const y of [-1, 0, 1])
        for (const z of [-1, 0, 1]) {
          if (
            Math.abs(x) +
              Math.abs(y) +
              Math.abs(z) <
              2 ||
            (!x && y < 0)
          )
            continue;
          const normal = unit({ x, y, z });
          const ranges = pieces
            .map((piece) => {
              const ds = piece.points.map((p) =>
                dot(normal, p),
              );
              return {
                piece,
                lo: Math.min(...ds),
                hi: Math.max(...ds),
              };
            })
            .sort((a, b) => a.lo - b.lo);
          let hi = -Infinity;
          for (const [i, r] of ranges.entries()) {
            if (i && r.lo > hi + epsilon)
              return [
                {
                  normal,
                  offset: (hi + r.lo) / 2,
                  pieces: [],
                  front: build(
                    ranges
                      .slice(i)
                      .map((r) => r.piece),
                  ),
                  back: build(
                    ranges
                      .slice(0, i)
                      .map((r) => r.piece),
                  ),
                },
              ];
            hi = Math.max(hi, r.hi);
          }
        }
  }
  const { normal, offset } = first.face,
    front: Piece[] = [],
    back: Piece[] = [],
    on: Piece[] = [];
  distribute(
    normal,
    offset,
    pieces,
    front,
    back,
    on,
  );
  return [
    {
      normal,
      offset,
      pieces: on,
      front: build(front),
      back: build(back),
    },
  ];
};
const distribute = (
  normal: Point3,
  offset: number,
  pieces: Piece[],
  front: Piece[],
  back: Piece[],
  on: Piece[],
) => {
  const distance = (p: Point3) =>
    dot(normal, p) - offset;
  for (const piece of pieces) {
    const pos = piece.points.some(
        (p) => distance(p) > epsilon,
      ),
      neg = piece.points.some(
        (p) => distance(p) < -epsilon,
      );
    if (pos && neg) {
      front.push({
        ...piece,
        points: clip(piece.points, distance),
      });
      back.push({
        ...piece,
        points: clip(
          piece.points,
          (p) => -distance(p),
        ),
      });
    } else
      (pos ? front : neg ? back : on).push(piece);
  }
};
const geometry = (item: Solid | Sheet) => {
  const faces: Face[] = [],
    edges: Edge[] = [];
  const face = (
    item: Item,
    points: readonly Point3[],
    double: boolean,
    pierce: boolean,
  ) => {
    const a = points[0],
      b = points[1];
    if (!a || !b) return;
    const c = points.find(
      (p) =>
        Math.hypot(
          ...Object.values(
            cross(sub(b, a), sub(p, a)),
          ),
        ) > epsilon,
    );
    if (!c) return;
    const normal = unit(
      cross(sub(b, a), sub(c, a)),
    );
    const f = {
      item,
      points,
      normal,
      offset: dot(normal, a),
      double,
      pierce,
    };
    faces.push(f);
    return f;
  };
  if ("vertices" in item) {
    const solid = item;
    const adjacent = new Map<string, Edge>();
    for (const loop of solid.faces) {
      const points = loop.flatMap(
        (i) => solid.vertices[i] ?? [],
      );
      const f = face(
        solid,
        points,
        false,
        solid.slab === true,
      );
      if (!f) continue;
      loop.forEach((i, k) => {
        const j = loop[(k + 1) % loop.length];
        if (j === undefined) return;
        const a = solid.vertices[i],
          b = solid.vertices[j];
        if (!a || !b) return;
        const key =
          Math.min(i, j) + "/" + Math.max(i, j);
        const edge = adjacent.get(key) ?? {
          item: solid,
          a,
          b,
          faces: [],
        };
        edge.faces.push(f);
        adjacent.set(key, edge);
      });
    }
    edges.push(...adjacent.values());
  } else {
    const sheet = item;
    const f = face(
      sheet,
      sheet.points,
      !sheet.oneSided,
      true,
    );
    if (f)
      sheet.points.forEach((a, i) => {
        const b =
          sheet.points[
            (i + 1) % sheet.points.length
          ];
        if (b)
          edges.push({
            item: sheet,
            a,
            b,
            faces: [f],
          });
      });
  }
  return { faces, edges };
};
type Geometry = ReturnType<typeof geometry>;
const geometryCache = new WeakMap<
  Item,
  Geometry
>();
const geometryOf = (item: Solid | Sheet) => {
  const prior = geometryCache.get(item);
  if (prior) return prior;
  const result = geometry(item);
  geometryCache.set(item, result);
  return result;
};
type Model = Geometry & {
  tree: Node[];
  items: Set<Item>;
};
// Retain shared BSP branches on immutable edits. Only the incoming geometry
// goes through partitioning; retiring a face drops its stored fragments.
const update = (
  nodes: Node[],
  removed: Set<Item>,
  added: Piece[],
): Node[] => {
  const n = nodes[0];
  if (!n) return build(added);
  const front: Piece[] = [],
    back: Piece[] = [],
    on: Piece[] = [];
  distribute(
    n.normal,
    n.offset,
    added,
    front,
    back,
    on,
  );
  const f = update(n.front, removed, front),
    b = update(n.back, removed, back);
  const stale = n.pieces.some((p) =>
    removed.has(p.face.item),
  );
  if (
    !stale &&
    !on.length &&
    f[0] === n.front[0] &&
    b[0] === n.back[0]
  )
    return nodes;
  const pieces = n.pieces
    .filter((p) => !removed.has(p.face.item))
    .concat(on);
  if (!pieces.length && !f.length) return b;
  if (!pieces.length && !b.length) return f;
  return [{ ...n, pieces, front: f, back: b }];
};
const cache = new WeakMap<Scene, Model>();
const previous = new WeakMap<
  readonly Item[],
  Model
>();
export const compiled = (scene: Scene) => {
  const cached = cache.get(scene);
  if (cached) return cached;
  const shapes = [
      ...scene.solids,
      ...scene.sheets,
    ],
    items = new Set<Item>(shapes),
    parts = shapes.map(geometryOf),
    faces = parts.flatMap((g) => g.faces),
    edges = parts.flatMap((g) => g.edges);
  const prior =
    previous.get(scene.sheets) ??
    previous.get(scene.solids);
  const reuse =
    prior &&
    [...items].some((item) =>
      prior.items.has(item),
    );
  const added = faces
    .filter(
      (f) => !reuse || !prior.items.has(f.item),
    )
    .map((face) => ({
      face,
      points: face.points,
    }));
  const tree = reuse
    ? update(
        prior.tree,
        new Set(
          [...prior.items].filter(
            (i) => !items.has(i),
          ),
        ),
        added,
      )
    : build(added);
  const result = { items, faces, edges, tree };
  cache.set(scene, result);
  previous.set(scene.sheets, result);
  previous.set(scene.solids, result);
  return result;
};
export const walk = (
  nodes: Node[],
  eye: Point3,
  k: number,
  emit: (piece: Piece) => void,
) => {
  for (const n of nodes) {
    const front =
      dot(n.normal, eye) >= n.offset * k;
    walk(front ? n.back : n.front, eye, k, emit);
    n.pieces.forEach(emit);
    walk(front ? n.front : n.back, eye, k, emit);
  }
};
