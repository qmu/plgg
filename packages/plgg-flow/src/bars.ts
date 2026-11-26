import {
  pipe,
  ok,
  err,
  none,
  some,
  isSome,
  fromNullable,
  chainOption,
  mapOption,
  matchOption,
  getOr,
  chainResult,
  mapResult,
  type Option,
  type Result,
} from "plgg";
import type { Point3 } from "plgg-board";
import type {
  FlowNode,
  Graph,
  Scenery,
} from "./model";
import type { Axis } from "plgg-flow/classify";
import type {
  JsonObject,
  JsonValue,
} from "plgg-flow/metadata";
import {
  along,
  divisions,
  hint,
  ink,
  lettering,
  measureOf,
  measureWords,
  pencil,
  strokes,
  tickText,
  trace,
  valueOn,
  type Better,
  type Measure,
  type Segment,
  type Told,
} from "plgg-flow/plot";

/**
 * THE BARS: one quantity, compared across kinds.
 *
 * Every node is a bar as tall as its value. The first
 * axis is the quantity; the second names the kinds the
 * bars stand side by side for; a third, when written,
 * sets a second kind apart in DEPTH — so a quantity that
 * depends on two things at once is a field of bars, and
 * where it is tallest is seen at a glance.
 *
 *   layout bars
 *   axis 売上 0..100 higher
 *   axis 四半期 Q1 Q2 Q3
 *   axis 地域 東 西
 *   node 東Q1 四半期=Q1 地域=東 売上=40
 */
export type Bars = Readonly<{
  measure: Measure;
  across: Axis;
  deep: Option<Axis>;
}>;

/** World units: from bar to bar across and in depth, the
 * side of a bar, and the height of the tallest. */
const pitch = 72;
const apart = 88;
const thick = 36;
const tall = 280;

/** A node's word on an attribute, when it has one. */
const wordOn =
  (attribute: string) =>
  (node: FlowNode): Option<string> =>
    pipe(
      fromNullable(node.data),
      chainOption((data: JsonObject) =>
        fromNullable(data[attribute]),
      ),
      mapOption((v: JsonValue) => String(v)),
    );
const bars = (
  nodes: readonly FlowNode[],
): readonly FlowNode[] =>
  nodes.filter((n) => !n.group);
/** The axis with its kinds: as written, or — when none
 * were written — as the nodes name them, in the order
 * they first appear. */
const filled = (
  axis: Axis,
  nodes: readonly FlowNode[],
): Axis =>
  axis.values.length > 0
    ? axis
    : {
        ...axis,
        values: bars(nodes)
          .flatMap((n) =>
            pipe(
              wordOn(axis.attribute)(n),
              matchOption(
                (): readonly string[] => [],
                (w: string) => [w],
              ),
            ),
          )
          .filter(
            (w, i, all) => all.indexOf(w) === i,
          ),
      };
/** The place of a node's word among the kinds of an
 * axis. */
const indexOn =
  (axis: Axis) =>
  (node: FlowNode): Option<number> =>
    pipe(
      wordOn(axis.attribute)(node),
      chainOption(
        (w: string): Option<number> =>
          axis.values.indexOf(w) < 0
            ? none()
            : some(axis.values.indexOf(w)),
      ),
    );

/** The first bar that names no kind the axis knows. */
const lost = (
  axis: Axis,
  nodes: readonly FlowNode[],
): Option<string> =>
  pipe(
    fromNullable(
      bars(nodes).find(
        (n) => !isSome(indexOn(axis)(n)),
      ),
    ),
    mapOption(
      (n: FlowNode) =>
        n.id +
        " に " +
        axis.attribute +
        " の値がありません（" +
        axis.values.join("・") +
        " のどれか）",
    ),
  );
const cellOf =
  (b: Bars) =>
  (node: FlowNode): string =>
    [
      pipe(indexOn(b.across)(node), getOr(-1)),
      pipe(
        b.deep,
        chainOption((d: Axis) =>
          indexOn(d)(node),
        ),
        getOr(0),
      ),
    ].join(",");
