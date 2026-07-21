import { SoftStr } from "plgg";

/**
 * One directed attack of an argument graph: `attacker`
 * defeats `target` unless it is itself defeated. Nodes
 * are 論旨 argument ids; the metamodel's ストラクチャー
 * layer computes survival over exactly this graph
 * (metamodel-semantics.md §検証カタログ 11).
 */
export type AttackEdge = Readonly<{
  attacker: SoftStr;
  target: SoftStr;
}>;

/**
 * A finite abstract argumentation framework: the argument
 * ids and the attacks between them.
 */
export type AttackGraph = Readonly<{
  arguments: ReadonlyArray<SoftStr>;
  attacks: ReadonlyArray<AttackEdge>;
}>;

/**
 * The result of a survival judgment: the `survivors` (the
 * grounded extension) and the `defeated` (every other
 * argument — not defended by the extension).
 */
export type Extension = Readonly<{
  survivors: ReadonlyArray<SoftStr>;
  defeated: ReadonlyArray<SoftStr>;
}>;

/**
 * The arguments that attack `a`.
 */
const attackersOf = (
  attacks: ReadonlyArray<AttackEdge>,
  a: SoftStr,
): ReadonlyArray<SoftStr> =>
  attacks
    .filter((e) => e.target === a)
    .map((e) => e.attacker);

/**
 * Is `a` attacked by at least one member of `set`?
 */
const attackedBySet = (
  attacks: ReadonlyArray<AttackEdge>,
  set: ReadonlyArray<SoftStr>,
  a: SoftStr,
): boolean =>
  attacks.some(
    (e) =>
      e.target === a && set.includes(e.attacker),
  );

/**
 * Is `a` acceptable with respect to `set` — is every
 * attacker of `a` itself attacked by `set`? (Dung's
 * characteristic function; the empty-attacker case is
 * vacuously defended.)
 */
const defendedBy = (
  attacks: ReadonlyArray<AttackEdge>,
  set: ReadonlyArray<SoftStr>,
  a: SoftStr,
): boolean =>
  attackersOf(attacks, a).every((att) =>
    attackedBySet(attacks, set, att),
  );

/**
 * One application of the characteristic function: the
 * arguments defended by `set`.
 */
const step = (
  graph: AttackGraph,
  set: ReadonlyArray<SoftStr>,
): ReadonlyArray<SoftStr> =>
  graph.arguments.filter((a) =>
    defendedBy(graph.attacks, set, a),
  );

/**
 * Two sets equal as sets of the graph's arguments — same
 * membership (the iteration is monotone increasing, so a
 * length match suffices, but membership is checked to
 * stay obviously correct).
 */
const sameSet = (
  xs: ReadonlyArray<SoftStr>,
  ys: ReadonlyArray<SoftStr>,
): boolean =>
  xs.length === ys.length &&
  xs.every((x) => ys.includes(x));

/**
 * The least fixpoint of the characteristic function from
 * `set`. The sequence F^n(∅) is monotone increasing and
 * bounded by the finite argument set, so equality with
 * the previous iterate is reached in at most |arguments|
 * steps — no search, always terminating.
 */
const fixpoint = (
  graph: AttackGraph,
  set: ReadonlyArray<SoftStr>,
): ReadonlyArray<SoftStr> => {
  const next = step(graph, set);
  return sameSet(next, set)
    ? set
    : fixpoint(graph, next);
};

/**
 * The grounded extension of `graph` — the unique set of
 * arguments that survive under Dung's grounded semantics,
 * computed as the least fixpoint of the characteristic
 * function from ∅. Deterministic and polynomial: a
 * monotone fixpoint over the declared attack graph, never
 * a search over assignments. Every argument not in the
 * extension is reported as `defeated`.
 */
export const groundedExtension = (
  graph: AttackGraph,
): Extension => {
  const survivors = fixpoint(graph, []);
  return {
    survivors,
    defeated: graph.arguments.filter(
      (a) => !survivors.includes(a),
    ),
  };
};

/**
 * Renders a set of argument ids as `{a, b}` for a proof
 * trace.
 */
export const renderSet = (
  set: ReadonlyArray<SoftStr>,
): string => `{${set.join(", ")}}`;
