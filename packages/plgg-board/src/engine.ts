import {
  pipe,
  none,
  some,
  fromNullable,
  chainOption,
  matchOption,
  getOr,
  type Option,
} from "plgg";
import {
  project,
  type Camera,
  type Point,
  type Point3,
} from "plgg-board/index";
import type {
  Scene,
  Light,
  Item,
  Line,
  Label,
  Mark,
  PlaneAxes,
} from "plgg-board/scene";
import {
  compiled,
  ordered,
  type Face,
  type Model,
  type Piece,
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
  span,
  withNext,
} from "plgg-board/geometry";
import {
  surface,
  bounds,
  grid,
  depth,
  inside,
  hidden,
  segmentBounds,
  type Bounds,
  type Interval,
  type Surface,
} from "plgg-board/visibility";
import { shadows } from "plgg-board/shadow";
import { clearLabelStrokes } from "plgg-board/drawing";
import type {
  Drawing,
  DrawLabel,
  DrawMark,
  Fill,
  Ink,
  Matrix,
  Tone,
} from "plgg-board/drawing";

type Segment = readonly [Point3, Point3];

/** The eye: how a world point lands on the screen, and
 * which side of the near plane it is on. */
type Eye = Readonly<{
  /** Perspective strength per world unit; 0 is none. */
  k: number;
  direction: Point3;
  /** Screen position; z/w is affine in screen space, so
   * every depth comparison uses that coordinate. */
  at: (p: Point3) => Point3;
  near: (p: Point3) => number;
}>;
const strength = (camera: Camera): number =>
  Math.min(
    1,
    Math.max(
      0,
      Number(
        pipe(
          fromNullable(camera.perspective),
          getOr<boolean | number>(0),
        ),
      ),
    ),
  ) / 1000;
const deepened = (
  q: Point3,
  k: number,
): Point3 =>
  k
    ? {
        ...q,
        z: q.z / Math.max(0.1, 1 - q.z * k),
      }
    : q;
const looking = (
  k: number,
  direction: Point3,
  projected: (p: Point3) => Point3,
): Eye => ({
  k,
  direction,
  at: (p) => deepened(projected(p), k),
  near: (p) => 0.9 - k * dot(direction, p),
});
const eyeOf = (camera: Camera): Eye =>
  looking(
    strength(camera),
    {
      x:
        -Math.sin(camera.yaw) *
        Math.cos(camera.pitch),
      y: Math.sin(camera.pitch),
      z:
        Math.cos(camera.yaw) *
        Math.cos(camera.pitch),
    },
    project(camera),
  );

const projectLoop = (
  eye: Eye,
  points: readonly Point3[],
): readonly Point3[] =>
  (eye.k ? clip(points, eye.near) : points).map(
    eye.at,
  );

/** A segment with whatever is behind the eye cut off. */
const nearer = (
  [a, b]: Segment,
  da: number,
  db: number,
): Option<Segment> =>
  da < 0 && db < 0
    ? none()
    : some<Segment>(
        da < 0
          ? [mix(a, b, da / (da - db)), b]
          : db < 0
            ? [a, mix(a, b, da / (da - db))]
            : [a, b],
      );
const inFront = (
  eye: Eye,
  s: Segment,
): Option<Segment> =>
  nearer(s, eye.near(s[0]), eye.near(s[1]));

const facingEye = (eye: Eye, f: Face): boolean =>
  f.double
    ? Math.abs(
        dot(f.normal, eye.direction) -
          f.offset * eye.k,
      ) > epsilon
    : dot(f.normal, eye.direction) -
        f.offset * eye.k >
      epsilon;
const several = <T>(o: Option<T>): readonly T[] =>
  pipe(
    o,
    matchOption(
      (): readonly T[] => [],
      (v: T): readonly T[] => [v],
    ),
  );
