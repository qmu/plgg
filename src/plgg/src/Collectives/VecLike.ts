import {
  Vec,
  MutVec,
  isVec,
  isMutVec,
  JsonSerializable,
} from "plgg/index";

/**
 * Union type representing all vector-like types in the system.
 */
export type VecLike<
  T extends JsonSerializable = JsonSerializable,
> = Vec<T> | MutVec;

/**
 * Type predicate to determine if a type is vector-like.
 */
export type IsVecLike<T> = [T] extends [VecLike]
  ? true
  : false;

/**
 * Runtime type guard to check if a value is vector-like.
 */
export const isVecLike = (
  value: unknown,
): value is VecLike =>
  isVec(value) || isMutVec(value);

