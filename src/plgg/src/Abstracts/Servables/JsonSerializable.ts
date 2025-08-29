import {
  Result,
  SerializeError,
  DeserializeError,
} from "plgg/index";

type JsonSafe = {
  type: string;
  value: string;
};

export interface JsonSerializable<
  T,
  U extends JsonSafe,
> {
  toJsonReady: (
    value: T,
  ) => Result<T | U, SerializeError>;
  fromJsonReady: (
    jsonReady: T | U,
  ) => Result<T, DeserializeError>;
}