/** The faces turned to the eye, on the screen. */
const surfaces = (
  eye: Eye,
  model: Model,
): ReadonlyMap<Face, Surface> =>
  new Map(
    model.faces.flatMap((f) =>
      facingEye(eye, f)
        ? several(
            pipe(
              some(projectLoop(eye, f.points)),
              chainOption(
                (points: readonly Point3[]) =>
                  points.length >= 3
                    ? surface(f, points)
                    : none(),
              ),
            ),
          ).map((s): readonly [Face, Surface] => [
            f,
            s,
          ])
        : [],
    ),
  );

const toneOf = (
  light: Light,
  face: Face,
  sign: number,
): Tone =>
  sign * face.normal.y < -0.707
    ? "up"
    : sign * dot(face.normal, light.direction) < 0
      ? "lit"
      : "shade";
const filled = (
  eye: Eye,
  light: Light,
  face: Face,
  polygon: readonly Point3[],
): readonly Fill[] =>
  polygon.length < 3
    ? []
    : [
        {
          id: face.item.id,
          style: face.item.style,
          tone: toneOf(
            light,
            face,
            face.double &&
              dot(face.normal, eye.direction) <
                face.offset * eye.k
              ? -1
              : 1,
          ),
          points: polygon,
        },
      ];
/** The painted faces, back to front. */
const fills = (
  eye: Eye,
  light: Light,
  model: Model,
  faces: ReadonlyMap<Face, Surface>,
): readonly Fill[] =>
  ordered(
    model.tree,
    eye.direction,
    eye.k,
  ).flatMap((piece: Piece) =>
    several(
      fromNullable(faces.get(piece.face)),
    ).flatMap((s) =>
      filled(
        eye,
        light,
        piece.face,
        piece.points === piece.face.points
          ? s.points
          : projectLoop(eye, piece.points),
      ),
    ),
  );

type Query = (box: Bounds) => readonly Surface[];
/** Whether a screen point lies behind a visible face. */
const covered = (
  query: Query,
  p: Point3,
  opaqueOnly: boolean,
): boolean =>
  query(segmentBounds(p, p)).some(
    (s) =>
      (!opaqueOnly ||
        s.face.item.opaqueInk === true) &&
      depth(s, p) > p.z + epsilon &&
      inside(s, p),
  );

const upright = (o: Point): Matrix => [
  1,
  0,
  0,
  1,
  o.x,
  o.y,
];
const laid = (
  o: Point,
  u: Point,
  v: Point,
): Matrix => [
  u.x - o.x,
  u.y - o.y,
  v.x - o.x,
  v.y - o.y,
  o.x,
  o.y,
];
/** The screen transform of something drawn at a point:
 * upright, or laid in a plane. */
const matrix = (
  eye: Eye,
  p: Point3,
  axes: Option<PlaneAxes>,
): Matrix =>
  pipe(
    axes,
    matchOption(
      () => upright(eye.at(p)),
      (x: PlaneAxes) =>
        laid(
          eye.at(p),
          eye.at(shift(p, x.u, 1)),
          eye.at(shift(p, x.v, 1)),
        ),
    ),
  );

/** A run of ink along a segment. */
type Run = Readonly<{
  kind: Ink["kind"];
  lo: number;
  hi: number;
}>;
/** A sweep along a segment over what hides it: how far
 * it is covered, where the covered run began, and the
 * runs so far. */
type Sweep = Readonly<{
  cursor: number;
  start: number;
  runs: readonly Run[];
}>;
const run = (
  kind: Ink["kind"],
  lo: number,
  hi: number,
): Run => ({ kind, lo, hi });
const sweep =
  (kind: Ink["kind"]) =>
  (s: Sweep, i: Interval): Sweep =>
    i.lo > s.cursor + epsilon
      ? {
          cursor: Math.max(s.cursor, i.hi),
          start: i.lo,
          runs: [
            ...s.runs,
            ...(s.cursor > s.start
              ? [run("hidden", s.start, s.cursor)]
              : []),
            run(kind, s.cursor, i.lo),
          ],
        }
      : {
          ...s,
          cursor: Math.max(s.cursor, i.hi),
        };
