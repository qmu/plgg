import { Datum, JsonReady } from "plgg/index";

export interface JsonSerializer<
  T extends Datum,
  U extends JsonReady,
> {
  toJsonReady: (a: T) => U;
  fromJsonReady: (a: U) => T;
}
