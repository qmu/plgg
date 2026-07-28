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
import { SourceRange } from "plgg-ir-syntax";
import {
  ThesisNode,
  Assertion,
  Frame,
  FrameRef,
  isAssertionNode,
  isFrameNode,
  codeCorrespondenceUnresolved,
  codeSimulationUnmatched,
  codeTotalityGap,
  codeCompositionDivergent,
} from "plgg-ir-thesis/domain/model";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * Part of pass ③ (design.md §6): the frame-level checks
 * that relate whole assertions — declared simulations
 * (類推, §5.7), framework totality (全対応, §5.2), and
 * composite-frame commutativity (合成, §5.11). Each frame
 * is dispatched on its `:種別`; every correspondence is
 * declared by the writer and only *checked* here
 * (polynomial — design.md §2), and every rejection names
 * its counterexample (the first unmatched step, the
 * unaddressed node, the diverging composite). Frames
 * without one of these kinds carry no relation check (their
 * attacks are handled by `verifyFrameAttacks`).
 */
export const verifyFrameRelations = (
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
        (frames) =>
          frames.flatMap((f) =>
            dispatch(f, assertions, frames),
          ),
      ),
  );

/**
 * Routes a frame to its kind's check.
 */
const dispatch = (
  f: Frame,
  assertions: ReadonlyArray<Assertion>,
  frames: ReadonlyArray<Frame>,
): Diags =>
  pipe(
    f.kind,
    matchOption(
      (): Diags => [],
      (k: SoftStr): Diags =>
        k === "類推"
          ? verifyAnalogy(f, assertions)
          : k === "全対応"
            ? verifyTotality(f, assertions)
            : k === "合成"
              ? verifyComposition(f, frames)
              : [],
    ),
  );

// ── 類推 (analogy): declared simulation ─────────────────

/**
 * Checks a 類推 frame's declared simulation from its
 * `:接続元` assertion to its `:接続先` assertion. Its
 * `(対応 ...)` clauses must reference concepts of the two
 * assertions (closure), and the local simulation condition
 * must hold: every source edge between mapped states has a
 * matching edge between their images. An unresolved
 * `:接続先` is left to `verifyFrameAttacks`.
 */
const verifyAnalogy = (
  f: Frame,
  assertions: ReadonlyArray<Assertion>,
): Diags =>
  pipe(
    findAssertion(assertions, f.from),
    matchOption(
      (): Diags => [
        semError(
          codeCorrespondenceUnresolved,
          `類推 ${f.name}: :接続元 ${f.from} names no declared assertion`,
          f.range,
        ),
      ],
      (src: Assertion) =>
        pipe(
          findAssertion(assertions, f.to),
          matchOption(
            (): Diags => [],
            (dst: Assertion) =>
              pipe(
                closureErrors(f, src, dst),
                (cl: Diags) =>
                  cl.length > 0
                    ? cl
                    : simulationErrors(
                        f,
                        src,
                        dst,
                      ),
              ),
          ),
        ),
    ),
  );

/**
 * Reference closure for a 類推 frame: each `(対応 s d)`
 * must name a concept of the source (`s`) and of the
 * target (`d`) assertion.
 */
const closureErrors = (
  f: Frame,
  src: Assertion,
  dst: Assertion,
): Diags =>
  f.correspondences.flatMap((c): Diags =>
    !conceptNames(src).includes(c.from)
      ? [
          semError(
            codeCorrespondenceUnresolved,
            `類推 ${f.name}: 対応 source ${c.from} is not a concept of ${src.name}`,
            c.range,
          ),
        ]
      : !conceptNames(dst).includes(c.to)
        ? [
            semError(
              codeCorrespondenceUnresolved,
              `類推 ${f.name}: 対応 target ${c.to} is not a concept of ${dst.name}`,
              c.range,
            ),
          ]
        : [],
  );

/**
 * The local simulation condition (design.md §2): for every
 * source edge whose tail is mapped, its head must also be
 * mapped and the image edge must exist in the target. Only
 * the **first** unmatched step is reported.
 */
const simulationErrors = (
  f: Frame,
  src: Assertion,
  dst: Assertion,
): Diags =>
  src.relations
    .flatMap((r): Diags =>
      pipe(
        image(f, r.from),
        matchOption(
          (): Diags => [],
          (imgFrom: SoftStr) =>
            pipe(
              image(f, r.to),
              matchOption(
                (): Diags => [
                  unmatched(
                    f,
                    `head ${r.to} of source edge ${r.name} has no declared 対応`,
                  ),
                ],
                (imgTo: SoftStr) =>
                  hasEdge(dst, imgFrom, imgTo)
                    ? []
                    : [
                        unmatched(
                          f,
                          `source edge ${r.name} (${r.from}→${r.to}) has no image edge ${imgFrom}→${imgTo} in ${dst.name}`,
                        ),
                      ],
              ),
            ),
        ),
      ),
    )
    .slice(0, 1);

/**
 * The `simulation-unmatched` diagnostic.
 */
const unmatched = (
  f: Frame,
  detail: SoftStr,
): SemDiagnostic =>
  semError(
    codeSimulationUnmatched,
    `類推 ${f.name}: ${detail}`,
    f.range,
  );

/**
 * The target concept a `(対応 ...)` maps `name` to, when
 * declared.
 */
const image = (
  f: Frame,
  name: SoftStr,
): Option<SoftStr> =>
  f.correspondences
    .filter((c) => c.from === name)
    .slice(0, 1)
    .reduce<Option<SoftStr>>(
      (_, c) => some(c.to),
      none(),
    );

// ── 全対応 (framework totality) ─────────────────────────