const swept =
  (kind: Ink["kind"]) =>
  (s: Sweep): readonly Run[] => [
    ...s.runs,
    ...(s.cursor > s.start
      ? [run("hidden", s.start, s.cursor)]
      : []),
    ...(s.cursor < 1
      ? [run(kind, s.cursor, 1)]
      : []),
  ];
const runsOver = (
  kind: Ink["kind"],
  intervals: readonly Interval[],
): readonly Run[] =>
  swept(kind)(
    [...intervals]
      .sort((x, y) => x.lo - y.lo)
      .reduce(sweep(kind), {
        cursor: 0,
        start: 0,
        runs: [],
      }),
  );

/** A hidden run with what opaque ink covers taken out. */
type Shown = Readonly<{
  lo: number;
  runs: readonly Run[];
  /** Nothing further can be taken out. */
  past: boolean;
  /** Nothing is left of the run. */
  gone: boolean;
}>;
const suppress =
  (hi: number) =>
  (s: Shown, part: Interval): Shown =>
    s.past || s.gone
      ? s
      : part.lo >= hi
        ? { ...s, past: true }
        : {
            lo: Math.max(s.lo, part.hi),
            runs:
              part.lo > s.lo
                ? [
                    ...s.runs,
                    run("hidden", s.lo, part.lo),
                  ]
                : s.runs,
            past: false,
            gone: Math.max(s.lo, part.hi) >= hi,
          };
const shown =
  (hi: number) =>
  (s: Shown): readonly Run[] =>
    s.gone
      ? s.runs
      : [...s.runs, run("hidden", s.lo, hi)];
const unsuppressed =
  (suppressed: readonly Interval[]) =>
  (r: Run): readonly Run[] =>
    r.kind === "hidden"
      ? shown(r.hi)(
          suppressed.reduce(suppress(r.hi), {
            lo: r.lo,
            runs: [],
            past: false,
            gone: false,
          }),
        )
      : [r];

const inkOf =
  (
    item: Item,
    outline: boolean,
    [a, b]: Segment,
  ) =>
  (r: Run): Ink => ({
    id: item.id,
    style: item.style,
    kind: r.kind,
    ...(outline && { outline }),
    points: [
      r.lo === 0 ? a : mix(a, b, r.lo),
      r.hi === 1 ? b : mix(a, b, r.hi),
    ],
  });

/** Where a screen point falls along a screen segment. */
const parameter =
  ([a, b]: Segment) =>
  (p: Point3): number =>
    Math.abs(b.x - a.x) > Math.abs(b.y - a.y)
      ? (p.x - a.x) / (b.x - a.x)
      : b.y - a.y
        ? (p.y - a.y) / (b.y - a.y)
        : b.z !== a.z
          ? (p.z - a.z) / (b.z - a.z)
          : 0;
/** The stretches of a wire that run inside solids, as
 * parameters of its screen segment. */
const insideRuns = (
  eye: Eye,
  on: Segment,
  interior: readonly Segment[],
): readonly Interval[] =>
  interior.flatMap((stretch) =>
    several(inFront(eye, stretch)).flatMap(
      ([u, v]) =>
        Math.min(1, parameter(on)(eye.at(v))) >
        Math.max(0, parameter(on)(eye.at(u)))
          ? [
              {
                lo: Math.max(
                  0,
                  parameter(on)(eye.at(u)),
                ),
                hi: Math.min(
                  1,
                  parameter(on)(eye.at(v)),
                ),
              },
            ]
          : [],
    ),
  );

/** What hides a screen segment: every stretch behind a
 * face that is not its own, and those behind opaque ink. */
