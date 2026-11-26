import {
  pipe,
  none,
  some,
  isSome,
  fromNullable,
  chainOption,
  mapOption,
  matchOption,
  tap,
  type Option,
} from "plgg";
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
  withNext,
} from "plgg-board/geometry";

export type Face = Readonly<{
  item: Item;
  points: readonly Point3[];
  normal: Point3;
  offset: number;
  double: boolean;
}>;
/** A face, or what a partition left of it. */
export type Piece = Readonly<{
  face: Face;
  points: readonly Point3[];
}>;
/** A partition: the pieces lying in its plane, and what
 * is in front of and behind it. */
type Node = Readonly<{
  normal: Point3;
  offset: number;
  pieces: readonly Piece[];
  front: Tree;
  back: Tree;
}>;
export type Tree = Option<Node>;
type Edge = Readonly<{
  item: Item;
  a: Point3;
  b: Point3;
  faces: readonly Face[];
}>;

/** The first of `xs` for which `f` answers; `f` is not
 * asked again once it has. */
const firstOf = <A, B>(
  xs: readonly A[],
  f: (a: A) => Option<B>,
): Option<B> =>
  xs.reduce(
    (found: Option<B>, x) =>
      pipe(
        found,
        matchOption(
          () => f(x),
          (b: B): Option<B> => some(b),
        ),
      ),
    none(),
  );

/** Pieces sorted along a direction, each with its reach. */
type Reach = Readonly<{
  piece: Piece;
  lo: number;
  hi: number;
}>;
const reaches = (
  pieces: readonly Piece[],
  along: (p: Point3) => number,
): readonly Reach[] =>
  pieces
    .map((piece) => ({
      piece,
      lo: Math.min(...piece.points.map(along)),
      hi: Math.max(...piece.points.map(along)),
    }))
    .sort((a, b) => a.lo - b.lo);

const parted = (
  normal: Point3,
  offset: number,
  sorted: readonly Reach[],
  at: number,
): Node => ({
  normal,
  offset,
  pieces: [],
  front: build(
    sorted.slice(at).map((r) => r.piece),
  ),
  back: build(
    sorted.slice(0, at).map((r) => r.piece),
  ),
});

/** A scan for the gap nearest the middle. */
type Middle = Readonly<{
  end: number;
  best: number;
  offset: number;
}>;
const nearerMiddle =
  (count: number) =>
  (s: Middle, r: Reach, i: number): Middle =>
    r.lo > s.end + epsilon &&
    i > 0 &&
    (s.best === 0 ||
      Math.abs(i - count / 2) <
        Math.abs(s.best - count / 2))
      ? {
          end: Math.max(s.end, r.hi),
          best: i,
          offset: (r.lo + s.end) / 2,
        }
      : { ...s, end: Math.max(s.end, r.hi) };
const axisNormal = (
  axis: keyof Point3,
): Point3 => ({
  x: Number(axis === "x"),
  y: Number(axis === "y"),
  z: Number(axis === "z"),
});
const partedAtMiddle = (
  axis: keyof Point3,
  sorted: readonly Reach[],
  s: Middle,
): Tree =>
  s.best === 0
    ? none()
    : some(
        parted(
          axisNormal(axis),
          s.offset,
          sorted,
          s.best,
        ),
      );
const axisScan = (
  axis: keyof Point3,
  sorted: readonly Reach[],
): Tree =>
  partedAtMiddle(
    axis,
    sorted,
    sorted.reduce(nearerMiddle(sorted.length), {
      end: -Infinity,
      best: 0,
      offset: 0,
    }),
  );
/** Separate disjoint bounds along an axis, so a
 * partition never cuts a distant box unnecessarily. */
const axisSplit =
  (pieces: readonly Piece[]) =>
  (axis: keyof Point3): Tree =>
    axisScan(
      axis,
      reaches(pieces, (p) => p[axis]),
    );

/** A scan for the first empty gap. */
type Gap = Readonly<{
  hi: number;
  found: Option<
    Readonly<{ at: number; offset: number }>
  >;
}>;
const firstGap = (
  s: Gap,
  r: Reach,
  i: number,
): Gap =>
  isSome(s.found)
    ? s
    : i > 0 && r.lo > s.hi + epsilon
      ? {
          hi: s.hi,
          found: some({
            at: i,
            offset: (s.hi + r.lo) / 2,
          }),
        }
      : {
          hi: Math.max(s.hi, r.hi),
          found: none(),
        };