/**
 * Checks a 全対応 frame's `□(問題 → ⟨対策⟩⊤)` totality
 * over its `:接続先` framework assertion: every declared
 * `(問題 p)` node must have an outgoing edge (a
 * countermeasure step). An unaddressed node is the
 * counterexample. An unresolved `:接続先` is left to
 * `verifyFrameAttacks`.
 */
const verifyTotality = (
  f: Frame,
  assertions: ReadonlyArray<Assertion>,
): Diags =>
  pipe(
    findAssertion(assertions, f.to),
    matchOption(
      (): Diags => [],
      (fw: Assertion) =>
        f.problems.flatMap((p): Diags =>
          hasOutgoing(fw, p.name)
            ? []
            : [
                semError(
                  codeTotalityGap,
                  `全対応 ${f.name}: problem ${p.name} is unaddressed (no 対策 step in ${fw.name})`,
                  p.range,
                ),
              ],
        ),
    ),
  );

// ── 合成 (composition commutativity) ────────────────────

/**
 * Checks a 合成 frame against the composition of its
 * declared `(部分 ...)` parts: each part must name a
 * declared frame, the parts must chain (each part's
 * `:接続先` is the next part's `:接続元`), and the
 * composite's own endpoints must equal the parts' outer
 * endpoints. Any divergence is the counterexample.
 */
const verifyComposition = (
  f: Frame,
  frames: ReadonlyArray<Frame>,
): Diags =>
  pipe(
    f.parts
      .filter((p) => !frameExists(frames, p.name))
      .slice(0, 1),
    (missing: ReadonlyArray<FrameRef>) =>
      missing.length > 0
        ? missing.map((p) =>
            divergent(
              p.range,
              `合成 ${f.name}: 部分 ${p.name} names no declared frame`,
            ),
          )
        : chainDiags(
            f,
            resolveParts(f.parts, frames),
          ),
  );

/**
 * The in-progress composition fold: the composed outer
 * endpoints so far, and the first chain break, if any.
 */
type Chain = Readonly<{
  ends: Option<Ends>;
  broken: Option<SoftStr>;
}>;

/**
 * A frame's outer endpoints (`:接続元` → `:接続先`).
 */
type Ends = Readonly<{
  from: SoftStr;
  to: SoftStr;
}>;

/**
 * Folds the resolved parts into their composed endpoints,
 * then compares against the composite's declared endpoints.
 */
const chainDiags = (
  f: Frame,
  parts: ReadonlyArray<Frame>,
): Diags =>
  pipe(
    parts.reduce<Chain>(chainStep, {
      ends: none(),
      broken: none(),
    }),
    (chain: Chain) =>
      pipe(
        chain.broken,
        matchOption(
          (): Diags =>
            pipe(
              chain.ends,
              matchOption(
                (): Diags => [
                  divergent(
                    f.range,
                    `合成 ${f.name} declares no usable 部分`,
                  ),
                ],
                (e: Ends): Diags =>
                  e.from === f.from &&
                  e.to === f.to
                    ? []
                    : [
                        divergent(
                          f.range,
                          `合成 ${f.name}: composite ${f.from}→${f.to} diverges from parts ${e.from}→${e.to}`,
                        ),
                      ],
              ),
            ),
          (msg: SoftStr): Diags => [
            divergent(f.range, msg),
          ],
        ),
      ),
  );

/**
 * One composition fold step: open the chain with the first
 * part, extend it when the next part's `:接続元` meets the
 * running `:接続先`, or record the first break.
 */
const chainStep = (
  st: Chain,
  cur: Frame,
): Chain =>
  pipe(
    st.broken,
    matchOption(
      (): Chain =>
        pipe(
          st.ends,
          matchOption(
            (): Chain => ({
              ends: some({
                from: cur.from,
                to: cur.to,
              }),
              broken: none(),
            }),
            (e: Ends): Chain =>
              e.to === cur.from
                ? {
                    ends: some({
                      from: e.from,
                      to: cur.to,
                    }),
                    broken: none(),
                  }
                : {
                    ends: st.ends,
                    broken: some(
                      `合成 part ${cur.name} starts at ${cur.from}, expected ${e.to} to chain`,
                    ),
                  },
          ),
        ),
      (): Chain => st,
    ),
  );

/**
 * The `composition-divergent` diagnostic.
 */
const divergent = (
  range: SourceRange,
  message: SoftStr,
): SemDiagnostic =>
  semError(
    codeCompositionDivergent,
    message,
    range,
  );

// ── shared lookups ──────────────────────────────────────

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
 * The frames named by a part list, in declaration order,
 * skipping any that resolve to no frame (those are reported
 * as missing before this runs).
 */
const resolveParts = (
  parts: ReadonlyArray<FrameRef>,
  frames: ReadonlyArray<Frame>,
): ReadonlyArray<Frame> =>
  parts.flatMap((p) =>
    frames
      .filter((fr) => fr.name === p.name)
      .slice(0, 1),
  );

/**
 * Is a frame named `name` declared?
 */
const frameExists = (
  frames: ReadonlyArray<Frame>,
  name: SoftStr,
): boolean =>
  frames.some((fr) => fr.name === name);

/**
 * The concept names of an assertion.
 */
const conceptNames = (
  a: Assertion,
): ReadonlyArray<SoftStr> =>
  a.concepts.map((c) => c.name);

/**
 * Does the assertion declare a `from → to` edge?
 */
const hasEdge = (
  a: Assertion,
  from: SoftStr,
  to: SoftStr,
): boolean =>
  a.relations.some(
    (r) => r.from === from && r.to === to,
  );

/**
 * Does `name` have at least one outgoing edge in `a`?
 */
const hasOutgoing = (
  a: Assertion,
  name: SoftStr,
): boolean =>
  a.relations.some((r) => r.from === name);