type Hiding = Readonly<{
  intervals: readonly Interval[];
  suppressed: readonly Interval[];
}>;
const hiding = (
  query: Query,
  own: readonly Face[],
  [a, b]: Segment,
): readonly Readonly<{
  interval: Interval;
  opaque: boolean;
}>[] =>
  query(segmentBounds(a, b)).flatMap((s) =>
    own.includes(s.face)
      ? []
      : several(hidden(a, b, s)).map(
          (interval) => ({
            interval,
            opaque:
              s.face.item.opaqueInk === true,
          }),
        ),
  );
const hidingOf = (
  inside: readonly Interval[],
  behind: readonly Readonly<{
    interval: Interval;
    opaque: boolean;
  }>[],
): Hiding => ({
  intervals: [
    ...inside,
    ...behind.map((h) => h.interval),
  ],
  suppressed: behind
    .filter((h) => h.opaque)
    .map((h) => h.interval)
    .sort((x, y) => x.lo - y.lo),
});
const inked = (
  item: Item,
  kind: Ink["kind"],
  on: Segment,
  h: Hiding,
): readonly Ink[] =>
  runsOver(kind, h.intervals)
    .flatMap(unsuppressed(h.suppressed))
    .map(inkOf(item, kind === "silhouette", on));
const onScreen = (
  eye: Eye,
  [a, b]: Segment,
): Segment => [eye.at(a), eye.at(b)];
const drawnSegment = (
  eye: Eye,
  query: Query,
  item: Item,
  kind: Ink["kind"],
  own: readonly Face[],
  interior: readonly Segment[],
  on: Segment,
): readonly Ink[] =>
  kind === "hidden"
    ? [
        inkOf(
          item,
          false,
          on,
        )(run("hidden", 0, 1)),
      ]
    : inked(
        item,
        kind,
        on,
        hidingOf(
          insideRuns(eye, on, interior),
          hiding(query, own, on),
        ),
      );
/** The ink of one world segment: visible runs in its
 * own kind, runs behind faces as hidden line. */
const segment = (
  eye: Eye,
  query: Query,
  item: Item,
  ends: Segment,
  kind: Ink["kind"],
  own: readonly Face[],
  interior: readonly Segment[],
): readonly Ink[] =>
  several(
    eye.k ? inFront(eye, ends) : some(ends),
  ).flatMap((clipped) =>
    drawnSegment(
      eye,
      query,
      item,
      kind,
      own,
      interior,
      onScreen(eye, clipped),
    ),
  );

const edgeKind = (count: number): Ink["kind"] =>
  count === 0
    ? "hidden"
    : count === 1
      ? "silhouette"
      : "crease";
const edgeInk = (
  eye: Eye,
  query: Query,
  model: Model,
  faces: ReadonlyMap<Face, Surface>,
): readonly Ink[] =>
  model.edges.flatMap((edge) =>
    segment(
      eye,
      query,
      edge.item,
      [edge.a, edge.b],
      edgeKind(
        edge.faces.reduce(
          (n, f) => n + Number(faces.has(f)),
          0,
        ),
      ),
      edge.faces,
      [],
    ),
  );

type Volume = Model["volumes"][number];
const reaches = (
  [a, b]: Segment,
  v: Volume,
): boolean =>
  Math.max(a.x, b.x) >= v.min.x &&
  Math.min(a.x, b.x) <= v.max.x &&
  Math.max(a.y, b.y) >= v.min.y &&
  Math.min(a.y, b.y) <= v.max.y &&
  Math.max(a.z, b.z) >= v.min.z &&
  Math.min(a.z, b.z) <= v.max.z;
/** The stretch of a segment inside a convex volume. */
type Within = Readonly<{
  lo: number;
  hi: number;
  outside: boolean;
}>;
const withinFace =
  ([a, b]: Segment) =>
  (s: Within, f: Face): Within =>
    s.outside
      ? s
      : passing(
          s,
          dot(f.normal, a) - f.offset,
          dot(f.normal, b) - f.offset,
        );
