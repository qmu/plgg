import {
  pipe,
  isSome,
  chainOption,
  mapOption,
  matchOption,
  fromNullable,
  getOr,
  none,
  some,
  err,
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
  lettering,
  ink,
  strokes,
  pencil,
  trace,
  valueOn,
} from "plgg-flow/plot";
import {
  acrossAt,
  acrossNames,
  bars,
  crown,
  deepAt,
  halfAcross,
  halfDeep,
  fieldLines,
  fieldOf,
  floor,
  ground,
  indexOn,
  level,
  rows,
  ruling,
  scale,
  barsExtent,
  type Bars,
} from "plgg-flow/bars";

/**
 * THE AREA: one quantity, followed along an order.
 *
 * It reads the same lines the bars do. The first axis is
 * the quantity; the second is the order it is followed
 * along — months, steps, sizes; a third, when written,
 * names the SERIES, each drawn as its own filled outline,
 * one behind another in depth. A series hides what stands
 * behind and below it, so which is ahead, where, and when
 * it is overtaken is seen as a range of ridges.
 *
 *   layout area
 *   axis 売上 0..100 higher
 *   axis 月 1月 2月 3月
 *   axis 地域 東 西
 *   node 東1 月=1月 地域=東 売上=40
 */
export type Area = Bars &
  Readonly<{
    /** How the series are drawn: `area` filled, one
     * behind another; `line` as lines in one plane, to
     * be read against each other; `stack` filled and
     * piled, each on the ones before, so the top is the
     * total. */
    form: Form;
    /** Each node is a whole series, its values written
     * in one list. */
    listed: boolean;
  }>;

export type Form = "area" | "line" | "stack";

/** The attribute a listed series is set apart by. */
const seriesWord = "系列";
/** The values a node lists on an attribute, when it
 * lists more than one:  売上=22,30,41 */
const listOn =
  (attribute: string) =>
  (node: FlowNode): Option<readonly string[]> =>
    pipe(
      fromNullable(node.data),
      chainOption((data: JsonObject) =>
        fromNullable(data[attribute]),
      ),
      chainOption(
        (
          v: JsonValue,
        ): Option<readonly string[]> =>
          String(v).includes(",")
            ? some(String(v).split(","))
            : none(),
      ),
    );
/** The order a list is followed along: as written, or
 * counted from one when it was not. */
const counted = (
  across: Axis,
  nodes: readonly FlowNode[],
  quantity: string,
): Axis =>
  across.values.length > 0
    ? across
    : {
        ...across,
        values: Array.from(
          {
            length: Math.max(
              0,
              ...nodes.map((n) =>
                pipe(
                  listOn(quantity)(n),
                  matchOption(
                    () => 0,
                    (l: readonly string[]) =>
                      l.length,
                  ),
                ),
              ),
            ),
          },
          (_, k) => String(k + 1),
        ),
      };
/** A node as the values it stands for: itself, or — when
 * it lists a series — one for each value of the list. */
const spread =
  (quantity: string, across: Axis) =>
  (node: FlowNode): readonly FlowNode[] =>
    pipe(
      listOn(quantity)(node),
      matchOption(
        (): readonly FlowNode[] => [node],
        (list: readonly string[]) =>
          list.map(
            (v, k): FlowNode => ({
              ...node,
              id: node.id + "#" + (k + 1),
              data: {
                ...node.data,
                [quantity]: v.trim(),
                [across.attribute]: pipe(
                  fromNullable(across.values[k]),
                  getOr(String(k + 1)),
                ),
                [seriesWord]: node.id,
              },
            }),
          ),
      ),
    );
const listedIn = (
  quantity: string,
  nodes: readonly FlowNode[],
): readonly FlowNode[] =>
  bars(nodes).filter((n) =>
    isSome(listOn(quantity)(n)),
  );
/** The values an area is drawn from. */
const valuesOf = (
  a: Area,
  nodes: readonly FlowNode[],
): readonly FlowNode[] =>
  a.listed
    ? bars(nodes).flatMap(
        spread(a.measure.attribute, a.across),
      )
    : bars(nodes);

const asListed = (
  form: Form,
  quantity: Axis,
  across: Axis,
  nodes: readonly FlowNode[],
): Result<Area, string> =>
  pipe(
    fieldOf(form)(
      [
        quantity,
        counted(
          across,
          nodes,
          quantity.attribute,
        ),
        {
          attribute: seriesWord,
          values: listedIn(
            quantity.attribute,
            nodes,
          ).map((n) => n.id),
        },
      ],
      bars(nodes).flatMap(
        spread(
          quantity.attribute,
          counted(
            across,
            nodes,
            quantity.attribute,
          ),
        ),
      ),
    ),
    mapResult(
      (b: Bars): Area => ({
        ...b,
        listed: true,
        form,
      }),
    ),
  );
