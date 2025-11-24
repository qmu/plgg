import {
  Obj,
  RawObj,
  Result,
  InvalidError,
  Option,
  isObj,
  isRawObj,
  chainResult,
  pipe,
  newOk,
  newErr,
  newSome,
  newNone,
} from "plgg/index";

/**
 * Union type representing all record-like types in the system.
 */
export type ObjLike = Obj | RawObj;

/**
 * Type predicate to determine if a type is record-like.
 */
export type IsObjLike<T> = [T] extends [ObjLike]
  ? true
  : false;

/**
 * Runtime type guard to check if a value is record-like.
 */
export const isObjLike = (
  value: unknown,
): value is ObjLike =>
  isObj(value) || isRawObj(value);

/**
 * Validates and transforms an record property using a predicate.
 */
export const forProp =
  <T extends string, U, A>(
    key: T,
    predicate: (a: A) => Result<U, InvalidError>,
  ) =>
  <V>(
    rec: V,
  ): Result<
    (V extends object ? V : object) & Record<T, U>,
    InvalidError
  > =>
    typeof rec === "object" && rec !== null
      ? hasProp(rec, key)
        ? pipe(
            rec[key] as A, // FIXME
            predicate,
            chainResult(
              (
                okValue,
              ): Result<
                (V extends object ? V : object) &
                  Record<T, U>,
                InvalidError
              > =>
                newOk({
                  ...rec,
                  [key]: okValue,
                } as (V extends object
                  ? V
                  : object) &
                  Record<T, U>),
            ),
          )
        : newErr(
            new InvalidError({
              message: `Property '${key}' not found`,
            }),
          )
      : newErr(
          new InvalidError({
            message: "Not an object",
          }),
        );

/**
 * Validates optional record property with predicate.
 */
export const forOptionProp =
  <T extends string, U, A>(
    key: T,
    predicate: (a: A) => Result<U, InvalidError>,
  ) =>
  <V>(
    rec: V,
  ): Result<
    (V extends object ? V : object) &
      Record<T, Option<U>>,
    InvalidError
  > =>
    typeof rec === "object" && rec !== null
      ? hasProp(rec, key)
        ? pipe(
            rec[key] as A, // FIXME
            predicate,
            chainResult(
              (
                okValue,
              ): Result<
                (V extends object ? V : object) &
                  Record<T, Option<U>>,
                InvalidError
              > =>
                newOk({
                  ...rec,
                  [key]: newSome(okValue),
                } as (V extends object
                  ? V
                  : object) &
                  Record<T, Option<U>>),
            ),
          )
        : newOk({
            ...rec,
            [key]: newNone(),
          } as (V extends object ? V : object) &
            Record<T, Option<U>>)
      : newErr(
          new InvalidError({
            message: "Not an object",
          }),
        );

/**
 * Type guard for record field existence.
 */
export const hasProp = <K extends string>(
  value: object,
  key: K,
): value is Record<K, unknown> => key in value;