const passing = (
  s: Within,
  da: number,
  db: number,
): Within =>
  da >= -epsilon && db >= -epsilon
    ? { lo: s.lo, hi: 0, outside: true }
    : {
        lo:
          da > 0
            ? Math.max(s.lo, da / (da - db))
            : s.lo,
        hi:
          db > 0
            ? Math.min(s.hi, da / (da - db))
            : s.hi,
        outside: false,
      };
const interiorOf = (
  on: Segment,
  candidates: readonly Volume[],
): readonly Segment[] =>
  candidates.flatMap((volume) =>
    pipe(
      volume.faces.reduce(withinFace(on), {
        lo: 0,
        hi: 1,
        outside: false,
      }),
      (w): readonly Segment[] =>
        w.hi > w.lo
          ? [
              [
                mix(on[0], on[1], w.lo),
                mix(on[0], on[1], w.hi),
              ],
            ]
          : [],
    ),
  );

const onFace = (f: Face, p: Point3): boolean =>
  withNext(f.points).every(
    ([v, next]) =>
      dot(
        cross(sub(next, v), sub(p, v)),
        f.normal,
      ) >= -epsilon,
  );
const holeAt = (
  eye: Eye,
  query: Query,
  line: Line,
  f: Face,
  p: Point3,
): readonly DrawMark[] =>
  eye.near(p) < 0 || !onFace(f, p)
    ? []
    : f.points
        .slice(0, 1)
        .flatMap((p0) =>
          f.points
            .slice(1, 2)
            .map((p1) => unit(sub(p1, p0))),
        )
        .map((u) => ({
          id: line.id,
          style: line.style,
          receiver: f.item.id,
          point: eye.at(p),
          kind: "hole",
          matrix: matrix(
            eye,
            p,
            some({ u, v: cross(f.normal, u) }),
          ),
          covered: covered(
            query,
            eye.at(p),
            false,
          ),
        }));
/** Where a wire goes through a face. A crossing at a
 * joint of the polyline counts once, and only when the
 * wire changes sides there. */
const pierces = (
  eye: Eye,
  query: Query,
  line: Line,
  [a, b]: Segment,
  before: readonly Point3[],
  f: Face,
  da: number,
  db: number,
): readonly DrawMark[] =>
  da * db >= 0 &&
  !(
    da === 0 &&
    before.some(
      (p) =>
        (dot(f.normal, p) - f.offset) * db < 0,
    )
  )
    ? []
    : holeAt(
        eye,
        query,
        line,
        f,
        mix(a, b, da / (da - db)),
      );

/** What one stretch of a wire draws: its ink, and the
 * holes it makes. */
type Wired = Readonly<{
  strokes: readonly Ink[];
  marks: readonly DrawMark[];
}>;
const wired = (
  eye: Eye,
  query: Query,
  pierced: readonly Face[],
  line: Line,
  on: Segment,
  before: readonly Point3[],
  candidates: readonly Volume[],
): Wired => ({
  strokes: segment(
    eye,
    query,
    line,
    on,
    "line",
    [],
    interiorOf(on, candidates),
  ),
  marks: [
    ...pierced,
    ...candidates.flatMap((v) => v.faces),
  ].flatMap((f) =>
    pierces(
      eye,
      query,
      line,
      on,
      before,
      f,
      dot(f.normal, on[0]) - f.offset,
      dot(f.normal, on[1]) - f.offset,
    ),
  ),
});
const wiring = (
  eye: Eye,
  query: Query,
  model: Model,
  scene: Scene,
  pierced: readonly Face[],
): readonly Wired[] =>
  scene.lines.flatMap((line) =>
    span(1, line.points.length - 1).flatMap((i) =>
      line.points
        .slice(i - 1, i)
        .flatMap((a) =>
          line.points
            .slice(i, i + 1)
            .map((b): Segment => [a, b]),
        )
        .map((on) =>
          wired(
            eye,
            query,
            pierced,
            line,
            on,
            line.points.slice(
              Math.max(0, i - 2),
              i - 1,
            ),
            model.volumes.filter((v) =>
              reaches(on, v),
            ),
          ),
        ),
    ),
  );