/** The area a set of axis lines describes over a set of
 * nodes; a refusal says which line or node is wrong. A
 * node may be one value, placed by its attributes, or a
 * whole series, its values in one list. */
const read =
  (form: Form) =>
  (
    axes: readonly Axis[],
    nodes: readonly FlowNode[],
  ): Result<Area, string> =>
    pipe(
      fromNullable(axes[0]),
      chainOption((quantity: Axis) =>
        pipe(
          fromNullable(axes[1]),
          chainOption(
            (
              across: Axis,
            ): Option<Result<Area, string>> =>
              listedIn(quantity.attribute, nodes)
                .length === 0
                ? none()
                : some(
                    axes.length > 2
                      ? err(
                          "系列を 1 行で書くときは、3 つ目の軸は要りません（node がそのまま系列になります）",
                        )
                      : asListed(
                          form,
                          quantity,
                          across,
                          nodes,
                        ),
                  ),
          ),
        ),
      ),
      getOr<Result<Area, string>>(
        pipe(
          fieldOf(form)(axes, nodes),
          mapResult(
            (b: Bars): Area => ({
              ...b,
              listed: false,
              form,
            }),
          ),
        ),
      ),
    );

/** The most a pile comes to at any one place along the
 * order. */
const tallest = (
  a: Area,
  nodes: readonly FlowNode[],
): number =>
  Math.max(
    0,
    ...a.across.values.map((_, i) =>
      valuesOf(a, nodes)
        .filter((n) =>
          pipe(
            indexOn(a.across)(n),
            matchOption(
              () => false,
              (at: number) => at === i,
            ),
          ),
        )
        .reduce(
          (sum: number, n: FlowNode) =>
            sum +
            pipe(
              valueOn(a.measure.attribute)(n),
              getOr(0),
            ),
          0,
        ),
    ),
  );
/** The steps a scale is pleasantly counted in. */
const steps: readonly number[] = [
  1, 2, 2.5, 5, 10,
];
/** A total rounded up to a top the four divisions of
 * the scale reach in even steps: 189 is read against
 * 200, by fifties. */
const rounded = (total: number): number =>
  total <= 0
    ? 1
    : 4 *
      10 ** Math.floor(Math.log10(total / 4)) *
      pipe(
        fromNullable(
          steps.find(
            (step) =>
              step *
                10 **
                  Math.floor(
                    Math.log10(total / 4),
                  ) >=
              total / 4,
          ),
        ),
        getOr(10),
      );
/** A pile is measured to its top: a range that was not
 * written reaches from nothing to the tallest total. */
const toTheTop =
  (nodes: readonly FlowNode[]) =>
  (a: Area): Area =>
    a.form !== "stack" || a.measure.written
      ? a
      : {
          ...a,
          measure: {
            ...a.measure,
            lo: Math.min(0, a.measure.lo),
            hi: rounded(tallest(a, nodes)),
          },
        };
const asForm =
  (form: Form) =>
  (
    axes: readonly Axis[],
    nodes: readonly FlowNode[],
  ): Result<Area, string> =>
    pipe(
      read(form)(axes, nodes),
      mapResult(toTheTop(nodes)),
    );
/** The area a set of axis lines describes over a set of
 * nodes; a refusal says which line or node is wrong. A
 * node may be one value, placed by its attributes, or a
 * whole series, its values in one list. */
export const asArea = asForm("area");
/** The same lines, drawn as lines in one plane. */
export const asLine = asForm("line");
/** The same lines, drawn as a pile. */
export const asStack = asForm("stack");

/** The side of the mark a value is pointed at by. */
const dot = 6;

/** The space the series stand in: with depth only when
 * they are set one behind another. */
const frame = (a: Area): Bars =>
  a.form === "area" ? a : { ...a, deep: none() };
/** How high a value stands above the floor. */
const heightOf = (a: Area, v: number): number =>
  level(
    Math.min(1, Math.max(0, along(a.measure, v))),
  );
const rowOf =
  (a: Area) =>
  (node: FlowNode): number =>
    pipe(
      a.deep,
      chainOption((d: Axis) => indexOn(d)(node)),
      getOr(0),
    );
const worthOf =
  (a: Area) =>
  (node: FlowNode): number =>
    pipe(
      valueOn(a.measure.attribute)(node),
      getOr(0),
    );
/** What stands under a value in a pile: the values of
 * the series before it, at the same place. Nothing, when
 * the series are not piled. */