/** The first two bars that would stand in one place. */
const crowded = (
  b: Bars,
  nodes: readonly FlowNode[],
): Option<string> =>
  pipe(
    fromNullable(
      bars(nodes).find(
        (n, i, all) =>
          all
            .map(cellOf(b))
            .indexOf(cellOf(b)(n)) < i,
      ),
    ),
    mapOption(
      (n: FlowNode) =>
        n.id +
        " と同じ場所に別の棒があります（3 つ目の軸で奥行きに分けられます）",
    ),
  );
const sound = (
  b: Bars,
  nodes: readonly FlowNode[],
): Result<Bars, string> =>
  pipe(
    lost(b.across, nodes),
    matchOption(
      () =>
        pipe(
          b.deep,
          chainOption((d: Axis) =>
            lost(d, nodes),
          ),
        ),
      (refusal: string) => some(refusal),
    ),
    matchOption(
      () => crowded(b, nodes),
      (refusal: string) => some(refusal),
    ),
    matchOption(
      (): Result<Bars, string> => ok(b),
      (refusal: string) => err(refusal),
    ),
  );

/** A quantity whose range was not written starts from
 * nothing: a bar's height is the whole of its value. */
const grounded = (m: Measure): Measure =>
  m.written ? m : { ...m, lo: Math.min(0, m.lo) };

/** The bars a set of axis lines describes over a set of
 * nodes; a refusal says which line or node is wrong. */
export const asBars = (
  axes: readonly Axis[],
  nodes: readonly FlowNode[],
): Result<Bars, string> =>
  axes.length > 3
    ? err(
        "layout bars の軸は 3 つまでです（量、横に並べる種類、奥行きに分ける種類）",
      )
    : pipe(
        fromNullable(axes[0]),
        chainOption((quantity: Axis) =>
          pipe(
            fromNullable(axes[1]),
            mapOption((across: Axis) =>
              pipe(
                measureOf(nodes)(quantity),
                mapResult(
                  (told: Told): Bars => ({
                    measure: grounded(
                      told.measure,
                    ),
                    across: filled(across, nodes),
                    deep: pipe(
                      fromNullable(axes[2]),
                      mapOption((d: Axis) =>
                        filled(d, nodes),
                      ),
                    ),
                  }),
                ),
                chainResult((b: Bars) =>
                  sound(b, nodes),
                ),
              ),
            ),
          ),
        ),
        getOr<Result<Bars, string>>(
          err(
            "layout bars には量の軸と、横に並べる種類の軸が必要です",
          ),
        ),
      );

/** The place of `i` among `count` things `width` apart,
 * centred on zero. */
const centred = (
  i: number,
  count: number,
  width: number,
): number => (i - (count - 1) / 2) * width;
const kinds = (b: Bars): number =>
  Math.max(1, b.across.values.length);
const rows = (b: Bars): number =>
  pipe(
    b.deep,
    matchOption(
      () => 1,
      (d: Axis) => Math.max(1, d.values.length),
    ),
  );
/** Half the floor, across and in depth. */
const halfAcross = (b: Bars): number =>
  (kinds(b) * pitch) / 2;
const halfDeep = (b: Bars): number =>
  isSome(b.deep) ? (rows(b) * apart) / 2 : 0;
/** The floor the bars stand on (the screen's y runs
 * down). */
const floor = tall / 2;
const rise = (b: Bars, v: number): number =>
  Math.max(
    2,
    tall *
      Math.min(
        1,
        Math.max(0, along(b.measure, v)),
      ),
  );
const acrossAt = (b: Bars, i: number): number =>
  centred(i, kinds(b), pitch);
const deepAt = (b: Bars, j: number): number =>
  isSome(b.deep) ? centred(j, rows(b), apart) : 0;

