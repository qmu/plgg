import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
  Functor1,
  Functor2,
  Functor3,
  Foldable1,
  Foldable2,
  Foldable3,
  Applicative1,
  Applicative2,
  Applicative3,
} from "plgg/index";

export interface Traverse1<T extends KindKeys1> {
  <F extends KindKeys3>(
    F: Applicative3<F>,
  ): <A, B, C, D>(
    f: (a: A) => Kind3<F, B, C, D>,
  ) => (ta: Kind1<T, A>) => Kind3<F, Kind1<T, B>, C, D>;

  <F extends KindKeys2>(
    F: Applicative2<F>,
  ): <A, B, C>(
    f: (a: A) => Kind2<F, B, C>,
  ) => (ta: Kind1<T, A>) => Kind2<F, Kind1<T, B>, C>;

  <F extends KindKeys1>(
    F: Applicative1<F>,
  ): <A, B>(
    f: (a: A) => Kind1<F, B>,
  ) => (ta: Kind1<T, A>) => Kind1<F, Kind1<T, B>>;
}

/**
 * Traversable interface for single-parameter type constructors.
 * Extends both Functor and Foldable to provide structure-preserving traversal
 * that allows applying effects while maintaining the original structure.
 *
 * Traversable laws:
 * - Identity: traverse(Identity, pure) === Identity
 * - Composition: traverse(Compose, f) === Compose . fmap (traverse g) . traverse f
 * - Naturality: t . traverse f === traverse (t . f) for natural transformation t
 *
 * @template KindKey - The kind identifier for this traversable
 * @example
 * // Array implements Traversable1
 * const arrayTraversable: Traversable1<"Arr"> = {
 *   KindKey: "Arr",
 *   traverse: <F extends KindKeys1>(A: Applicative1<F>) =>
 *     <A, B>(f: (a: A) => Kind1<F, B>) =>
 *       (ta: Arr<A>): Kind1<F, Arr<B>> =>
 *         ta.reduce(
 *           (acc, x) => A.ap(A.map((bs: B[]) => (b: B) => [...bs, b])(acc))(f(x)),
 *           A.of([])
 *         )
 * };
 */
export interface Traversable1<KindKey extends KindKeys1>
  extends Functor1<KindKey>,
    Foldable1<KindKey> {
  /**
   * Traverses the structure, applying an effectful function to each element
   * while preserving the structure and accumulating effects.
   * @param A - Applicative instance for the effect type
   * @returns Function that takes traversing function and returns traversal function
   */
  traverse: Traverse1<KindKey>;

  /**
   * Sequences effects while preserving structure.
   * @param A - Applicative instance for the effect type
   * @returns Function that sequences the structure
   */
  sequence: <F extends KindKeys1>(
    A: Applicative1<F>,
  ) => <A>(tfa: Kind1<KindKey, Kind1<F, A>>) => Kind1<F, Kind1<KindKey, A>>;
}

/**
 * Traversable interface for two-parameter type constructors.
 * Traverses over the first type parameter while preserving the second.
 *
 * @template KindKey - The kind identifier for this traversable
 */
export interface Traversable2<KindKey extends KindKeys2>
  extends Functor2<KindKey>,
    Foldable2<KindKey> {
  /**
   * Traverses the structure for two-parameter types.
   * @param A - Applicative instance for the effect type
   * @returns Function that takes traversing function and returns traversal function
   */
  traverse: <F extends KindKeys1>(
    A: Applicative1<F>,
  ) => <A, B, C>(
    f: (a: A) => Kind1<F, B>,
  ) => (ta: Kind2<KindKey, A, C>) => Kind1<F, Kind2<KindKey, B, C>>;

  /**
   * Sequences effects for two-parameter types.
   * @param A - Applicative instance for the effect type
   * @returns Function that sequences the structure
   */
  sequence: <F extends KindKeys1>(
    A: Applicative1<F>,
  ) => <A, C>(
    tfa: Kind2<KindKey, Kind1<F, A>, C>,
  ) => Kind1<F, Kind2<KindKey, A, C>>;
}

/**
 * Traversable interface for three-parameter type constructors.
 * Traverses over the first type parameter while preserving the second and third.
 *
 * @template KindKey - The kind identifier for this traversable
 */
export interface Traversable3<KindKey extends KindKeys3>
  extends Functor3<KindKey>,
    Foldable3<KindKey> {
  /**
   * Traverses the structure for three-parameter types.
   * @param A - Applicative instance for the effect type
   * @returns Function that takes traversing function and returns traversal function
   */
  traverse: <F extends KindKeys1>(
    A: Applicative1<F>,
  ) => <A, B, C, D>(
    f: (a: A) => Kind1<F, B>,
  ) => (ta: Kind3<KindKey, A, C, D>) => Kind1<F, Kind3<KindKey, B, C, D>>;

  /**
   * Sequences effects for three-parameter types.
   * @param A - Applicative instance for the effect type
   * @returns Function that sequences the structure
   */
  sequence: <F extends KindKeys1>(
    A: Applicative1<F>,
  ) => <A, C, D>(
    tfa: Kind3<KindKey, Kind1<F, A>, C, D>,
  ) => Kind1<F, Kind3<KindKey, A, C, D>>;
}
