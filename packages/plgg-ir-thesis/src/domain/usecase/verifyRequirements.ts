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
  Sexp,
  SourceRange,
  isListExp,
  sexpRange,
} from "plgg-ir-syntax";
import {
  ThesisNode,
  Assertion,
  Frame,
  isAssertionNode,
  isFrameNode,
  codeBadRequirement,
  codeCoverageGap,
  codeSeveringSurvives,
  codePerspectivityGap,
  codeCircularReasoning,
  codeStanceContradiction,
} from "plgg-ir-thesis/domain/model";
import {
  Edge,
  findCycle,
} from "plgg-ir-thesis/domain/usecase/graph";
import {
  symbolArg,
  asNumber,
} from "plgg-ir-thesis/domain/usecase/sexpUtil";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * Pass ④ (design.md §6): the model-checking verifications
 * over the analyzed node set — every one polynomial and
 * every rejection a concrete counterexample. A frame's
 * `:要求` requests rebuttal completeness (被覆 / 遮断,
 * §5.1) or blind-spot detection (多面性, §5.5); circular
 * reasoning (§5.3) is a cycle in the `依存` dependency
 * frame graph; intra-stance contradiction (§5.4) is a
 * `反論` frame within one `:立場`.
 */
export const verifyModelChecks = (
  nodes: ReadonlyArray<ThesisNode>,
): Diags =>
  pipe(
    nodes
      .filter(isAssertionNode)
      .map((n) => n.content),
    (assertions) =>
      pipe(
        nodes
          .filter(isFrameNode)
          .map((n) => n.content),
        (frames) => [
          ...frames.flatMap((f) =>
            verifyRequirement(f, assertions),
          ),
          ...verifyCircular(frames),
          ...verifyIntraStance(
            frames,
            assertions,
          ),
        ],
      ),
  );

// ── :要求 model checker ─────────────────────────────────

/**
 * The three evaluable `:要求` requirement modes.
 */
type RequirementMode = "被覆" | "遮断" | "多面性";

/**
 * The requirement modes, for the closed-vocabulary
 * diagnostic.
 */
const REQ_MODES: ReadonlyArray<RequirementMode> = [
  "被覆",
  "遮断",
  "多面性",
];

/**
 * Evaluates one frame's `:要求`, when present, by model
 * checking. An absent requirement requests nothing.
 */
const verifyRequirement = (
  f: Frame,
  assertions: ReadonlyArray<Assertion>,
): Diags =>
  pipe(
    f.require,
    matchOption(
      (): Diags => [],
      (req: Sexp) =>
        pipe(
          reqMode(req),
          matchOption(
            (): Diags => [
              badRequirement(f, sexpRange(req)),
            ],
            (mode: RequirementMode): Diags =>
              mode === "被覆"
                ? coverageCheck(f, assertions)
                : mode === "遮断"
                  ? severingCheck(f, assertions)
                  : perspectivityCheck(
                      f,
                      req,
                      assertions,
                    ),
          ),
        ),
    ),
  );

/**
 * The requirement mode a `:要求 (<mode> ...)` list names,
 * when it is one of the three.
 */
const reqMode = (
  req: Sexp,
): Option<RequirementMode> =>
  isListExp(req)
    ? pipe(
        symbolArg(req, 0),
        matchOption(
          (): Option<RequirementMode> => none(),
          (h) =>
            REQ_MODES.filter(
              (m) => m === h.content.name,
            )
              .slice(0, 1)
              .reduce<Option<RequirementMode>>(
                (_, m) => some(m),
                none(),
              ),
        ),
      )
    : none();

/**
 * The `bad-requirement` diagnostic, naming the modes.
 */
const badRequirement = (
  f: Frame,
  range: SourceRange,
): SemDiagnostic =>
  semError(
    codeBadRequirement,
    `${f.name}: :要求 must be (被覆 ...) / (遮断 ...) / (多面性 <n>)`,
    range,
  );

/**
 * `被覆` (coverage, design.md §5.1): every relation of the
 * `:接続先` target must be attacked. An unattacked relation
 * is the counterexample. An unresolved target is left to
 * `verifyFrameAttacks`.
 */
