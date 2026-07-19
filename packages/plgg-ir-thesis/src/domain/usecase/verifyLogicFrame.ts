import {
  SoftStr,
  Option,
  some,
  none,
  pipe,
  matchOption,
} from "plgg";
import {
  SemDiagnostic,
  semError,
} from "plgg-ir-language";
import {
  Assertion,
  Concept,
  Relation,
  Sort,
  parseSort,
  SORTS,
  codeCyclicAssertion,
  codeTimeNotMonotonic,
  codeTransferImbalance,
  codeSortMixed,
  codeUnknownSort,
} from "plgg-ir-thesis/domain/model";
import {
  Edge,
  findCycle,
} from "plgg-ir-thesis/domain/usecase/graph";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * Pass ② (design.md §6): verify one assertion's declared
 * logic kind against its static frame condition (design.md
 * §3 table), plus the logic-independent `:種` sort
 * exclusivity (§5.10). Every violation is a ranged
 * counterexample diagnostic; every check is polynomial
 * (model checking over the finite Kripke model, never a
 * search).
 */
export const verifyAssertionFrame = (
  a: Assertion,
): Diags => [
  ...sortExclusivity(a),
  ...logicFrame(a),
];

/**
 * Dispatches on the assertion's logic kind. 時間的 adds
 * acyclicity + `:時点` monotonicity; 構成的 adds the
 * partial-order (acyclicity) condition; 移動的 adds
 * transfer conservation. 因果的 is directedness only, and
 * 推移的 / 勾配的 / 演繹的 carry no structural rejection in
 * v1 (design.md §3).
 */
const logicFrame = (a: Assertion): Diags =>
  a.logic === "時間的"
    ? [...acyclic(a), ...timeMonotonic(a)]
    : a.logic === "構成的"
      ? acyclic(a)
      : a.logic === "移動的"
        ? transferConservation(a)
        : [];

/**
 * The assertion's relation graph as directed edges.
 */
const edgesOf = (
  a: Assertion,
): ReadonlyArray<Edge> =>
  a.relations.map((r) => ({
    from: r.from,
    to: r.to,
  }));

/**
 * Acyclicity: the relation graph must be a DAG (the GL
 * frame condition for 時間的, the partial order for
 * 構成的). A cycle is a counterexample naming the path.
 */
const acyclic = (a: Assertion): Diags =>
  pipe(
    findCycle(
      a.concepts.map((c) => c.name),
      edgesOf(a),
    ),
    matchOption(
      (): Diags => [],
      (cycle: ReadonlyArray<SoftStr>): Diags => [
        semError(
          codeCyclicAssertion,
          `${a.logic} assertion ${a.name} has a cycle: ${cycle.join(" → ")}`,
          a.range,
        ),
      ],
    ),
  );

/**
 * `:時点` monotonicity: along every edge the source's
 * timestamp must not exceed the target's. An edge whose
 * endpoints both carry `:時点` and decrease is a
 * counterexample. Edges missing a timestamp are skipped
 * (nothing to compare).
 */
const timeMonotonic = (a: Assertion): Diags =>
  a.relations.flatMap((r): Diags =>
    pipe(
      pairTimes(a, r),
      matchOption(
        (): Diags => [],
        (edge: EdgeTimes): Diags =>
          edge.from <= edge.to
            ? []
            : [
                semError(
                  codeTimeNotMonotonic,
                  `edge ${r.name} (${r.from} →${r.to}) is not :時点-monotonic: ${edge.from} > ${edge.to}`,
                  r.range,
                ),
              ],
      ),
    ),
  );

/**
 * The `:時点` timestamps at a relation's two endpoints.
 */
type EdgeTimes = Readonly<{
  from: number;
  to: number;
}>;

/**
 * The timestamps of a relation's endpoints, when both
 * concepts carry `:時点`.
 */
const pairTimes = (
  a: Assertion,
  r: Relation,
): Option<EdgeTimes> =>
  pipe(
    conceptTime(a, r.from),
    matchOption(
      (): Option<EdgeTimes> => none(),
      (from: number) =>
        pipe(
          conceptTime(a, r.to),
          matchOption(
            (): Option<EdgeTimes> => none(),
            (to: number) => some({ from, to }),
          ),
        ),
    ),
  );