const obliqueScan = (
  normal: Point3,
  sorted: readonly Reach[],
): Tree =>
  pipe(
    sorted.reduce(firstGap, {
      hi: -Infinity,
      found: none(),
    }).found,
    mapOption(
      (
        g: Readonly<{
          at: number;
          offset: number;
        }>,
      ) => parted(normal, g.offset, sorted, g.at),
    ),
  );
/** Oblique separating planes often keep staggered rows
 * of boxes intact. These are exact partitions: a plane
 * is only accepted in an empty gap. */
const obliqueSplit =
  (pieces: readonly Piece[]) =>
  (direction: Point3): Tree =>
    obliqueScan(
      unit(direction),
      reaches(pieces, (p) =>
        dot(unit(direction), p),
      ),
    );
const obliques: readonly Point3[] = [
  0, 1,
].flatMap((x) =>
  [-1, 0, 1].flatMap((y) =>
    [-1, 0, 1].flatMap((z) =>
      Math.abs(x) + Math.abs(y) + Math.abs(z) <
        2 ||
      (!x && y < 0)
        ? []
        : [{ x, y, z }],
    ),
  ),
);

type Sides = Readonly<{
  front: readonly Piece[];
  back: readonly Piece[];
  on: readonly Piece[];
}>;
type Sided = Readonly<{
  piece: Piece;
  pos: boolean;
  neg: boolean;
}>;
const sided = (
  sorted: readonly Sided[],
  distance: (p: Point3) => number,
): Sides => ({
  front: sorted.flatMap((s) =>
    s.pos && s.neg
      ? [
          {
            ...s.piece,
            points: clip(
              s.piece.points,
              distance,
            ),
          },
        ]
      : s.pos
        ? [s.piece]
        : [],
  ),
  back: sorted.flatMap((s) =>
    s.pos && s.neg
      ? [
          {
            ...s.piece,
            points: clip(
              s.piece.points,
              (p) => -distance(p),
            ),
          },
        ]
      : s.neg && !s.pos
        ? [s.piece]
        : [],
  ),
  on: sorted.flatMap((s) =>
    s.pos || s.neg ? [] : [s.piece],
  ),
});
/** Pieces in front of, behind and in a plane; a piece
 * the plane crosses is cut in two. */
const distribute = (
  normal: Point3,
  offset: number,
  pieces: readonly Piece[],
): Sides =>
  sided(
    pieces.map((piece) => ({
      piece,
      pos: piece.points.some(
        (p) => dot(normal, p) - offset > epsilon,
      ),
      neg: piece.points.some(
        (p) => dot(normal, p) - offset < -epsilon,
      ),
    })),
    (p) => dot(normal, p) - offset,
  );

const partedBy = (
  normal: Point3,
  offset: number,
  s: Sides,
): Node => ({
  normal,
  offset,
  pieces: s.on,
  front: build(s.front),
  back: build(s.back),
});
const cutByFirst = (
  pieces: readonly Piece[],
): Tree =>
  pipe(
    fromNullable(pieces[0]),
    mapOption((first: Piece) =>
      partedBy(
        first.face.normal,
        first.face.offset,
        distribute(
          first.face.normal,
          first.face.offset,
          pieces,
        ),
      ),
    ),
  );
const axes: readonly (keyof Point3)[] = [
  "x",
  "y",
  "z",
];
const build = (pieces: readonly Piece[]): Tree =>
  pieces.length === 0
    ? none()
    : pipe(
        firstOf(axes, axisSplit(pieces)),
        matchOption(
          () =>
            pieces.length > 6
              ? firstOf(
                  obliques,
                  obliqueSplit(pieces),
                )
              : none(),
          (n: Node): Tree => some(n),
        ),
        matchOption(
          () => cutByFirst(pieces),
          (n: Node): Tree => some(n),
        ),
      );

/** The plane of a loop; none when its points are in line. */
const face = (
  item: Item,
  points: readonly Point3[],
  double: boolean,
): Option<Face> =>
  pipe(
    fromNullable(points[0]),
    chainOption((a: Point3) =>
      pipe(
        fromNullable(points[1]),
        chainOption((b: Point3) =>
          pipe(
            fromNullable(
              points.find(
                (p) =>
                  Math.hypot(
                    ...Object.values(
                      cross(sub(b, a), sub(p, a)),
                    ),
                  ) > epsilon,
              ),
            ),
            mapOption((c: Point3) =>
              facing(
                item,
                points,
                double,
                a,
                unit(cross(sub(b, a), sub(c, a))),
              ),
            ),
          ),
        ),
      ),
    ),
  );
const facing = (
  item: Item,
  points: readonly Point3[],
  double: boolean,
  a: Point3,
  normal: Point3,
): Face => ({
  item,
  points,
  normal,
  offset: dot(normal, a),
  double,
});
const several = <T>(o: Option<T>): readonly T[] =>
  pipe(
    o,
    matchOption(
      (): readonly T[] => [],
      (v: T): readonly T[] => [v],
    ),
  );

