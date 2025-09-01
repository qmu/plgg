import { Atomic, Obj } from "plgg/index";

/**
 * Json-Serializable data type representing atomic values, objects, and vectors.
 */
export type Datum =
  | Atomic
  | Obj
  | ReadonlyArray<Datum>; // Vec
