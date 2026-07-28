import {
  SoftStr,
  pipe,
  matchOption,
} from "plgg";
import {
  ThesisNode,
  Frame,
  isAssertionNode,
  isFrameNode,
} from "plgg-ir-thesis/domain/model";

/**
 * One directed attack of the structure-level argument
 * graph: `attacker` (a `反論` frame's `:接続元`) attacks
 * `target` (its `:接続先`).
 */
type Attack = Readonly<{
  attacker: SoftStr;
  target: SoftStr;
}>;

/**
 * The Dung **grounded extension** over the structure
 * (ストラクチャー) level attack graph (design.md §5.12):
 * the least fixed point of the characteristic function
 * `F(S) = { a | every attacker of a is attacked by S }`,
 * computed by Kleene iteration from the empty set. The
 * result is the surviving set of theses — polynomial, a
 * fixed-point computation, never a search. Arguments are
 * the declared assertions; attacks are the `反論` frames
 * whose both endpoints are declared assertions (an
 * undeclared attacker is not an argument).
 */
export const groundedExtension = (
  nodes: ReadonlyArray<ThesisNode>,
): ReadonlyArray<SoftStr> =>
  pipe(
    nodes
      .filter(isAssertionNode)
      .map((n) => n.content.name),
    (args) =>
      grow(
        args,
        attackEdges(
          nodes
            .filter(isFrameNode)
            .map((n) => n.content),
          args,
        ),
        [],
      ),
  );

/**
 * The attack edges from the `反論` frames whose endpoints
 * are both declared arguments.
 */
const attackEdges = (
  frames: ReadonlyArray<Frame>,
  args: ReadonlyArray<SoftStr>,
): ReadonlyArray<Attack> =>
  frames.flatMap((f): ReadonlyArray<Attack> =>
    kindIs(f, "反論") &&
    args.includes(f.from) &&
    args.includes(f.to)
      ? [{ attacker: f.from, target: f.to }]
      : [],
  );

/**
 * Kleene iteration: grows the accepted set `s` by one
 * application of the characteristic function until it
 * stabilises at the least fixed point. Monotone and
 * bounded by the argument count, so it terminates.
 */
const grow = (
  args: ReadonlyArray<SoftStr>,
  atk: ReadonlyArray<Attack>,
  s: ReadonlyArray<SoftStr>,
): ReadonlyArray<SoftStr> =>
  pipe(step(args, atk, s), (next) =>
    sameSet(next, s)
      ? s
      : grow(args, atk, next),
  );

/**
 * The characteristic function: the arguments every one of
 * whose attackers is attacked by some member of `s`
 * (an argument with no attackers is vacuously accepted).
 */
const step = (
  args: ReadonlyArray<SoftStr>,
  atk: ReadonlyArray<Attack>,
  s: ReadonlyArray<SoftStr>,
): ReadonlyArray<SoftStr> =>
  args.filter((a) =>
    attackersOf(atk, a).every((b) =>
      attackedBy(atk, s, b),
    ),
  );

/**
 * The attackers of argument `a`.
 */
const attackersOf = (
  atk: ReadonlyArray<Attack>,
  a: SoftStr,
): ReadonlyArray<SoftStr> =>
  atk
    .filter((e) => e.target === a)
    .map((e) => e.attacker);

/**
 * Does some member of `s` attack `b`?
 */
const attackedBy = (
  atk: ReadonlyArray<Attack>,
  s: ReadonlyArray<SoftStr>,
  b: SoftStr,
): boolean =>
  s.some((c) =>
    atk.some(
      (e) => e.attacker === c && e.target === b,
    ),
  );

/**
 * Do two argument sets contain the same members?
 */
const sameSet = (
  x: ReadonlyArray<SoftStr>,
  y: ReadonlyArray<SoftStr>,
): boolean =>
  x.length === y.length &&
  x.every((e) => y.includes(e));

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