/**
 * The `:時点` of the concept named `name`, when it has
 * one.
 */
const conceptTime = (
  a: Assertion,
  name: SoftStr,
): Option<number> =>
  a.concepts
    .filter((c) => c.name === name)
    .slice(0, 1)
    .reduce<Option<number>>(
      (_, c: Concept) => c.at,
      none(),
    );

/**
 * Transfer conservation (design.md §5.9): every internal
 * node (with both inflow and outflow) that is not a
 * declared `:変換` escape must balance — the sum of
 * incoming `:量` equals the sum of outgoing. An imbalance
 * is a counterexample naming the node.
 */
const transferConservation = (
  a: Assertion,
): Diags =>
  a.concepts.flatMap((c): Diags => {
    const inflow = flow(a, c.name, "to");
    const outflow = flow(a, c.name, "from");
    return c.transform ||
      !hasEdge(a, c.name, "to") ||
      !hasEdge(a, c.name, "from") ||
      inflow === outflow
      ? []
      : [
          semError(
            codeTransferImbalance,
            `node ${c.name} does not conserve :量: inflow ${inflow} ≠ outflow ${outflow}`,
            c.range,
          ),
        ];
  });

/**
 * The total `:量` on the edges touching `name` on the
 * given `side` (`"to"` = inflow, `"from"` = outflow);
 * an edge without `:量` contributes zero.
 */
const flow = (
  a: Assertion,
  name: SoftStr,
  side: "from" | "to",
): number =>
  a.relations
    .filter((r) => r[side] === name)
    .reduce(
      (sum, r) =>
        sum +
        pipe(
          r.quantity,
          matchOption(
            (): number => 0,
            (q: number): number => q,
          ),
        ),
      0,
    );

/**
 * Does `name` have at least one edge on the given side?
 */
const hasEdge = (
  a: Assertion,
  name: SoftStr,
  side: "from" | "to",
): boolean =>
  a.relations.some((r) => r[side] === name);

/**
 * Sort exclusivity (design.md §5.10): a concept's `:種`
 * must be one of the four sorts, and an assertion may not
 * mix sorts. Reports an unknown sort per offending
 * concept and one sort-mixed diagnostic when more than
 * one valid sort appears.
 */
const sortExclusivity = (a: Assertion): Diags =>
  pipe(
    a.concepts.flatMap((c): Diags =>
      pipe(
        c.sort,
        matchOption(
          (): Diags => [],
          (raw: SoftStr): Diags =>
            pipe(
              parseSort(raw),
              matchOption(
                (): Diags => [
                  semError(
                    codeUnknownSort,
                    `:種 must be one of ${SORTS.join(" / ")}`,
                    c.range,
                  ),
                ],
                (): Diags => [],
              ),
            ),
        ),
      ),
    ),
    (unknownDiags) => [
      ...unknownDiags,
      ...mixedSorts(a),
    ],
  );

/**
 * The sort-mixed diagnostic, when the assertion's
 * concepts declare more than one distinct valid sort.
 */
const mixedSorts = (a: Assertion): Diags =>
  pipe(distinctSorts(a), (sorts) =>
    sorts.length > 1
      ? [
          semError(
            codeSortMixed,
            `assertion ${a.name} mixes sorts: ${sorts.join(" / ")}`,
            a.range,
          ),
        ]
      : [],
  );

/**
 * The distinct valid sorts declared across an assertion's
 * concepts.
 */
const distinctSorts = (
  a: Assertion,
): ReadonlyArray<Sort> =>
  a.concepts
    .flatMap((c): ReadonlyArray<Sort> =>
      pipe(
        c.sort,
        matchOption(
          (): ReadonlyArray<Sort> => [],
          (raw: SoftStr) =>
            pipe(
              parseSort(raw),
              matchOption(
                (): ReadonlyArray<Sort> => [],
                (s: Sort) => [s],
              ),
            ),
        ),
      ),
    )
    .reduce<ReadonlyArray<Sort>>(
      (acc, s) =>
        acc.includes(s) ? acc : [...acc, s],
      [],
    );
