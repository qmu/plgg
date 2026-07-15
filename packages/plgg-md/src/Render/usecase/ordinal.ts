import { HeadingLevel } from "plgg-md/Block/model/Block";
import { Ordinal } from "plgg-md/Render/model/seam";

/**
 * A per-page heading counter: a mutable counter stack keyed
 * by depth, allocating each heading's {@link Ordinal} in
 * document order. Construct one per rendered page so the
 * counters reset between pages — the same lifecycle as
 * `makeSluggers`, and for the same reason.
 *
 * Deliberately NOT injectable. A site chooses how to FORMAT
 * an ordinal (`1-2.`, `1.2`, `第1章`) in its
 * {@link HeadingDecorator}; it does not get to choose how
 * one is COUNTED. Counting is what must agree between the
 * heading list and the body, so `plgg-md` owns it — see
 * {@link HeadingDecorator} for why that is the whole point.
 */
export type Ordinals = Readonly<{
  /** Allocates the ordinal for a heading at `level`. */
  next: (level: HeadingLevel) => Ordinal;
}>;

/**
 * Builds a fresh {@link Ordinals} (empty counter stack).
 *
 * The scheme is the conventional outline one: a heading at
 * depth L keeps the counters above it, drops everything
 * below, and increments its own — so `H1 H2 H2 H3 H1`
 * counts `[1] [1,1] [1,2] [1,2,1] [2]`. A page that starts
 * below H1, or skips a depth, pads the missing ancestors
 * with `0` (an H3 with no H1/H2 above it is `[0,0,1]`)
 * rather than guessing: the document really has no first or
 * second level there, and saying so is more honest than
 * inventing one. The renderer never shows this — how, or
 * whether, to print a `0` is the decorator's call.
 */
export const makeOrdinals = (): Ordinals => {
  // Imperative seam: a per-page counter stack, mutated once
  // per heading in document order — the same bounded,
  // documented exception `makeSluggers` takes for its dedup
  // counter.
  let counters: ReadonlyArray<number> = [];
  return {
    next: (level): Ordinal => {
      const kept = counters.slice(0, level);
      const padded = [
        ...kept,
        ...new Array(
          Math.max(0, level - kept.length),
        ).fill(0),
      ];
      counters = padded.map(
        (n: number, i: number) =>
          i === level - 1 ? n + 1 : n,
      );
      return counters;
    },
  };
};