/** A wire's stroke with its place among the strokes. */
type Wire = Readonly<{
  stroke: Ink;
  i: number;
  box: Bounds;
}>;
const gapOf = (
  w: Wire,
  v: Wire,
  p: Point3,
  q: Point3,
): readonly DrawMark[] =>
  Math.abs(p.z - q.z) < epsilon
    ? []
    : [
        gapOn(
          p.z < q.z ? w : v,
          p.z < q.z ? v : w,
          p.z < q.z ? p : q,
          p,
        ),
      ];
const gapOn = (
  far: Wire,
  nearWire: Wire,
  point: Point3,
  p: Point3,
): DrawMark =>
  gapAlong(
    far,
    nearWire,
    point,
    p,
    far.stroke.points[1].x -
      far.stroke.points[0].x,
    far.stroke.points[1].y -
      far.stroke.points[0].y,
  );
const gapAlong = (
  far: Wire,
  nearWire: Wire,
  point: Point3,
  p: Point3,
  dx: number,
  dy: number,
): DrawMark => ({
  id: far.stroke.id,
  style: far.stroke.style,
  receiver: nearWire.stroke.id,
  kind: "gap",
  strokeIndex: far.i,
  point,
  matrix: [
    dx / Math.hypot(dx, dy),
    dy / Math.hypot(dx, dy),
    -(dy / Math.hypot(dx, dy)),
    dx / Math.hypot(dx, dy),
    p.x,
    p.y,
  ],
  covered: false,
});
const crossing = (
  w: Wire,
  v: Wire,
  [a, b]: Segment,
  [c, d]: Segment,
): readonly DrawMark[] =>
  side(a, b, c) * side(a, b, d) >= 0 ||
  side(c, d, a) * side(c, d, b) >= 0
    ? []
    : gapOf(
        w,
        v,
        mix(
          a,
          b,
          side(c, d, a) /
            (side(c, d, a) - side(c, d, b)),
        ),
        mix(
          c,
          d,
          side(a, b, c) /
            (side(a, b, c) - side(a, b, d)),
        ),
      );
/** Where two wires cross on the screen, the farther one
 * is given a gap. */
const gaps = (
  wires: readonly Wire[],
  nearby: (box: Bounds) => readonly Wire[],
): readonly DrawMark[] =>
  wires.flatMap((w) =>
    nearby(w.box).flatMap((v) =>
      v.i <= w.i
        ? []
        : crossing(
            w,
            v,
            w.stroke.points,
            v.stroke.points,
          ),
    ),
  );
const wiresOf = (
  strokes: readonly Ink[],
  start: number,
): readonly Wire[] =>
  strokes.flatMap((stroke, i) =>
    stroke.kind === "line"
      ? [
          {
            stroke,
            i: start + i,
            box: segmentBounds(
              stroke.points[0],
              stroke.points[1],
            ),
          },
        ]
      : [],
  );
const wireGaps = (
  wires: readonly Wire[],
): readonly DrawMark[] =>
  gaps(wires, grid(wires));

const sceneMark =
  (eye: Eye, query: Query) =>
  (m: Mark): DrawMark => ({
    id: m.id,
    style: m.style,
    kind: "mark",
    point: eye.at(m.point),
    matrix: matrix(
      eye,
      m.point,
      fromNullable(m.axes),
    ),
    covered:
      eye.near(m.point) < 0 ||
      covered(query, eye.at(m.point), false),
  });

const labelBox = (
  [a, b, c, d, x, y]: Matrix,
  size: Point,
): Bounds =>
  bounds(
    [0, size.x].flatMap((u) =>
      [0, -size.y].map((v) => ({
        x: x + a * u + c * v,
        y: y + b * u + d * v,
      })),
    ),
  );
