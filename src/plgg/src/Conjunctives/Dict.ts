import { Obj, Datum } from "plgg/index";

export type Dict<T extends Datum = Datum> = Obj<
  Record<string, T>
>;
