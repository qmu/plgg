import {
  JsonSerializable,
  JsonReady,
} from "plgg/index";

export interface JsonSerializer<
  T extends JsonSerializable,
  U extends JsonReady,
> {
  toJsonReady: (a: T) => U;
  fromJsonReady: (a: U) => T;
}