const coverageCheck = (
  f: Frame,
  assertions: ReadonlyArray<Assertion>,
): Diags =>
  pipe(
    findAssertion(assertions, f.to),
    matchOption(
      (): Diags => [],
      (target: Assertion) =>
        target.relations.flatMap((r): Diags =>
          f.attacks.some(
            (a) => a.target === r.name,
          )
            ? []
            : [
                semError(
                  codeCoverageGap,
                  `被覆 ${f.name}: unattacked ${r.name} (relation ${r.name} has no declared attack)`,
                  r.range,
                ),
              ],
        ),
    ),
  );

/**
 * `遮断` (severing, design.md §5.1): the attacked relations
 * must cut every 前提→ルート derivation path. A surviving
 * path over the un-attacked relations is the
 * counterexample. An unresolved target is left to
 * `verifyFrameAttacks`.
 */
const severingCheck = (
  f: Frame,
  assertions: ReadonlyArray<Assertion>,
): Diags =>
  pipe(
    findAssertion(assertions, f.to),
    matchOption(
      (): Diags => [],
      (target: Assertion) =>
        pipe(
          firstSurviving(
            premisesOf(target),
            target.root,
            survivingEdges(f, target),
          ),
          matchOption(
            (): Diags => [],
            (path: Path): Diags => [
              semError(
                codeSeveringSurvives,
                `遮断 ${f.name}: surviving path ${formatPath(path)}`,
                f.range,
              ),
            ],
          ),
        ),
    ),
  );

/**
 * A directed edge that remembers the relation it came
 * from, for path reconstruction.
 */
type NamedEdge = Readonly<{
  from: SoftStr;
  to: SoftStr;
  name: SoftStr;
}>;

/**
 * One step of a derivation path: the relation traversed and
 * the concept reached.
 */
type Step = Readonly<{
  rel: SoftStr;
  to: SoftStr;
}>;

/**
 * A derivation path: its starting premise and its steps.
 */
type Path = Readonly<{
  start: SoftStr;
  steps: ReadonlyArray<Step>;
}>;

/**
 * The relations of `target` the frame does **not** attack,
 * as named edges (the surviving graph under `遮断`).
 */
const survivingEdges = (
  f: Frame,
  target: Assertion,
): ReadonlyArray<NamedEdge> =>
  pipe(
    target.relations.map((r) => r.name),
    (relNames) =>
      pipe(
        f.attacks
          .map((a) => a.target)
          .filter((t) => relNames.includes(t)),
        (attacked) =>
          target.relations
            .filter(
              (r) => !attacked.includes(r.name),
            )
            .map((r) => ({
              from: r.from,
              to: r.to,
              name: r.name,
            })),
      ),
  );

/**
 * The premises of an assertion: concepts that are the
 * source of some relation but never the target of one
 * (the leaves a derivation starts from).
 */
const premisesOf = (
  a: Assertion,
): ReadonlyArray<SoftStr> =>
  pipe(
    a.relations.map((r) => r.to),
    (tos) =>
      distinct(
        a.relations
          .map((r) => r.from)
          .filter((x) => !tos.includes(x)),
      ),
  );

/**
 * The first premise from which `root` is reachable over the
 * surviving edges, as its concrete path.
 */
const firstSurviving = (
  premises: ReadonlyArray<SoftStr>,
  root: SoftStr,
  edges: ReadonlyArray<NamedEdge>,
): Option<Path> =>
  premises
    .flatMap((p) =>
      pipe(
        dfsPath(p, root, edges, [p], []),
        matchOption(
          (): ReadonlyArray<Path> => [],
          (steps: ReadonlyArray<Step>) => [
            { start: p, steps },
          ],
        ),
      ),
    )
    .slice(0, 1)
    .reduce<Option<Path>>(
      (_, path) => some(path),
      none(),
    );

/**
 * Depth-first path search from `node` to `root` over
 * `edges`, not revisiting a concept, returning the first
 * path's steps. Polynomial (each concept visited once per
 * branch).
 */
