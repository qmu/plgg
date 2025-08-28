import {
  Rec,
  MutRec,
  isRec,
  isMutRec,
} from "plgg/index";

/**
 * Union type representing all record-like types in the system.
 */
export type RecLike = Rec | MutRec;

/**
 * Type predicate to determine if a type is record-like.
 */
export type IsRecLike<T> = [T] extends [RecLike]
  ? true
  : false;

/**
 * Runtime type guard to check if a value is record-like.
 */
export const isRecLike = (
  value: unknown,
): value is RecLike =>
  isRec(value) || isMutRec(value);

