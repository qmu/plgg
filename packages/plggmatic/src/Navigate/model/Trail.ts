import {
  type SoftStr,
  type Option,
  matchOption,
} from "plgg";

/**
 * The OTHER way a strip of columns comes to be: a TRAIL.
 *
 * A {@link Composition} is a set of independent documents
 * standing side by side — any column may be there without
 * the one to its left. A trail is the opposite claim: each
 * column was opened FROM the one to its left, so a step
 * only means something after the steps before it. A menu,
 * a list it opened, a record chosen in the list, the
 * records that record points to: that is a trail.
 *
 * A step is an opaque string here. What a step says (a
 * list, a record, a relation, how it is shown) is the
 * product's vocabulary, spelled by the product; the
 * framework owns only the three rules every trail obeys,
 * below. Three products wrote those rules separately
 * before this module (2026-11-25).
 */
export type Trail = ReadonlyArray<SoftStr>;

/**
 * How a product answers a trail with columns of its own
 * kind `C`. `root` is the column the empty trail shows.
 * `resolve` is asked for the column a `step` opens from
 * the column `previous`, and answers `None` for a step
 * that column does not offer.
 */
export type TrailResolver<C> = Readonly<{
  root: () => C;
  resolve: (
    previous: C,
    step: SoftStr,
  ) => Option<C>;
}>;

/**
 * One resolved column and the trail that reaches it. The
 * `prefix` is the column's own address: the root's is
 * empty, and a column `n` steps in carries the first `n`
 * steps.
 */
export type TrailColumn<C> = Readonly<{
  prefix: Trail;
  column: C;
}>;

/**
 * RULE 1 — PREFIX CLOSURE. The columns a trail shows, left
 * to right, the root first. Each step is put to the column
 * before it, and the first step that column does not offer
 * ENDS the walk: the valid prefix shows and the tail is
 * dropped. A stale or hand-typed address therefore folds
 * to the deepest state it still names; it never fails and
 * never shows a column the one to its left does not lead
 * to. Never empty — the root always resolves.
 */
export const resolveTrail =
  <C>(resolver: TrailResolver<C>) =>
  (
    trail: Trail,
  ): ReadonlyArray<TrailColumn<C>> => {
    const walk = (
      placed: ReadonlyArray<TrailColumn<C>>,
      last: TrailColumn<C>,
      rest: Trail,
    ): ReadonlyArray<TrailColumn<C>> => {
      const [step, ...tail] = rest;
      return step === undefined
        ? placed
        : matchOption<
            C,
            ReadonlyArray<TrailColumn<C>>
          >(
            () => placed,
            (column: C) => {
              const next: TrailColumn<C> = {
                prefix: [...last.prefix, step],
                column,
              };
              return walk(
                [...placed, next],
                next,
                tail,
              );
            },
          )(resolver.resolve(last.column, step));
    };
    const root: TrailColumn<C> = {
      prefix: [],
      column: resolver.root(),
    };
    return walk([root], root, trail);
  };

/**
 * The part of a trail that resolved: the address to
 * rewrite a stale URL to. Equal to the trail itself when
 * every step was offered.
 */
export const settledTrail = <C>(
  columns: ReadonlyArray<TrailColumn<C>>,
): Trail =>
  columns.reduce<Trail>(
    (_, placed) => placed.prefix,
    [],
  );

/**
 * RULE 2 — ONE FOLD. The trail as the column `depth` steps
 * in sees it: everything to its right dropped. `depth` 0
 * is the root. This is the whole of "go back": a column's
 * heading links to the trail folded to itself. Generic in
 * the step so a product may fold its typed steps directly.
 */
export const foldTrail = <S>(
  trail: ReadonlyArray<S>,
  depth: number,
): ReadonlyArray<S> =>
  trail.slice(0, Math.max(0, depth));

/**
 * RULE 3 — A STEP REPLACES WHAT IT LEAVES BEHIND. The
 * trail after the column `depth` steps in opens `step`:
 * folded to that column, then grown by one. Opening
 * something from a column part way along never appends
 * past the columns to its right — they were reached
 * through a choice this one replaces.
 */
export const stepFrom = <S>(
  trail: ReadonlyArray<S>,
  depth: number,
  step: S,
): ReadonlyArray<S> => [
  ...foldTrail(trail, depth),
  step,
];

/**
 * The same column shown another way: the step at `index`
 * exchanged in place, the columns to its right kept. For a
 * change that does not alter what the column offers — its
 * sort order, its page, its presentation. If it does alter
 * that, {@link resolveTrail} drops what no longer follows.
 */
export const restep = <S>(
  trail: ReadonlyArray<S>,
  index: number,
  step: S,
): ReadonlyArray<S> =>
  trail.map((old, i) =>
    i === index ? step : old,
  );