const dfsPath = (
  node: SoftStr,
  root: SoftStr,
  edges: ReadonlyArray<NamedEdge>,
  seen: ReadonlyArray<SoftStr>,
  acc: ReadonlyArray<Step>,
): Option<ReadonlyArray<Step>> =>
  node === root
    ? some(acc)
    : edges
        .filter(
          (e) =>
            e.from === node &&
            !seen.includes(e.to),
        )
        .reduce<Option<ReadonlyArray<Step>>>(
          (found, e) =>
            pipe(
              found,
              matchOption(
                (): Option<
                  ReadonlyArray<Step>
                > =>
                  dfsPath(
                    e.to,
                    root,
                    edges,
                    [...seen, e.to],
                    [
                      ...acc,
                      { rel: e.name, to: e.to },
                    ],
                  ),
                (
                  v: ReadonlyArray<Step>,
                ): Option<ReadonlyArray<Step>> =>
                  some(v),
              ),
            ),
          none(),
        );

/**
 * Renders a path as `start →rel→ concept →rel→ …`.
 */
const formatPath = (path: Path): SoftStr =>
  path.steps.reduce(
    (acc, s) => `${acc} →${s.rel}→ ${s.to}`,
    path.start,
  );

/**
 * `多面性 n` blind-spot detection (design.md §5.5): every
 * concept mentioned by a stanced assertion must be reached
 * from at least `n` distinct `:立場` stances. A concept
 * under the threshold is the counterexample.
 */
const perspectivityCheck = (
  f: Frame,
  req: Sexp,
  assertions: ReadonlyArray<Assertion>,
): Diags =>
  pipe(
    reqNumber(req),
    matchOption(
      (): Diags => [
        badRequirement(f, sexpRange(req)),
      ],
      (n: number): Diags =>
        blindSpots(f, n, assertions),
    ),
  );

/**
 * The numeric argument of a `(多面性 <n>)` requirement.
 */
const reqNumber = (req: Sexp): Option<number> =>
  isListExp(req)
    ? req.content.items
        .slice(1, 2)
        .reduce<Option<number>>(
          (_, e) => asNumber(e),
          none(),
        )
    : none();

/**
 * One stance's concept coverage.
 */
type Coverage = Readonly<{
  stance: SoftStr;
  concepts: ReadonlyArray<SoftStr>;
}>;

/**
 * The concepts reached from fewer than `n` distinct
 * stances, each a blind-spot counterexample.
 */
const blindSpots = (
  f: Frame,
  n: number,
  assertions: ReadonlyArray<Assertion>,
): Diags =>
  pipe(
    assertions.flatMap(
      (a): ReadonlyArray<Coverage> =>
        pipe(
          a.stance,
          matchOption(
            (): ReadonlyArray<Coverage> => [],
            (s: SoftStr) => [
              {
                stance: s,
                concepts: a.concepts.map(
                  (c) => c.name,
                ),
              },
            ],
          ),
        ),
    ),
    (covers: ReadonlyArray<Coverage>) =>
      distinct(
        covers.flatMap((x) => x.concepts),
      ).flatMap((c): Diags =>
        pipe(
          distinct(
            covers
              .filter((x) =>
                x.concepts.includes(c),
              )
              .map((x) => x.stance),
          ),
          (stances) =>
            stances.length >= n
              ? []
              : [
                  semError(
                    codePerspectivityGap,
                    `多面性 ${f.name}: concept ${c} is reached from only ${stances.length} stance(s), needs ${n}`,
                    f.range,
                  ),
                ],
        ),
      ),
  );

// ── circular reasoning (依存) ───────────────────────────

/**
 * Circular reasoning (design.md §5.3): a cycle in the
 * `依存` (dependency) frame graph — `¬⟨依存*⟩self`. The
 * counterexample names the cycle. Attack frames are **not**
 * dependencies (mutual rebuttal is normal argumentation,
 * resolved by the grounded extension, not a cycle here).
 */
