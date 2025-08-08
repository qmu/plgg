import {
  Monad2,
  Functor2,
  Apply2,
  Pointed2,
  Applicative2,
  Chain2,
  ParametricVariant,
  hasTag,
  variantMaker,
} from "plgg/index";

const okTag = "Ok" as const;
const errTag = "Err" as const;

/**
 * Ok side of Result, representing a successful computation.
 * Contains the success value in the content property.
 *
 * @template T - Type of the success value
 */
export type Ok<T> = ParametricVariant<typeof okTag, T>;

/**
 * Err side of Result, representing a failed computation.
 * Contains the error value in the content property.
 *
 * @template F - Type of the error value
 */
export type Err<F> = ParametricVariant<typeof errTag, F>;

/**
 * Result type for functional error handling without exceptions.
 * Represents a computation that can either succeed (Ok) or fail (Err).
 * Provides a type-safe alternative to throwing exceptions.
 *
 * @template T - Type of the success value
 * @template F - Type of the error value
 * @example
 * const divide = (a: number, b: number): Result<number, string> =>
 *   b === 0 ? err("Division by zero") : ok(a / b);
 *
 * const safeDivision = divide(10, 2); // Ok(5)
 * const unsafeDivision = divide(10, 0); // Err("Division by zero")
 */
export type Result<T, F> = Ok<T> | Err<F>;

/**
 * Creates an Ok instance containing a success value.
 *
 * @param a - The success value to wrap
 * @returns Ok variant containing the value
 * @example
 * const success = ok(42); // Ok<number>
 */
export const ok = <T>(a: T): Ok<T> => variantMaker(okTag)<Ok<T>>()(a);

/**
 * Creates an Err instance containing an error value.
 *
 * @param e - The error value to wrap
 * @returns Err variant containing the error
 * @example
 * const error = err("Something went wrong"); // Err<string>
 */
export const err = <F>(e: F): Err<F> => variantMaker(errTag)<Err<F>>()(e);

/**
 * Type guard to check if a Result is an Ok.
 *
 * @param e - Value to check
 * @returns True if the value is an Ok, false otherwise
 * @example
 * if (isOk(result)) {
 *   console.log(result.content); // TypeScript knows this is the success value
 * }
 */
export const isOk = <T>(e: unknown): e is Ok<T> => hasTag(okTag)(e);

/**
 * Type guard to check if a Result is an Err.
 *
 * @param e - Value to check
 * @returns True if the value is an Err, false otherwise
 * @example
 * if (isErr(result)) {
 *   console.error(result.content); // TypeScript knows this is the error value
 * }
 */
export const isErr = <F>(e: unknown): e is Err<F> => hasTag(errTag)(e);

/**
 * Type guard to check if a value is a Result (either Ok or Err).
 *
 * @param e - Value to check
 * @returns True if the value is a Result, false otherwise
 * @example
 * if (isResult(value)) {
 *   // TypeScript knows value is Result<T, F>
 * }
 */
export const isResult = <T, F>(e: unknown): e is Result<T, F> =>
  isOk<T>(e) || isErr<F>(e);

declare module "plgg/Abstracts/Theoreticals/Kind" {
  export interface KindKeytoKind2<A, B> {
    Result: Result<A, B>;
  }
}

// ==== TYPE CLASS INSTANCES ====

/**
 * Functor instance for Result.
 * Provides the ability to map functions over successful values while preserving errors.
 * Functions are only applied to Ok values, Err values pass through unchanged.
 *
 * @example
 * const double = (x: number) => x * 2;
 * mapResult(double)(ok(21)); // Ok(42)
 * mapResult(double)(err("failed")); // Err("failed")
 */
export const resultFunctor: Functor2<"Result"> = {
  KindKey: "Result",
  map:
    <T1, T2, E>(f: (a: T1) => T2) =>
    (fa: Result<T1, E>): Result<T2, E> =>
      isOk(fa) ? ok<T2>(f(fa.content)) : fa,
};

export const {
  /** Maps a function over the success value of a Result */
  map: mapResult,
} = resultFunctor;

// ------------------------------------

/**
 * Apply instance for Result.
 * Extends Functor with the ability to apply wrapped functions to wrapped values.
 * Both function and value must be Ok for application to succeed.
 *
 * @example
 * const addFn = ok((x: number) => x + 1);
 * const value = ok(41);
 * applyResult(addFn)(value); // Ok(42)
 * applyResult(err("no fn"))(value); // Err("no fn")
 */
export const resultApply: Apply2<"Result"> = {
  ...resultFunctor,
  ap:
    <T1, T2, E>(fab: Result<(a: T1) => T2, E>) =>
    (fa: Result<T1, E>): Result<T2, E> =>
      isOk(fab) ? (isOk(fa) ? ok<T2>(fab.content(fa.content)) : fa) : fab,
};

export const {
  /** Applies a wrapped function to a wrapped value */
  ap: applyResult,
} = resultApply;

// ------------------------------------

/**
 * Pointed instance for Result.
 * Provides the ability to wrap a value in a successful Result context.
 *
 * @example
 * ofResult(42); // Ok(42)
 * ofResult("hello"); // Ok("hello")
 */
export const resultPointed: Pointed2<"Result"> = {
  ...resultFunctor,
  of: <T = never, E = never>(a: T): Result<T, E> => ok<T>(a),
};

export const {
  /** Wraps a value in a successful Result */
  of: ofResult,
} = resultPointed;

// ------------------------------------

/**
 * Applicative instance for Result.
 * Combines Apply and Pointed to provide both function application and value lifting.
 * Enables working with functions and values wrapped in Result contexts.
 */
export const resultApplicative: Applicative2<"Result"> = {
  ...resultApply,
  ...resultFunctor,
  ...resultPointed,
};

// ------------------------------------

/**
 * Chain instance for Result.
 * Extends Apply with the ability to chain operations that return Results.
 * Enables sequential computations that can fail at any step.
 *
 * @example
 * const safeDivide = (x: number) => (y: number) =>
 *   y === 0 ? err("Division by zero") : ok(x / y);
 * chainResult(safeDivide(10))(ok(2)); // Ok(5)
 * chainResult(safeDivide(10))(err("input error")); // Err("input error")
 */
export const resultChain: Chain2<"Result"> = {
  ...resultFunctor,
  ...resultApply,
  ...resultPointed,
  chain:
    <T1, T2, E1>(f: (a: T1) => Result<T2, E1>) =>
    <E2>(fa: Result<T1, E2>): Result<T2, E1 | E2> =>
      isOk(fa) ? f(fa.content) : fa,
};

export const {
  /** Monadic bind operation for Result */
  chain: chainResult,
} = resultChain;

// ------------------------------------

/**
 * Monad instance for Result.
 * Combines Applicative and Chain to provide the full monadic interface.
 * Satisfies monad laws and enables powerful error-handling composition patterns.
 *
 * Available operations:
 * - map: Transform success values
 * - ap: Apply functions to values
 * - of: Lift values into Results
 * - chain: Chain fallible operations
 */
export const resultMonad: Monad2<"Result"> = {
  ...resultApplicative,
  ...resultChain,
};