const under = (
  a: Area,
  all: readonly FlowNode[],
  node: FlowNode,
): number =>
  a.form !== "stack"
    ? 0
    : all
        .filter(
          (n) =>
            rowOf(a)(n) < rowOf(a)(node) &&
            pipe(
              indexOn(a.across)(n),
              getOr(-1),
            ) ===
              pipe(
                indexOn(a.across)(node),
                getOr(-2),
              ),
        )
        .reduce(
          (sum: number, n: FlowNode) =>
            sum + worthOf(a)(n),
          0,
        );

const marked =
  (a: Area, all: readonly FlowNode[]) =>
  (node: FlowNode): FlowNode =>
    pipe(
      valueOn(a.measure.attribute)(node),
      chainOption((v: number) =>
        pipe(
          indexOn(a.across)(node),
          mapOption(
            (i: number): FlowNode => ({
              ...node,
              width: dot,
              height: dot,
              depth: dot / 2,
              bare: true,
              unnamed: true,
              position: {
                x: acrossAt(a, i),
                y: heightOf(
                  a,
                  under(a, all, node) + v,
                ),
                z: deepAt(
                  frame(a),
                  rowOf(a)(node),
                ),
              },
            }),
          ),
        ),
      ),
      getOr(node),
    );
/** Every value an area is drawn from, where it stands. */
const stood = (
  a: Area,
  nodes: readonly FlowNode[],
): readonly FlowNode[] =>
  valuesOf(a, nodes).map(
    marked(a, valuesOf(a, nodes)),
  );
/** Where a listed series is held by: its last value. */
const held =
  (a: Area, nodes: readonly FlowNode[]) =>
  (node: FlowNode): FlowNode =>
    pipe(
      fromNullable(
        stood(a, nodes)
          .filter(
            (n) =>
              n.bare === true &&
              n.id.startsWith(node.id + "#"),
          )
          .slice(-1)[0],
      ),
      matchOption(
        () => node,
        (last: FlowNode): FlowNode => ({
          ...node,
          width: dot,
          height: dot,
          depth: dot / 2,
          bare: true,
          unnamed: true,
          position: last.position,
        }),
      ),
    );
/** The graph with every node a mark where its value
 * stands: along the order, up by the quantity, back by
 * its series. */
export const areaGraph = (
  a: Area,
  graph: Graph,
): Graph => ({
  ...graph,
  nodes: graph.nodes.map(
    a.listed
      ? held(a, graph.nodes)
      : marked(a, valuesOf(a, graph.nodes)),
  ),
});

/** A value of a series: where it stands, and the ground
 * it stands on (the floor, or the top of the pile under
 * it). */
type Stand = Readonly<{
  top: Point3;
  foot: Point3;
}>;
/** The values of one series, in the order of the second
 * axis. */
const series = (
  a: Area,
  nodes: readonly FlowNode[],
  j: number,
): readonly Stand[] =>
  stood(a, nodes)
    .filter(
      (n) =>
        rowOf(a)(n) === j &&
        isSome(indexOn(a.across)(n)) &&
        isSome(valueOn(a.measure.attribute)(n)),
    )
    .map(
      (n): Stand => ({
        top: n.position,
        foot: {
          ...n.position,
          y:
            a.form === "stack"
              ? heightOf(
                  a,
                  under(a, valuesOf(a, nodes), n),
                )
              : floor,
        },
      }),
    )
    .sort(
      (p: Stand, q: Stand) => p.top.x - q.top.x,
    );
/** One slice of a series: the ground under two values
 * that follow one another, up to the line between them.
 * A series is laid as its slices so that each is a plain
 * four-sided sheet. */
const slice = (
  p: Stand,
  q: Stand,
): readonly Point3[] => [
  p.foot,
  p.top,
  q.top,
  q.foot,
];
const slices = (
  stands: readonly Stand[],
): readonly (readonly Point3[])[] =>
  stands
    .slice(1)
    .flatMap((q, i) =>
      stands
        .slice(i, i + 1)
        .map((p) => slice(p, q)),
    );
/** The colours series are told apart by, each as it
 * reads on a light sheet and on a dark one; past the
 * last, they come round again. */
const hues: readonly string[] = [
  "light-dark(#2f6fde,#6ea8ff)",
  "light-dark(#d9730d,#ffab57)",
  "light-dark(#1f9d63,#5fd39a)",
  "light-dark(#7a52cc,#b392f0)",
  "light-dark(#cf3d3d,#ff7b72)",
  "light-dark(#138a8a,#56d4dd)",
];
export const hueOf = (j: number): string =>
  pipe(
    fromNullable(hues[j % hues.length]),
    getOr(ink),
  );