const verifyCircular = (
  frames: ReadonlyArray<Frame>,
): Diags =>
  pipe(
    frames.filter((f) => kindIs(f, "依存")),
    (deps: ReadonlyArray<Frame>) =>
      deps.length === 0
        ? []
        : pipe(
            findCycle(
              distinct(
                deps.flatMap((d) => [
                  d.from,
                  d.to,
                ]),
              ),
              deps.map(
                (d): Edge => ({
                  from: d.from,
                  to: d.to,
                }),
              ),
            ),
            matchOption(
              (): Diags => [],
              (
                cycle: ReadonlyArray<SoftStr>,
              ): Diags =>
                deps
                  .slice(0, 1)
                  .map((d) =>
                    semError(
                      codeCircularReasoning,
                      `circular dependency through 依存: ${cycle.join(" → ")}`,
                      d.range,
                    ),
                  ),
            ),
          ),
  );

// ── intra-stance contradiction ──────────────────────────

/**
 * Intra-stance contradiction (design.md §5.4): a `反論`
 * frame whose `:接続元` and `:接続先` assertions share a
 * non-empty `:立場` — the stance both holds and refutes
 * a claim (`□ₛp ∧ □ₛ¬p`). Cross-stance conflicts are
 * surfaced, not rejected, so they produce no diagnostic.
 */
const verifyIntraStance = (
  frames: ReadonlyArray<Frame>,
  assertions: ReadonlyArray<Assertion>,
): Diags =>
  frames.flatMap((f): Diags =>
    kindIs(f, "反論")
      ? stanceClash(f, assertions)
      : [],
  );

/**
 * Reports a same-stance `反論` between two declared
 * assertions.
 */
const stanceClash = (
  f: Frame,
  assertions: ReadonlyArray<Assertion>,
): Diags =>
  pipe(
    findAssertion(assertions, f.from),
    matchOption(
      (): Diags => [],
      (a: Assertion) =>
        pipe(
          findAssertion(assertions, f.to),
          matchOption(
            (): Diags => [],
            (b: Assertion): Diags =>
              sameStance(a, b)
                ? [
                    semError(
                      codeStanceContradiction,
                      `反論 ${f.name}: intra-stance contradiction — ${a.name} and ${b.name} share stance ${stanceLabel(a)}`,
                      f.range,
                    ),
                  ]
                : [],
          ),
        ),
    ),
  );

/**
 * Do two assertions carry the same non-empty stance?
 */
const sameStance = (
  a: Assertion,
  b: Assertion,
): boolean =>
  pipe(
    a.stance,
    matchOption(
      (): boolean => false,
      (sa: SoftStr) =>
        pipe(
          b.stance,
          matchOption(
            (): boolean => false,
            (sb: SoftStr): boolean => sa === sb,
          ),
        ),
    ),
  );

/**
 * An assertion's stance name, or the empty string.
 */
const stanceLabel = (a: Assertion): SoftStr =>
  pipe(
    a.stance,
    matchOption(
      (): SoftStr => "",
      (s: SoftStr): SoftStr => s,
    ),
  );

// ── shared ──────────────────────────────────────────────

/**
 * Is a frame's `:種別` exactly `k`?
 */
const kindIs = (f: Frame, k: SoftStr): boolean =>
  pipe(
    f.kind,
    matchOption(
      (): boolean => false,
      (v: SoftStr): boolean => v === k,
    ),
  );

/**
 * The assertion named `name`, when declared.
 */
const findAssertion = (
  assertions: ReadonlyArray<Assertion>,
  name: SoftStr,
): Option<Assertion> =>
  assertions
    .filter((a) => a.name === name)
    .slice(0, 1)
    .reduce<Option<Assertion>>(
      (_, a) => some(a),
      none(),
    );

/**
 * The distinct elements of an array, first-seen order.
 */
const distinct = <A>(
  xs: ReadonlyArray<A>,
): ReadonlyArray<A> =>
  xs.reduce<ReadonlyArray<A>>(
    (acc, x) =>
      acc.includes(x) ? acc : [...acc, x],
    [],
  );
