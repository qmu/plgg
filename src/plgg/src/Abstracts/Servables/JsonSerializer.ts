type JsonSafe = {
  type: "bigint" | "time";
  value: string;
};

export interface JsonSerializer<
  T,
  U extends JsonSafe | "pass" = "pass",
  V = U extends "pass" ? T : U,
> {
  toJsonReady: (a: T) => V;
  fromJsonReady: (a: V) => T;
}