type Geometry = Readonly<{
  faces: readonly Face[];
  edges: readonly Edge[];
}>;
/** One side of an edge of a solid: the face it bounds. */
type Half = Readonly<{
  key: string;
  a: Point3;
  b: Point3;
  face: Face;
}>;
const halves = (
  solid: Solid,
  loop: readonly number[],
  f: Face,
): readonly Half[] =>
  withNext(loop).flatMap(([i, j]) =>
    solid.vertices.slice(i, i + 1).flatMap((a) =>
      solid.vertices.slice(j, j + 1).map((b) => ({
        key:
          Math.min(i, j) + "/" + Math.max(i, j),
        a,
        b,
        face: f,
      })),
    ),
  );
const joined = (
  solid: Solid,
  all: readonly Half[],
): readonly Edge[] =>
  [...new Set(all.map((h) => h.key))].flatMap(
    (key) =>
      all
        .filter((h) => h.key === key)
        .slice(0, 1)
        .map((first) => ({
          item: solid,
          a: first.a,
          b: first.b,
          faces: all
            .filter((h) => h.key === key)
            .map((h) => h.face),
        })),
  );
type Bounded = Readonly<{
  loop: readonly number[];
  face: Face;
}>;
const solidGeometry = (
  solid: Solid,
  bounded: readonly Bounded[],
): Geometry => ({
  faces: bounded.map((b) => b.face),
  edges: joined(
    solid,
    bounded.flatMap((b) =>
      halves(solid, b.loop, b.face),
    ),
  ),
});
const sheetGeometry = (
  sheet: Sheet,
  faces: readonly Face[],
): Geometry => ({
  faces,
  edges: faces.flatMap((f) =>
    withNext(sheet.points).map(([a, b]) => ({
      item: sheet,
      a,
      b,
      faces: [f],
    })),
  ),
});
const geometry = (
  item: Solid | Sheet,
): Geometry =>
  "vertices" in item
    ? solidGeometry(
        item,
        item.faces.flatMap((loop) =>
          several(
            face(
              item,
              loop.flatMap((i) =>
                item.vertices.slice(i, i + 1),
              ),
              false,
            ),
          ).map((f) => ({ loop, face: f })),
        ),
      )
    : sheetGeometry(
        item,
        several(
          face(item, item.points, !item.oneSided),
        ),
      );

/** The memo seam: a value kept under a key, and handed
 * back. Geometry and partitions are derived from
 * immutable scenes, so what is kept never goes stale. */
const kept = <K extends object, V>(
  cache: WeakMap<K, V>,
  key: K,
  value: V,
): V =>
  tap((v: V) => {
    cache.set(key, v);
  })(value);
const geometryCache = new WeakMap<
  Item,
  Geometry
>();
const geometryOf = (
  item: Solid | Sheet,
): Geometry =>
  pipe(
    fromNullable(geometryCache.get(item)),
    matchOption(
      () =>
        kept(geometryCache, item, geometry(item)),
      (g: Geometry) => g,
    ),
  );

type Volume = Readonly<{
  faces: readonly Face[];
  min: Point3;
  max: Point3;
}>;
export type Model = Geometry &
  Readonly<{
    volumes: readonly Volume[];
    tree: Tree;
    items: ReadonlySet<Item>;
  }>;

const same = (a: Tree, b: Tree): boolean =>
  isSome(a)
    ? isSome(b) && a.content === b.content
    : !isSome(b);
const rejoined = (
  tree: Tree,
  n: Node,
  removed: ReadonlySet<Item>,
  on: readonly Piece[],
  f: Tree,
  b: Tree,
): Tree =>
  !n.pieces.some((p) =>
    removed.has(p.face.item),
  ) &&
  on.length === 0 &&
  same(f, n.front) &&
  same(b, n.back)
    ? tree
    : regrown(
        n,
        n.pieces
          .filter(
            (p) => !removed.has(p.face.item),
          )
          .concat(on),
        f,
        b,
      );
const regrown = (
  n: Node,
  pieces: readonly Piece[],
  f: Tree,
  b: Tree,
): Tree =>
  pieces.length === 0 && !isSome(f)
    ? b
    : pieces.length === 0 && !isSome(b)
      ? f
      : some({ ...n, pieces, front: f, back: b });
const updatedAt = (
  tree: Tree,
  n: Node,
  removed: ReadonlySet<Item>,
  s: Sides,
): Tree =>
  rejoined(
    tree,
    n,
    removed,
    s.on,
    update(n.front, removed, s.front),
    update(n.back, removed, s.back),
  );