const lettered = (
  eye: Eye,
  query: Query,
  l: Label,
  buried: boolean,
  transform: Matrix,
): DrawLabel => ({
  id: l.id,
  style: buried
    ? pipe(fromNullable(l.behind), getOr(l.style))
    : l.style,
  text: l.text,
  ...(l.clear && { clear: true }),
  point: eye.at(l.point),
  matrix: transform,
  covered:
    !buried &&
    (eye.near(l.point) < 0 ||
      covered(query, eye.at(l.point), false)),
  box: labelBox(
    transform,
    pipe(
      fromNullable(l.size),
      getOr<Point>({
        x: l.text.length * 8,
        y: 16,
      }),
    ),
  ),
});
/** A label whose point lies behind opaque ink is not
 * drawn through it: it is kept upright in its `behind`
 * style when it has one, and dropped otherwise. */
const sceneLabel =
  (eye: Eye, query: Query) =>
  (l: Label): readonly DrawLabel[] =>
    pipe(
      covered(query, eye.at(l.point), true),
      (buried): readonly DrawLabel[] =>
        buried && l.behind === undefined
          ? []
          : [
              lettered(
                eye,
                query,
                l,
                buried,
                matrix(
                  eye,
                  l.point,
                  buried
                    ? none()
                    : fromNullable(l.axes),
                ),
              ),
            ],
    );

const composed = (
  scene: Scene,
  light: Light,
  eye: Eye,
  model: Model,
  faces: ReadonlyMap<Face, Surface>,
  visible: readonly Surface[],
  query: Query,
): Drawing =>
  assembled(
    scene,
    eye,
    query,
    fills(eye, light, model, faces),
    shadows(
      scene,
      light,
      visible,
      eye.at,
      eye.near,
    ),
    edgeInk(eye, query, model, faces),
    wiring(
      eye,
      query,
      model,
      scene,
      model.faces.filter((f) =>
        scene.sheets.some((s) => s === f.item),
      ),
    ),
  );
const assembled = (
  scene: Scene,
  eye: Eye,
  query: Query,
  painted: readonly Fill[],
  cast: Drawing["shadows"],
  edges: readonly Ink[],
  wires: readonly Wired[],
): Drawing => ({
  fills: painted,
  strokes: [
    ...edges,
    ...wires.flatMap((w) => w.strokes),
  ],
  marks: [
    ...wires.flatMap((w) => w.marks),
    ...wireGaps(
      wiresOf(
        wires.flatMap((w) => w.strokes),
        edges.length,
      ),
    ),
    ...scene.marks.map(sceneMark(eye, query)),
  ],
  labels: scene.labels.flatMap(
    sceneLabel(eye, query),
  ),
  shadows: cast,
});
const seen = (
  scene: Scene,
  light: Light,
  eye: Eye,
  model: Model,
  faces: ReadonlyMap<Face, Surface>,
): Drawing =>
  composed(
    scene,
    light,
    eye,
    model,
    faces,
    [...faces.values()],
    grid([...faces.values()]),
  );
const drawn = (
  scene: Scene,
  light: Light,
  eye: Eye,
  model: Model,
): Drawing =>
  seen(
    scene,
    light,
    eye,
    model,
    surfaces(eye, model),
  );

/** The drawing of a scene from a camera under a light:
 * faces painted back to front, edges and wires inked
 * with what is hidden told apart, shadows, marks and
 * labels. */
export const render = (
  scene: Scene,
  camera: Camera,
  light: Light,
  options: Readonly<{
    deferLabelClear?: boolean;
  }> = {},
): Drawing =>
  pipe(
    drawn(
      scene,
      light,
      eyeOf(camera),
      compiled(scene),
    ),
    (drawing) =>
      options.deferLabelClear === true
        ? drawing
        : clearLabelStrokes(drawing),
  );