const raised =
  (b: Bars) =>
  (node: FlowNode): FlowNode =>
    pipe(
      valueOn(b.measure.attribute)(node),
      chainOption((v: number) =>
        pipe(
          indexOn(b.across)(node),
          mapOption(
            (i: number): FlowNode => ({
              ...node,
              width: thick,
              height: rise(b, v),
              depth: thick / 2,
              bare: true,
              position: {
                x: acrossAt(b, i),
                y: floor - rise(b, v) / 2,
                z: deepAt(
                  b,
                  pipe(
                    b.deep,
                    chainOption((d: Axis) =>
                      indexOn(d)(node),
                    ),
                    getOr(0),
                  ),
                ),
              },
            }),
          ),
        ),
      ),
      getOr(node),
    );
/** The graph with every node a bar as tall as its
 * value, standing where its kinds put it. */
export const barsGraph = (
  b: Bars,
  graph: Graph,
): Graph => ({
  ...graph,
  nodes: graph.nodes.map(raised(b)),
});

/** The wall the scale is read against: behind the bars
 * of a field (the larger z is nearer the eye, so the
 * far side is the smaller), the sheet itself otherwise. */
const wall = (b: Bars): number => -halfDeep(b);
const front = (b: Bars): number => halfDeep(b);
const level = (t: number): number =>
  floor - tall * t;
const ground = (b: Bars): readonly Segment[] =>
  isSome(b.deep)
    ? [
        [
          {
            x: -halfAcross(b),
            y: floor,
            z: wall(b),
          },
          {
            x: halfAcross(b),
            y: floor,
            z: wall(b),
          },
        ],
        [
          {
            x: halfAcross(b),
            y: floor,
            z: wall(b),
          },
          {
            x: halfAcross(b),
            y: floor,
            z: front(b),
          },
        ],
        [
          {
            x: halfAcross(b),
            y: floor,
            z: front(b),
          },
          {
            x: -halfAcross(b),
            y: floor,
            z: front(b),
          },
        ],
        [
          {
            x: -halfAcross(b),
            y: floor,
            z: front(b),
          },
          {
            x: -halfAcross(b),
            y: floor,
            z: wall(b),
          },
        ],
        [
          {
            x: -halfAcross(b),
            y: floor,
            z: wall(b),
          },
          {
            x: -halfAcross(b),
            y: level(1),
            z: wall(b),
          },
        ],
      ]
    : [
        [
          { x: -halfAcross(b), y: floor, z: 0 },
          { x: halfAcross(b), y: floor, z: 0 },
        ],
        [
          { x: -halfAcross(b), y: floor, z: 0 },
          {
            x: -halfAcross(b),
            y: level(1),
            z: 0,
          },
        ],
      ];
/** The ruling: a line across the wall at each division
 * of the quantity. */
const ruling = (b: Bars): readonly Segment[] =>
  divisions.slice(1).map(
    (t): Segment => [
      {
        x: -halfAcross(b),
        y: level(t),
        z: wall(b),
      },
      {
        x: halfAcross(b),
        y: level(t),
        z: wall(b),
      },
    ],
  );
