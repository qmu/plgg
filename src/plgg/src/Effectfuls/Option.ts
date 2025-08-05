import { Monad1 } from "plgg/TypeLevels";

/**
 * Some side of Option, representing a value that exists.
 */
export type Some<T> = {
  _tag: "Some";
  value: T;
};

/**
 * None side of Option, representing no value.
 */
export type None = {
  _tag: "None";
};

/**
 * Option type for handling optional values.
 * @template T - The value type
 */
export type Option<T> = Some<T> | None;

/**
 * Type guard to check if a value is an Option.
 */
export const isOption = <T>(e: unknown): e is Option<T> =>
  typeof e === "object" &&
  e !== null &&
  "_tag" in e &&
  (e._tag === "Some" || e._tag === "None");

/**
 * Creates a Some instance.
 */
export const some = <T>(value: T): Option<T> => {
  const result = {
    _tag: "Some" as const,
    value,
  };
  return result;
};

/**
 * Creates a None instance.
 */
export const none = <T = never>(): Option<T> => {
  const result = {
    _tag: "None" as const,
  };
  return result;
};

/**
 * Type guard to check if an Option is a Some.
 */
export const isSome = <T>(e: unknown): e is Some<T> =>
  isOption<T>(e) && e._tag === "Some";

/**
 * Type guard to check if an Option is a None.
 */
export const isNone = <T>(e: unknown): e is None =>
  isOption<T>(e) && e._tag === "None";

// --------------------------------------

declare module "plgg/TypeLevels/Kind" {
  export interface KindKeytoKind1<A> {
    Option: Option<A>;
  }
}

export const {
  map: mapOption,
  ap: applyOption,
  of: ofOption,
  chain: chainOption,
}: Monad1<"Option"> = {
  KindKey: "Option",

  // Functor1: map
  map: <A, B>(f: (a: A) => B) => (fa: Option<A>): Option<B> =>
    isSome(fa) ? some<B>(f(fa.value)) : none<B>(),

  // Apply1: ap
  ap: <A, B>(fab: Option<(a: A) => B>) => (fa: Option<A>): Option<B> =>
    isSome(fab) ? (isSome(fa) ? some<B>(fab.value(fa.value)) : none<B>()) : none<B>(),

  // Pointed1: of
  of: <A>(a: A): Option<A> => some<A>(a),

  // Chain1: chain
  chain: <A, B>(f: (a: A) => Option<B>) => (fa: Option<A>): Option<B> =>
    isSome(fa) ? f(fa.value) : none<B>(),
};