/** A hue thinned into the sheet, for the body of a
 * series. */
export const thinned = (hue: string): string =>
  "color-mix(in srgb," +
  hue +
  " 34%,light-dark(#ffffff,#1f1f1f))";
/** The filled outline of one series, when it has two
 * values to run between. */
const filled = (
  stands: readonly Stand[],
  hue: string,
): readonly Scenery[] =>
  slices(stands)
    .slice(0, 1)
    .map(
      (first): Scenery => ({
        kind: "plane",
        layer: "sorted",
        tone: thinned(hue),
        width: 0.5,
        points: first,
        patches: slices(stands).slice(1),
        fill: thinned(hue),
        tint: thinned(hue),
        opacity: 1,
      }),
    );
/** The line a series draws along its top. */
const ridge = (
  stands: readonly Stand[],
  hue: string,
): readonly Scenery[] =>
  stands.length < 2
    ? []
    : [
        {
          kind: "line",
          layer: "sorted",
          tone: hue,
          width: 2,
          points: stands.map((s) => s.top),
        },
      ];
const everySeries = (
  a: Area,
  nodes: readonly FlowNode[],
): readonly (readonly Stand[])[] =>
  Array.from({ length: rows(a) }, (_, j) =>
    series(a, nodes, j),
  );
const ranges = (
  a: Area,
  nodes: readonly FlowNode[],
): readonly Scenery[] =>
  everySeries(a, nodes).flatMap((stands, j) => [
    ...(a.form === "line"
      ? []
      : filled(stands, hueOf(j))),
    ...ridge(stands, hueOf(j)),
  ]);
/** The names of series set one behind another: beside
 * the floor, each at its depth. */
const namesInDepth = (
  a: Area,
  d: Axis,
): readonly Scenery[] => [
  ...d.values.map((name, j) =>
    lettering(
      {
        x: halfAcross(a),
        y: floor,
        z: deepAt(a, j),
      },
      { x: 30, y: 4 },
      "■ " + name,
      600,
      hueOf(j),
    ),
  ),
  lettering(
    {
      x: halfAcross(a),
      y: floor,
      z: halfDeep(a),
    },
    { x: 44, y: 26 },
    d.attribute,
    600,
    ink,
  ),
];
/** The names of series that share one plane: each at
 * the end of its own line — or, in a pile, of its own
 * band. */
const namesAtEnds = (
  a: Area,
  d: Axis,
  nodes: readonly FlowNode[],
): readonly Scenery[] =>
  everySeries(a, nodes).flatMap((stands, j) =>
    stands.slice(-1).flatMap((last) =>
      d.values.slice(j, j + 1).map((name) =>
        lettering(
          {
            ...last.top,
            // clear of the mark at the line's end, which
            // would otherwise stand over the name
            x: last.top.x + 10,
            y:
              a.form === "stack"
                ? (last.top.y + last.foot.y) / 2
                : last.top.y,
          },
          { x: 6, y: 4 },
          "■ " + name,
          600,
          hueOf(j),
        ),
      ),
    ),
  );
const seriesNames = (
  a: Area,
  nodes: readonly FlowNode[],
): readonly Scenery[] =>
  pipe(
    a.deep,
    matchOption(
      (): readonly Scenery[] => [],
      (d: Axis) =>
        a.form === "area"
          ? namesInDepth(a, d)
          : namesAtEnds(a, d, nodes),
    ),
  );

/** Everything drawn around an area: the ground, the
 * ruling, the scale, the names, and each series. */
export const areaScenery = (
  a: Area,
  nodes: readonly FlowNode[],
): readonly Scenery[] => [
  ...strokes(trace, false, ruling(frame(a))),
  ...strokes(pencil, false, ground(frame(a))),
  ...ranges(a, nodes),
  ...scale(frame(a)),
  ...acrossNames(frame(a)),
  ...seriesNames(a, nodes),
  ...(a.form === "stack"
    ? []
    : crown(frame(a), stood(a, nodes))),
];

/** Points that bound the area with room for the scale
 * and the names. */
export const areaExtent = (
  a: Area,
): readonly Point3[] => [
  ...barsExtent(frame(a)),
  ...(a.form === "area"
    ? []
    : [
        {
          x: halfAcross(a) + 120,
          y: floor,
          z: 0,
        },
      ]),
];
/** The lines of the DSL that say the area. */
export const areaLines = (
  a: Area,
): readonly (readonly string[])[] =>
  fieldLines(a.form)(
    a.listed ? { ...a, deep: none() } : a,
  );
/** Whether the series stand one behind another. */
export const areaDeep = (a: Area): boolean =>
  a.form === "area" && isSome(a.deep);