const scale = (b: Bars): readonly Scenery[] => [
  ...divisions.map((t) =>
    lettering(
      {
        x: -halfAcross(b),
        y: level(t),
        z: wall(b),
      },
      { x: -22, y: 4 },
      tickText(b.measure, t),
      400,
      pencil,
    ),
  ),
  lettering(
    {
      x: -halfAcross(b),
      y: level(1),
      z: wall(b),
    },
    { x: 30, y: -16 },
    hint(b.measure),
    600,
    ink,
  ),
];
const acrossNames = (
  b: Bars,
): readonly Scenery[] => [
  ...b.across.values.map((name, i) =>
    lettering(
      {
        x: acrossAt(b, i),
        y: floor,
        z: front(b),
      },
      { x: 0, y: 18 },
      name,
      400,
      ink,
    ),
  ),
  lettering(
    { x: 0, y: floor, z: front(b) },
    { x: 0, y: 40 },
    b.across.attribute,
    600,
    ink,
  ),
];
const deepNames = (b: Bars): readonly Scenery[] =>
  pipe(
    b.deep,
    matchOption(
      (): readonly Scenery[] => [],
      (d: Axis) => [
        ...d.values.map((name, j) =>
          lettering(
            {
              x: halfAcross(b),
              y: floor,
              z: deepAt(b, j),
            },
            { x: 30, y: 4 },
            name,
            400,
            ink,
          ),
        ),
        lettering(
          {
            x: halfAcross(b),
            y: floor,
            z: front(b),
          },
          { x: 44, y: 26 },
          d.attribute,
          600,
          ink,
        ),
      ],
    ),
  );

/** How good a value is: larger is better. */
const worth = (
  better: Better,
  v: number,
): number => (better === "higher" ? v : -v);
/** The bar that is best, when the quantity says which
 * way is better. */
const best = (
  b: Bars,
  nodes: readonly FlowNode[],
): Option<FlowNode> =>
  pipe(
    b.measure.better,
    chainOption((better: Better) =>
      bars(nodes).reduce(
        (
          found: Option<FlowNode>,
          n: FlowNode,
        ): Option<FlowNode> =>
          pipe(
            valueOn(b.measure.attribute)(n),
            matchOption(
              () => found,
              (v: number) =>
                pipe(
                  found,
                  chainOption((f: FlowNode) =>
                    valueOn(b.measure.attribute)(
                      f,
                    ),
                  ),
                  matchOption(
                    () => some(n),
                    (w: number) =>
                      worth(better, v) >
                      worth(better, w)
                        ? some(n)
                        : found,
                  ),
                ),
            ),
          ),
        none(),
      ),
    ),
  );
const crown = (
  b: Bars,
  nodes: readonly FlowNode[],
): readonly Scenery[] =>
  pipe(
    best(b, nodes),
    matchOption(
      (): readonly Scenery[] => [],
      (n: FlowNode) => [
        lettering(
          {
            ...n.position,
            y:
              n.position.y -
              pipe(
                fromNullable(n.height),
                getOr(0),
              ) /
                2,
          },
          { x: 0, y: -30 },
          "◎ 最良",
          600,
          ink,
        ),
      ],
    ),
  );

/** Everything drawn around the bars: the ground, the
 * ruling, the scale, and the names of the kinds. */
export const barsScenery = (
  b: Bars,
  nodes: readonly FlowNode[],
): readonly Scenery[] => [
  ...strokes(trace, false, ruling(b)),
  ...strokes(pencil, false, ground(b)),
  ...scale(b),
  ...acrossNames(b),
  ...deepNames(b),
  ...crown(b, nodes),
];

/** Points that bound the bars with room for the scale
 * and the names. */
export const barsExtent = (
  b: Bars,
): readonly Point3[] =>
  [wall(b), front(b)].flatMap((z) => [
    {
      x: -halfAcross(b) - 56,
      y: level(1) - 56,
      z,
    },
    {
      x: halfAcross(b) + 72,
      y: floor + 56,
      z,
    },
  ]);

/** The lines of the DSL that say the bars. */
export const barsLines = (
  b: Bars,
): readonly (readonly string[])[] => [
  ["layout", "bars"],
  [
    "axis",
    b.measure.attribute,
    ...measureWords(b.measure),
  ],
  [
    "axis",
    b.across.attribute,
    ...b.across.values,
  ],
  ...pipe(
    b.deep,
    matchOption(
      (): readonly (readonly string[])[] => [],
      (d: Axis) => [
        ["axis", d.attribute, ...d.values],
      ],
    ),
  ),
];
/** Whether the bars stand in a field, not a row. */
export const barsDeep = (b: Bars): boolean =>
  isSome(b.deep);
