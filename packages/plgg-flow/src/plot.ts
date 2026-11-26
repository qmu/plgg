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
}>;
export type Plot = Readonly<{
  x: Measure;
  y: Measure;
  z: Option<Measure>;
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
}>;
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
          : pipe(
              rangeOf(word),
              matchOption(
                (): Result<Said, string> =>
                  err(
                    "axis 属性 [下限..上限] [lower|higher] と書きます（「" +
                      word +
                      "」は読めません）",
                  ),
                (range: Range) =>
                  ok({
                    ...s,
                    range: some(range),
                  }),
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
      }),
      (r: Range): Measure => ({
        attribute,
        ...r,
        written: true,
        better: said.better,
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

const measureOf =
  (nodes: readonly FlowNode[]) =>
  (axis: Axis): Result<Measure, string> =>
    pipe(
      axis.values.reduce(
        saying,
        ok<Said>({
          range: none(),
          better: none(),
        }),
      ),
      chainResult((said: Said) =>
        pipe(
          valuesOf(
            axis.attribute,
            nodes.filter((n) => !n.group),
          ),
          mapResult((values: readonly number[]) =>
            measured(
              axis.attribute,
              values,
              said,
            ),
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
    : ["x", "y", "z"].flatMap((role) =>
        axes
          .filter(
            (a) =>
              roles.get(a.attribute) === role,
          )
          .slice(0, 1),
      );

const spannedBy = (
  measures: readonly Measure[],
): Result<Plot, string> =>
  pipe(
    fromNullable(measures[0]),
    chainOption((x: Measure) =>
      pipe(
        fromNullable(measures[1]),
        mapOption(
          (y: Measure): Plot => ({
            x,
            y,
            z: fromNullable(measures[2]),
          }),
        ),
      ),
    ),
    matchOption(
      (): Result<Plot, string> =>
        err(
          "layout plot には数値の軸が 2 つか 3 つ必要です",
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
  axes.length > 3
    ? err(
        "layout plot の軸は 3 つまでです（4 つ目は置けません）",
      )
    : pipe(
        all(
          inRoles(axes, roles).map(
            measureOf(nodes),
          ),
        ),
        chainResult(spannedBy),
      );

/** How far along a measure a value is: 0 at its low end,
 * 1 at its high end. */
const along = (m: Measure, v: number): number =>
  (v - m.lo) / (m.hi - m.lo);
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
const measuresOf = (
  plot: Plot,
): readonly Measure[] => [
  plot.x,
  plot.y,
  ...pipe(
    plot.z,
    matchOption(
      (): readonly Measure[] => [],
      (z: Measure) => [z],
    ),
  ),
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
/** The nodes some other node beats. */
export const dominated = (
  plot: Plot,
  nodes: readonly FlowNode[],
): ReadonlySet<string> =>
  pipe(
    standings(
      plot,
      nodes.filter((n) => !n.group),
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
    stood(plot, dominated(plot, graph.nodes)),
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
const tickText = (
  m: Measure,
  t: number,
): string => shown(m.lo + (m.hi - m.lo) * t);
const hint = (m: Measure): string =>
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
/** The near edge of the space: the low end of the depth
 * measure in a deep plot (the eye looks along it). */
const front = (plot: Plot): number =>
  isSome(plot.z) ? 0 : 0.5;

/** The far edge of the space, where the upright scale
 * stands clear of the nodes. */
const rear = (plot: Plot): number =>
  isSome(plot.z) ? 1 : 0.5;

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
    placed(plot, 1, 0, 1),
    { x: 70, y: -16 },
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
    measuresOf(plot).flatMap((m) =>
      pipe(
        bestEnd(m),
        matchOption(
          (): readonly number[] => [],
          (t: number) => [t],
        ),
      ),
    ),
    (ends): readonly Scenery[] =>
      ends.length === measuresOf(plot).length
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

/** Everything drawn around the nodes of a plot: the
 * frame, the ruling, the scales with their names and
 * which way is better, and the plumb lines. */
export const plotScenery = (
  plot: Plot,
  nodes: readonly FlowNode[],
): readonly Scenery[] => [
  ...strokes(trace, false, ruling(plot)),
  ...strokes(pencil, false, frame(plot)),
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
  placed(plot, -0.12, -0.14, 0),
  placed(plot, 1.12, 1.08, 0),
  placed(plot, -0.12, -0.14, 1),
  placed(plot, 1.12, 1.08, 1),
];

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
];
/** The measures of a plot in the order x, y, z. */
export const plotMeasures = measuresOf;
