type JsonSafe = {
  type: string;
  value: string;
};

export interface JsonSerializable<
  T,
  U extends JsonSafe | "pass" = "pass",
> {
  toJsonReady: U extends "pass"
    ? (value: T) => T
    : (value: T) => U;
  fromJsonReady: U extends "pass"
    ? (value: T) => T
    : (jsonReady: U) => T;
}