/** Retain shared branches on immutable edits. Only the
 * incoming geometry goes through partitioning; retiring
 * a face drops its stored fragments. */
const update = (
  tree: Tree,
  removed: ReadonlySet<Item>,
  added: readonly Piece[],
): Tree =>
  pipe(
    tree,
    matchOption(
      () => build(added),
      (n: Node) =>
        updatedAt(
          tree,
          n,
          removed,
          distribute(n.normal, n.offset, added),
        ),
    ),
  );

const whole = (face: Face): Piece => ({
  face,
  points: face.points,
});
const corner = (
  solid: Solid,
  f: (...values: number[]) => number,
): Point3 => ({
  x: f(...solid.vertices.map((p) => p.x)),
  y: f(...solid.vertices.map((p) => p.y)),
  z: f(...solid.vertices.map((p) => p.z)),
});
const grown = (
  prior: Option<Model>,
  items: ReadonlySet<Item>,
  faces: readonly Face[],
): Tree =>
  pipe(
    prior,
    matchOption(
      () => build(faces.map(whole)),
      (p: Model) =>
        update(
          p.tree,
          new Set(
            [...p.items].filter(
              (i) => !items.has(i),
            ),
          ),
          faces
            .filter((f) => !p.items.has(f.item))
            .map(whole),
        ),
    ),
  );
/** A prior model is worth growing from only when it
 * shares something with the new scene. */
const reusable = (
  prior: Option<Model>,
  items: ReadonlySet<Item>,
): Option<Model> =>
  pipe(
    prior,
    chainOption(
      (p: Model): Option<Model> =>
        [...items].some((item) =>
          p.items.has(item),
        )
          ? some(p)
          : none(),
    ),
  );
const modelled = (
  scene: Scene,
  items: ReadonlySet<Item>,
  parts: readonly Geometry[],
  prior: Option<Model>,
): Model => ({
  items,
  faces: parts.flatMap((g) => g.faces),
  edges: parts.flatMap((g) => g.edges),
  tree: grown(
    reusable(prior, items),
    items,
    parts.flatMap((g) => g.faces),
  ),
  volumes: scene.solids.map((solid) => ({
    faces: geometryOf(solid).faces,
    min: corner(solid, Math.min),
    max: corner(solid, Math.max),
  })),
});

const cache = new WeakMap<Scene, Model>();
const previous = new WeakMap<
  readonly Item[],
  Model
>();
const fresh = (scene: Scene): Model =>
  pipe(
    modelled(
      scene,
      new Set<Item>([
        ...scene.solids,
        ...scene.sheets,
      ]),
      [...scene.solids, ...scene.sheets].map(
        geometryOf,
      ),
      pipe(
        fromNullable(previous.get(scene.sheets)),
        matchOption(
          () =>
            fromNullable(
              previous.get(scene.solids),
            ),
          (m: Model): Option<Model> => some(m),
        ),
      ),
    ),
    (model) =>
      kept(
        previous,
        scene.solids,
        kept(
          previous,
          scene.sheets,
          kept(cache, scene, model),
        ),
      ),
  );
/** A scene whose solids and sheets are both those of an
 * earlier scene shares that scene's model. */
const shared = (scene: Scene): Option<Model> =>
  pipe(
    fromNullable(previous.get(scene.solids)),
    chainOption(
      (m: Model): Option<Model> =>
        m === previous.get(scene.sheets)
          ? some(kept(cache, scene, m))
          : none(),
    ),
  );
/** The scene's faces, edges and partition, built once
 * per scene and grown from the previous scene's. */
export const compiled = (scene: Scene): Model =>
  pipe(
    fromNullable(cache.get(scene)),
    matchOption(
      () => shared(scene),
      (m: Model) => some(m),
    ),
    matchOption(
      () => fresh(scene),
      (m: Model) => m,
    ),
  );

/** The pieces of a partition in painter's order for an
 * eye: far side, the plane, near side. */
export const ordered = (
  tree: Tree,
  eye: Point3,
  k: number,
): readonly Piece[] =>
  pipe(
    tree,
    matchOption(
      (): readonly Piece[] => [],
      (n: Node): readonly Piece[] =>
        dot(n.normal, eye) >= n.offset * k
          ? [
              ...ordered(n.back, eye, k),
              ...n.pieces,
              ...ordered(n.front, eye, k),
            ]
          : [
              ...ordered(n.front, eye, k),
              ...n.pieces,
              ...ordered(n.back, eye, k),
            ],
    ),
  );
