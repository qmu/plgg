import {
  pipe,
  ok,
  err,
  isErr,
  isOk,
  none,
  some,
  isSome,
  fromNullable,
  chainOption,
  mapOption,
  matchOption,
  getOr,
  mapResult,
  chainResult,
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

/**
 * THE PLOT: things placed in a space of MEASURES.
 *
 * A measure is a numeric attribute with a range and,
 * optionally, the direction that is better. Two or three
 * measures span the space; every node stands where its
 * values put it. When measures say which way is better,
 * a node that another node beats on every such measure
 * is DOMINATED and drawn quietly — what is left standing
 * out is the set of choices worth weighing.
 *
 * Written in the DSL as:
 *
 *   layout plot
 *   axis コスト 0..200 lower
 *   axis 性能 0..100 higher
 *   node 案A コスト=120 性能=80
 */
export type Better = "lower" | "higher";
export type Measure = Readonly<{
  attribute: string;
  lo: number;
  hi: number;
  /** Whether the range was written, or taken from the
   * values. */
  written: boolean;
  better: Option<Better>;
  /** The least and the most a value may be: a
   * CONDITION the choice has to meet. */
  least: Option<number>;
  most: Option<number>;
}>;
export type Plot = Readonly<{
  x: Measure;
  y: Measure;
  z: Option<Measure>;
  /** A measure shown as how LARGE a node is drawn,
   * not where it stands. */
  size: Option<Measure>;
}>;

/** The space a plot is drawn in, in world units. */
const size: Point3 = { x: 480, y: 320, z: 320 };

const finite = (n: number): Option<number> =>
  Number.isFinite(n) ? some(n) : none();
const numberOf = (v: unknown): Option<number> =>
  typeof v === "number"
    ? finite(v)
    : typeof v === "string" && v.trim() !== ""
      ? finite(Number(v))
      : none();
/** A node's value on an attribute, when it has a number
 * there. */
export const valueOn =
  (attribute: string) =>
  (node: FlowNode): Option<number> =>
    pipe(
      fromNullable(node.data),
      chainOption((data: JsonObject) =>
        fromNullable(data[attribute]),
      ),
      chainOption((v: JsonValue) => numberOf(v)),
    );

export type Range = Readonly<{
  lo: number;
  hi: number;
}>;
const rangeFrom = (
  lo: Option<number>,
  hi: Option<number>,
): Option<Range> =>
  isSome(lo) &&
  isSome(hi) &&
  lo.content < hi.content
    ? some({ lo: lo.content, hi: hi.content })
    : none();
/** `0..200` as a range. */
export const rangeOf = (
  word: string,
): Option<Range> =>
  word.split("..").length === 2
    ? rangeFrom(
        numberOf(word.split("..")[0]),
        numberOf(word.split("..")[1]),
      )
    : none();

/** What an axis line says beyond its name. */
type Said = Readonly<{
  range: Option<Range>;
  better: Option<Better>;
  least: Option<number>;
  most: Option<number>;
  size: boolean;
}>;
const unsaid: Said = {
  range: none(),
  better: none(),
  least: none(),
  most: none(),
  size: false,
};
/** `>=50` or `<=150` as a bound, when the word is one. */
const bound = (
  sign: string,
  word: string,
): Option<number> =>
  word.startsWith(sign)
    ? numberOf(word.slice(sign.length))
    : none();
const bounded = (
  s: Said,
  word: string,
): Option<Said> =>
  pipe(
    bound(">=", word),
    matchOption(
      (): Option<Said> =>
        pipe(
          bound("<=", word),
          mapOption(
            (n: number): Said => ({
              ...s,
              most: some(n),
            }),
          ),
        ),
      (n: number): Option<Said> =>
        some({ ...s, least: some(n) }),
    ),
  );
const refused = (
  word: string,
): Result<Said, string> =>
  err(
    "axis 属性 [下限..上限] [lower|higher] [>=値] [<=値] [size] と書きます（「" +
      word +
      "」は読めません）",
  );
const saying = (
  said: Result<Said, string>,
  word: string,
): Result<Said, string> =>
  pipe(
    said,
    chainResult(
      (s: Said): Result<Said, string> =>
        word === "lower" || word === "higher"
          ? ok({ ...s, better: some(word) })
          : word === "size"
            ? ok({ ...s, size: true })
            : pipe(
                bounded(s, word),
                matchOption(
                  (): Result<Said, string> =>
                    pipe(
                      rangeOf(word),
                      matchOption(
                        () => refused(word),
                        (range: Range) =>
                          ok({
                            ...s,
                            range: some(range),
                          }),
                      ),
                    ),
                  (t: Said) => ok(t),
                ),
              ),
    ),
  );

/** The range the values themselves span, opened a
 * little when they all agree. */
export const spanned = (
  values: readonly number[],
): Range =>
  values.length === 0
    ? { lo: 0, hi: 1 }
    : Math.min(...values) < Math.max(...values)
      ? {
          lo: Math.min(...values),
          hi: Math.max(...values),
        }
      : {
          lo: Math.min(...values) - 1,
          hi: Math.max(...values) + 1,
        };
const measured = (
  attribute: string,
  values: readonly number[],
  said: Said,
): Measure =>
  pipe(
    said.range,
    matchOption(
      (): Measure => ({
        attribute,
        ...spanned(values),
        written: false,
        better: said.better,
        least: said.least,
        most: said.most,
      }),
      (r: Range): Measure => ({
        attribute,
        ...r,
        written: true,
        better: said.better,
        least: said.least,
        most: said.most,
      }),
    ),
  );

/** Every value when all are there; the first node
 * without one otherwise. */
const valuesOf = (
  attribute: string,
  nodes: readonly FlowNode[],
): Result<readonly number[], string> =>
  pipe(
    fromNullable(
      nodes.find(
        (n) => !isSome(valueOn(attribute)(n)),
      ),
    ),
    matchOption(
      (): Result<readonly number[], string> =>
        ok(
          nodes.flatMap((n) =>
            pipe(
              valueOn(attribute)(n),
              matchOption(
                (): readonly number[] => [],
                (v: number) => [v],
              ),
            ),
          ),
        ),
      (n: FlowNode) =>
        err(
          n.id +
            " に " +
            attribute +
            " の数値がありません",
        ),
    ),
  );

/** A measure as an axis line told it, and whether the
 * line gave it to size rather than to place. */
export type Told = Readonly<{
  measure: Measure;
  size: boolean;
}>;
export const measureOf =
  (nodes: readonly FlowNode[]) =>
  (axis: Axis): Result<Told, string> =>
    pipe(
      axis.values.reduce(saying, ok(unsaid)),
      chainResult((said: Said) =>
        pipe(
          valuesOf(
            axis.attribute,
            nodes.filter((n) => !n.group),
          ),
          mapResult(
            (
              values: readonly number[],
            ): Told => ({
              measure: measured(
                axis.attribute,
                values,
                said,
              ),
              size: said.size,
            }),
          ),
        ),
      ),
    );

/** The axes in the order x, y, z: as `view` assigned
 * them, or as they were written. */
const inRoles = (
  axes: readonly Axis[],
  roles: ReadonlyMap<string, string>,
): readonly Axis[] =>
  roles.size === 0
    ? axes
    : [
        ...["x", "y", "z"].flatMap((role) =>
          axes
            .filter(
              (a) =>
                roles.get(a.attribute) === role,
            )
            .slice(0, 1),
        ),
        ...axes.filter(
          (a) => !roles.has(a.attribute),
        ),
      ];

const placing = (
  told: readonly Told[],
): readonly Measure[] =>
  told
    .filter((t) => !t.size)
    .map((t) => t.measure);
const sizing = (
  told: readonly Told[],
): readonly Measure[] =>
  told
    .filter((t) => t.size)
    .map((t) => t.measure);
const spannedBy = (
  told: readonly Told[],
): Result<Plot, string> =>
  sizing(told).length > 1
    ? err("size と書ける軸は 1 つです")
    : placing(told).length > 3
      ? err(
          "layout plot で場所に使える軸は 3 つまでです（もう 1 つは size と書けば大きさで表せます）",
        )
      : pipe(
          fromNullable(placing(told)[0]),
          chainOption((x: Measure) =>
            pipe(
              fromNullable(placing(told)[1]),
              mapOption(
                (y: Measure): Plot => ({
                  x,
                  y,
                  z: fromNullable(
                    placing(told)[2],
                  ),
                  size: fromNullable(
                    sizing(told)[0],
                  ),
                }),
              ),
            ),
          ),
          matchOption(
            (): Result<Plot, string> =>
              err(
                "layout plot には場所に使う数値の軸が 2 つか 3 つ必要です",
              ),
            (plot: Plot) => ok(plot),
          ),
        );

/** Every result when all are sound; the first refusal
 * otherwise. */
export const all = <T>(
  results: readonly Result<T, string>[],
): Result<readonly T[], string> =>
  pipe(
    fromNullable(
      results.flatMap((r) =>
        isErr(r) ? [r.content] : [],
      )[0],
    ),
    matchOption(
      (): Result<readonly T[], string> =>
        ok(
          results.flatMap((r) =>
            isOk(r) ? [r.content] : [],
          ),
        ),
      (refusal: string) => err(refusal),
    ),
  );

/** The plot a set of axis lines describes over a set of
 * nodes; a refusal says which line or node is wrong. */
export const asPlot = (
  axes: readonly Axis[],
  roles: ReadonlyMap<string, string>,
  nodes: readonly FlowNode[],
): Result<Plot, string> =>
  pipe(
    all(
      inRoles(axes, roles).map(measureOf(nodes)),
    ),
    chainResult(spannedBy),
  );

/** How far along a measure a value is: 0 at its low end,
 * 1 at its high end. */
export const along = (
  m: Measure,
  v: number,
): number => (v - m.lo) / (m.hi - m.lo);
/** Where a point of the unit cube stands in the world:
 * x to the right, y UP (the screen's y runs down), z
 * toward the eye. A flat plot has no depth. */
const placed = (
  plot: Plot,
  tx: number,
  ty: number,
  tz: number,
): Point3 => ({
  x: (tx - 0.5) * size.x,
  y: (0.5 - ty) * size.y,
  z: isSome(plot.z) ? (tz - 0.5) * size.z : 0,
});
const maybe = (
  m: Option<Measure>,
): readonly Measure[] =>
  pipe(
    m,
    matchOption(
      (): readonly Measure[] => [],
      (given: Measure) => [given],
    ),
  );
/** Every measure of the plot: those that place, in the
 * order x, y, z, then the one that sizes. */
const measuresOf = (
  plot: Plot,
): readonly Measure[] => [
  plot.x,
  plot.y,
  ...maybe(plot.z),
  ...maybe(plot.size),
];
const placesOf = (
  plot: Plot,
): readonly Measure[] => [
  plot.x,
  plot.y,
  ...maybe(plot.z),
];
/** A node's values on every measure of the plot, when
 * it has them all. */
const readings = (
  plot: Plot,
  node: FlowNode,
): Option<readonly number[]> =>
  pipe(
    measuresOf(plot).flatMap((m) =>
      pipe(
        valueOn(m.attribute)(node),
        matchOption(
          (): readonly number[] => [],
          (v: number) => [v],
        ),
      ),
    ),
    (values): Option<readonly number[]> =>
      values.length === measuresOf(plot).length
        ? some(values)
        : none(),
  );
const at = (
  plot: Plot,
  values: readonly number[],
): Point3 =>
  placed(
    plot,
    along(
      plot.x,
      pipe(
        fromNullable(values[0]),
        getOr(plot.x.lo),
      ),
    ),
    along(
      plot.y,
      pipe(
        fromNullable(values[1]),
        getOr(plot.y.lo),
      ),
    ),
    pipe(
      plot.z,
      matchOption(
        () => 0.5,
        (z: Measure) =>
          along(
            z,
            pipe(
              fromNullable(values[2]),
              getOr(z.lo),
            ),
          ),
      ),
    ),
  );

/** A node's standing on the measures that say which way
 * is better: larger is better on every entry. */
const standing = (
  plot: Plot,
  values: readonly number[],
): readonly number[] =>
  measuresOf(plot).flatMap((m, i) =>
    pipe(
      m.better,
      matchOption(
        (): readonly number[] => [],
        (b: Better) =>
          values
            .slice(i, i + 1)
            .map((v) =>
              b === "higher" ? v : -v,
            ),
      ),
    ),
  );
/** Whether `a` is at least as good as `b` everywhere and
 * better somewhere. */
const beats = (
  a: readonly number[],
  b: readonly number[],
): boolean =>
  a.every((v, i) =>
    b.slice(i, i + 1).every((w) => v >= w),
  ) &&
  a.some((v, i) =>
    b.slice(i, i + 1).some((w) => v > w),
  );

type Standing = Readonly<{
  id: string;
  score: readonly number[];
}>;
const standings = (
  plot: Plot,
  nodes: readonly FlowNode[],
): readonly Standing[] =>
  nodes.flatMap((n) =>
    pipe(
      readings(plot, n),
      matchOption(
        (): readonly Standing[] => [],
        (values: readonly number[]) => [
          {
            id: n.id,
            score: standing(plot, values),
          },
        ],
      ),
    ),
  );
const within = (m: Measure, v: number): boolean =>
  pipe(
    m.least,
    matchOption(
      () => true,
      (least: number) => v >= least,
    ),
  ) &&
  pipe(
    m.most,
    matchOption(
      () => true,
      (most: number) => v <= most,
    ),
  );
const meets =
  (plot: Plot) =>
  (node: FlowNode): boolean =>
    pipe(
      readings(plot, node),
      matchOption(
        () => true,
        (values: readonly number[]) =>
          measuresOf(plot).every((m, i) =>
            values
              .slice(i, i + 1)
              .every((v) => within(m, v)),
          ),
      ),
    );
/** The nodes that break a condition some measure sets. */
export const unfit = (
  plot: Plot,
  nodes: readonly FlowNode[],
): ReadonlySet<string> =>
  new Set(
    nodes
      .filter((n) => !n.group && !meets(plot)(n))
      .map((n) => n.id),
  );
/** The nodes some other node beats, among those that
 * meet every condition: one that breaks a condition
 * neither beats nor is beaten. */
export const dominated = (
  plot: Plot,
  nodes: readonly FlowNode[],
): ReadonlySet<string> =>
  pipe(
    standings(
      plot,
      nodes.filter(
        (n) => !n.group && meets(plot)(n),
      ),
    ),
    (all) =>
      new Set(
        all
          .filter((b) =>
            all.some((a) =>
              beats(a.score, b.score),
            ),
          )
          .map((b) => b.id),
      ),
  );

/** The side of the mark a node is drawn as: one size
 * for all, or as large as its value on the measure that
 * sizes. */
const dot = 14;
const least = 10;
const most = 44;
const side = (
  plot: Plot,
  values: readonly number[],
): number =>
  pipe(
    plot.size,
    chainOption((m: Measure) =>
      pipe(
        fromNullable(values[values.length - 1]),
        mapOption(
          (v: number) =>
            least +
            (most - least) *
              Math.min(
                1,
                Math.max(0, along(m, v)),
              ),
        ),
      ),
    ),
    getOr(dot),
  );
const stood =
  (plot: Plot, beaten: ReadonlySet<string>) =>
  (node: FlowNode): FlowNode =>
    pipe(
      readings(plot, node),
      matchOption(
        () => node,
        (
          values: readonly number[],
        ): FlowNode => ({
          ...node,
          position: at(plot, values),
          width: side(plot, values),
          height: side(plot, values),
          bare: true,
          ...(beaten.has(node.id)
            ? { quiet: true }
            : {}),
        }),
      ),
    );
/** The graph with every node standing where its values
 * put it, the dominated ones drawn quietly. */
export const plotGraph = (
  plot: Plot,
  graph: Graph,
): Graph => ({
  ...graph,
  nodes: graph.nodes.map(
    stood(
      plot,
      new Set([
        ...dominated(plot, graph.nodes),
        ...unfit(plot, graph.nodes),
      ]),
    ),
  ),
});

export const pencil = "var(--pencil,gray)";
export const trace = "var(--trace,gray)";
export const ink = "var(--ink,black)";
export type Segment = readonly [Point3, Point3];

/** Several strokes as one line, when there is any. */
export const strokes = (
  tone: string,
  dotted: boolean,
  segments: readonly Segment[],
): readonly Scenery[] =>
  segments.slice(0, 1).map(
    (first): Scenery => ({
      kind: "line",
      layer: "behind",
      tone,
      width: 1,
      points: first,
      strokes: segments.slice(1),
      ...(dotted ? { dotted: true } : {}),
    }),
  );
export const lettering = (
  anchor: Point3,
  offset: Readonly<{ x: number; y: number }>,
  text: string,
  weight: number,
  tone: string,
): Scenery => ({
  kind: "label",
  layer: "front",
  anchor,
  offset,
  text,
  size: 11,
  weight,
  tone,
});

export const divisions: readonly number[] = [
  0, 0.25, 0.5, 0.75, 1,
];
export const shown = (v: number): string =>
  String(Number(v.toFixed(2)));
export const tickText = (
  m: Measure,
  t: number,
): string => shown(m.lo + (m.hi - m.lo) * t);
export const hint = (m: Measure): string =>
  pipe(
    m.better,
    matchOption(
      () => m.attribute,
      (b: Better) =>
        m.attribute +
        (b === "lower"
          ? "（低いほど良い）"
          : "（高いほど良い）"),
    ),
  );
/** The near edge of the space: the high end of the
 * depth measure in a deep plot (the larger z is nearer
 * the eye). */
const front = (plot: Plot): number =>
  isSome(plot.z) ? 1 : 0.5;

/** The far edge of the space, where the upright scale
 * stands clear of the nodes. */
const rear = (plot: Plot): number =>
  isSome(plot.z) ? 0 : 0.5;

/** The frame: the outline of the space. */
const frame = (plot: Plot): readonly Segment[] =>
  isSome(plot.z)
    ? [0, 1].flatMap((a) =>
        [0, 1].flatMap(
          (b): readonly Segment[] => [
            [
              placed(plot, 0, a, b),
              placed(plot, 1, a, b),
            ],
            [
              placed(plot, a, 0, b),
              placed(plot, a, 1, b),
            ],
            [
              placed(plot, a, b, 0),
              placed(plot, a, b, 1),
            ],
          ],
        ),
      )
    : [
        [
          placed(plot, 0, 0, 0.5),
          placed(plot, 1, 0, 0.5),
        ],
        [
          placed(plot, 1, 0, 0.5),
          placed(plot, 1, 1, 0.5),
        ],
        [
          placed(plot, 1, 1, 0.5),
          placed(plot, 0, 1, 0.5),
        ],
        [
          placed(plot, 0, 1, 0.5),
          placed(plot, 0, 0, 0.5),
        ],
      ];
/** The ruling: lines across the floor of a deep plot,
 * across the sheet of a flat one. */
const ruling = (plot: Plot): readonly Segment[] =>
  divisions
    .slice(1, -1)
    .flatMap((t): readonly Segment[] =>
      isSome(plot.z)
        ? [
            [
              placed(plot, t, 0, 0),
              placed(plot, t, 0, 1),
            ],
            [
              placed(plot, 0, 0, t),
              placed(plot, 1, 0, t),
            ],
          ]
        : [
            [
              placed(plot, t, 0, 0.5),
              placed(plot, t, 1, 0.5),
            ],
            [
              placed(plot, 0, t, 0.5),
              placed(plot, 1, t, 0.5),
            ],
          ],
    );

const xTicks = (
  plot: Plot,
): readonly Scenery[] => [
  ...divisions.map((t) =>
    lettering(
      placed(plot, t, 0, front(plot)),
      { x: 0, y: 16 },
      tickText(plot.x, t),
      400,
      pencil,
    ),
  ),
  lettering(
    placed(plot, 0.5, 0, front(plot)),
    { x: 0, y: 40 },
    hint(plot.x),
    600,
    ink,
  ),
];
const yTicks = (
  plot: Plot,
): readonly Scenery[] => [
  ...divisions.map((t) =>
    lettering(
      placed(plot, 0, t, rear(plot)),
      { x: -22, y: 4 },
      tickText(plot.y, t),
      400,
      pencil,
    ),
  ),
  lettering(
    placed(plot, 0, 1, rear(plot)),
    { x: 30, y: -14 },
    hint(plot.y),
    600,
    ink,
  ),
];
const zTicks = (
  plot: Plot,
  z: Measure,
): readonly Scenery[] => [
  ...divisions
    .slice(1)
    .map((t) =>
      lettering(
        placed(plot, 1, 0, t),
        { x: 22, y: 4 },
        tickText(z, t),
        400,
        pencil,
      ),
    ),
  lettering(
    placed(plot, 1, 0, 0),
    { x: 70, y: -14 },
    hint(z),
    600,
    ink,
  ),
];

/** The end of a measure that is better: 1 for higher,
 * 0 for lower; none when it does not say. */
const bestEnd = (m: Measure): Option<number> =>
  pipe(
    m.better,
    mapOption((b: Better) =>
      b === "higher" ? 1 : 0,
    ),
  );
/** The corner where every measure is at its better end,
 * named when every measure says which end that is. */
const ideal = (plot: Plot): readonly Scenery[] =>
  pipe(
    placesOf(plot).flatMap((m) =>
      pipe(
        bestEnd(m),
        matchOption(
          (): readonly number[] => [],
          (t: number) => [t],
        ),
      ),
    ),
    (ends): readonly Scenery[] =>
      ends.length === placesOf(plot).length
        ? [
            lettering(
              placed(
                plot,
                pipe(
                  fromNullable(ends[0]),
                  getOr(0),
                ),
                pipe(
                  fromNullable(ends[1]),
                  getOr(0),
                ),
                pipe(
                  fromNullable(ends[2]),
                  getOr(0.5),
                ),
              ),
              {
                x:
                  pipe(
                    fromNullable(ends[0]),
                    getOr(0),
                  ) < 0.5
                    ? 34
                    : -34,
                y:
                  pipe(
                    fromNullable(ends[1]),
                    getOr(0),
                  ) < 0.5
                    ? -12
                    : 18,
              },
              "◎ 理想",
              600,
              ink,
            ),
          ]
        : [],
  );

/** In a deep plot, a line from each node down to the
 * floor: without it a point in space cannot be read. */
const plumbs = (
  nodes: readonly FlowNode[],
): readonly Segment[] =>
  nodes
    .filter((n) => !n.group)
    .map(
      (n): Segment => [
        n.position,
        { ...n.position, y: size.y / 2 },
      ],
    );

/** The part of a measure its conditions leave, as two
 * places along it (0 to 1). */
const leave = (m: Measure): Range => ({
  lo: pipe(
    m.least,
    matchOption(
      () => 0,
      (v: number) =>
        Math.min(1, Math.max(0, along(m, v))),
    ),
  ),
  hi: pipe(
    m.most,
    matchOption(
      () => 1,
      (v: number) =>
        Math.min(1, Math.max(0, along(m, v))),
    ),
  ),
});
const conditioned = (m: Measure): boolean =>
  isSome(m.least) || isSome(m.most);
const depthLeft = (plot: Plot): Range =>
  pipe(
    plot.z,
    matchOption(
      (): Range => ({ lo: 0.5, hi: 0.5 }),
      (z: Measure) => leave(z),
    ),
  );
/** The edges of the box the conditions leave. */
const edgesLeft = (
  plot: Plot,
  x: Range,
  y: Range,
  z: Range,
): readonly Segment[] =>
  [y.lo, y.hi]
    .flatMap((b) =>
      [z.lo, z.hi].flatMap(
        (c): readonly Segment[] => [
          [
            placed(plot, x.lo, b, c),
            placed(plot, x.hi, b, c),
          ],
        ],
      ),
    )
    .concat(
      [x.lo, x.hi].flatMap((a) =>
        [z.lo, z.hi].flatMap(
          (c): readonly Segment[] => [
            [
              placed(plot, a, y.lo, c),
              placed(plot, a, y.hi, c),
            ],
          ],
        ),
      ),
      [x.lo, x.hi].flatMap((a) =>
        [y.lo, y.hi].flatMap(
          (b): readonly Segment[] => [
            [
              placed(plot, a, b, z.lo),
              placed(plot, a, b, z.hi),
            ],
          ],
        ),
      ),
    );
/** The ground the conditions leave, hatched: the sheet
 * itself in a flat plot, the floor in a deep one. Lines
 * and not a wash, so it reads the same on any paper. */
const hatches = 12;
const stepped = (r: Range, k: number): number =>
  r.lo + ((r.hi - r.lo) * k) / hatches;
const groundLeft = (
  plot: Plot,
  x: Range,
  y: Range,
  z: Range,
): readonly Segment[] =>
  Array.from(
    { length: hatches - 1 },
    (_, k): Segment =>
      isSome(plot.z)
        ? [
            placed(
              plot,
              x.lo,
              0,
              stepped(z, k + 1),
            ),
            placed(
              plot,
              x.hi,
              0,
              stepped(z, k + 1),
            ),
          ]
        : [
            placed(
              plot,
              x.lo,
              stepped(y, k + 1),
              0.5,
            ),
            placed(
              plot,
              x.hi,
              stepped(y, k + 1),
              0.5,
            ),
          ],
  );
/** WHERE THE CONDITIONS HOLD: the box they leave of the
 * space, outlined, its ground hatched, and named. Nothing
 * when no measure that places sets a condition. */
const region = (
  plot: Plot,
): readonly Scenery[] =>
  placesOf(plot).some(conditioned)
    ? [
        ...strokes(
          pencil,
          false,
          groundLeft(
            plot,
            leave(plot.x),
            leave(plot.y),
            depthLeft(plot),
          ),
        ),
        ...strokes(
          ink,
          true,
          edgesLeft(
            plot,
            leave(plot.x),
            leave(plot.y),
            depthLeft(plot),
          ),
        ),
        lettering(
          placed(
            plot,
            leave(plot.x).hi,
            leave(plot.y).lo,
            depthLeft(plot).hi,
          ),
          { x: -26, y: -8 },
          "条件内",
          600,
          ink,
        ),
      ]
    : [];
/** What the size of a mark says, written under the
 * space. */
const sizes = (plot: Plot): readonly Scenery[] =>
  pipe(
    plot.size,
    matchOption(
      (): readonly Scenery[] => [],
      (m: Measure) => [
        lettering(
          placed(plot, 0.5, 0, front(plot)),
          { x: 0, y: 60 },
          "印の大きさ: " +
            hint(m) +
            " " +
            shown(m.lo) +
            "〜" +
            shown(m.hi),
          400,
          pencil,
        ),
      ],
    ),
  );

/** Everything drawn around the nodes of a plot: the
 * frame, the ruling, the scales with their names and
 * which way is better, and the plumb lines. */
export const plotScenery = (
  plot: Plot,
  nodes: readonly FlowNode[],
): readonly Scenery[] => [
  ...strokes(trace, false, ruling(plot)),
  ...strokes(pencil, false, frame(plot)),
  ...region(plot),
  ...sizes(plot),
  ...pipe(
    plot.z,
    matchOption(
      (): readonly Scenery[] => [],
      (z: Measure) => [
        ...strokes(pencil, true, plumbs(nodes)),
        ...zTicks(plot, z),
      ],
    ),
  ),
  ...xTicks(plot),
  ...yTicks(plot),
  ...ideal(plot),
];

/** Points that bound a plot with room for its scales,
 * so that fitting the view keeps them on the sheet. */
export const plotExtent = (
  plot: Plot,
): readonly Point3[] => [
  placed(plot, -0.12, -0.2, 0),
  placed(plot, reach(plot), 1.08, 0),
  placed(plot, -0.12, -0.2, 1),
  placed(plot, reach(plot), 1.08, 1),
];
/** How far right the scales reach: a deep plot names
 * its depth out past the right edge. */
const reach = (plot: Plot): number =>
  isSome(plot.z) ? 1.4 : 1.12;

/** The words of an axis line that say what a measure is. */
export const measureWords = (
  m: Measure,
): readonly string[] => [
  ...(m.written
    ? [shown(m.lo) + ".." + shown(m.hi)]
    : []),
  ...pipe(
    m.better,
    matchOption(
      (): readonly string[] => [],
      (b: Better) => [b],
    ),
  ),
  ...pipe(
    m.least,
    matchOption(
      (): readonly string[] => [],
      (v: number) => [">=" + shown(v)],
    ),
  ),
  ...pipe(
    m.most,
    matchOption(
      (): readonly string[] => [],
      (v: number) => ["<=" + shown(v)],
    ),
  ),
];
/** The lines of the DSL that say a plot. */
export const plotLines = (
  plot: Plot,
): readonly (readonly string[])[] => [
  ["layout", "plot"],
  ...placesOf(plot).map((m) => [
    "axis",
    m.attribute,
    ...measureWords(m),
  ]),
  ...maybe(plot.size).map((m) => [
    "axis",
    m.attribute,
    ...measureWords(m),
    "size",
  ]),
];
