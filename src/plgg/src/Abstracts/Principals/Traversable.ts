import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
  KindKeys1Rec,
  Kind1Rec,
  Functor1,
  Functor2,
  Functor3,
  Functor1Rec,
  Foldable1,
  Foldable2,
  Foldable3,
  Foldable1Rec,
  Applicative1,
  Applicative2,
  Applicative3,
} from "plgg/index";

export interface Traverse1<T extends KindKeys1> {
  <F extends KindKeys3>(
    F: Applicative3<F>,
  ): <A, B, C, D>(
    f: (a: A) => Kind3<F, B, C, D>,
  ) => (
    ta: Kind1<T, A>,
  ) => Kind3<F, Kind1<T, B>, C, D>;

  <F extends KindKeys2>(
    F: Applicative2<F>,
  ): <A, B, C>(
    f: (a: A) => Kind2<F, B, C>,
  ) => (
    ta: Kind1<T, A>,
  ) => Kind2<F, Kind1<T, B>, C>;

  <F extends KindKeys1>(
    F: Applicative1<F>,
  ): <A, B>(
    f: (a: A) => Kind1<F, B>,
  ) => (ta: Kind1<T, A>) => Kind1<F, Kind1<T, B>>;
}

/**
 * Enables structure-preserving traversal with effects for single-parameter types.
 */
export interface Traversable1<
  KindKey extends KindKeys1,
> extends Functor1<KindKey>,
    Foldable1<KindKey> {
  /**
   * Traverses the structure applying effectful functions while preserving structure.
   */
  traverse: Traverse1<KindKey>;

  /**
   * Sequences effects while preserving structure.
   */
  sequence: <F extends KindKeys1>(
    A: Applicative1<F>,
  ) => <A>(
    tfa: Kind1<KindKey, Kind1<F, A>>,
  ) => Kind1<F, Kind1<KindKey, A>>;
}

/**
 * Enables structure-preserving traversal with effects for two-parameter types.
 */
export interface Traversable2<
  KindKey extends KindKeys2,
> extends Functor2<KindKey>,
    Foldable2<KindKey> {
  /**
   * Traverses the structure for two-parameter types.
   */
  traverse: <F extends KindKeys1>(
    A: Applicative1<F>,
  ) => <A, B, C>(
    f: (a: A) => Kind1<F, B>,
  ) => (
    ta: Kind2<KindKey, A, C>,
  ) => Kind1<F, Kind2<KindKey, B, C>>;

  /**
   * Sequences effects for two-parameter types.
   */
  sequence: <F extends KindKeys1>(
    A: Applicative1<F>,
  ) => <A, C>(
    tfa: Kind2<KindKey, Kind1<F, A>, C>,
  ) => Kind1<F, Kind2<KindKey, A, C>>;
}

/**
 * Enables structure-preserving traversal with effects for three-parameter types.
 */
export interface Traversable3<
  KindKey extends KindKeys3,
> extends Functor3<KindKey>,
    Foldable3<KindKey> {
  /**
   * Traverses the structure for three-parameter types.
   */
  traverse: <F extends KindKeys1>(
    A: Applicative1<F>,
  ) => <A, B, C, D>(
    f: (a: A) => Kind1<F, B>,
  ) => (
    ta: Kind3<KindKey, A, C, D>,
  ) => Kind1<F, Kind3<KindKey, B, C, D>>;

  /**
   * Sequences effects for three-parameter types.
   */
  sequence: <F extends KindKeys1>(
    A: Applicative1<F>,
  ) => <A, C, D>(
    tfa: Kind3<KindKey, Kind1<F, A>, C, D>,
  ) => Kind1<F, Kind3<KindKey, A, C, D>>;
}

export interface Traverse1Rec<T extends KindKeys1Rec> {
  <F extends KindKeys3>(
    F: Applicative3<F>,
  ): <
    A extends Record<string, unknown>,
    B,
    C,
    D,
  >(
    f: (a: A) => Kind3<F, B, C, D>,
  ) => (
    ta: Kind1Rec<T, A>,
  ) => Kind3<F, Kind1Rec<T, A>, C, D>;

  <F extends KindKeys2>(
    F: Applicative2<F>,
  ): <
    A extends Record<string, unknown>,
    B,
    C,
  >(
    f: (a: A) => Kind2<F, B, C>,
  ) => (
    ta: Kind1Rec<T, A>,
  ) => Kind2<F, Kind1Rec<T, A>, C>;

  <F extends KindKeys1>(
    F: Applicative1<F>,
  ): <
    A extends Record<string, unknown>,
    B,
  >(
    f: (a: A) => Kind1<F, B>,
  ) => (
    ta: Kind1Rec<T, A>,
  ) => Kind1<F, Kind1Rec<T, A>>;
}

/**
 * Enables structure-preserving traversal with effects for single-parameter record types.
 */
export interface Traversable1Rec<
  KindKey extends KindKeys1Rec,
> extends Functor1Rec<KindKey>,
    Foldable1Rec<KindKey> {
  /**
   * Traverses the record structure applying effectful functions while preserving structure.
   */
  traverse: Traverse1Rec<KindKey>;

  /**
   * Sequences effects while preserving record structure.
   */
  sequence: <F extends KindKeys1>(
    A: Applicative1<F>,
  ) => <A extends Record<string, unknown>>(
    tfa: Kind1Rec<KindKey, A>,
  ) => Kind1<F, Kind1Rec<KindKey, A>>;
}
