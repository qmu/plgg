import {
  Result,
  SerializeError,
  DeserializeError,
} from "plgg/index";

export interface Serializable<T> {
  serialize: (
    value: T,
  ) => Result<string, SerializeError>;
  deserialize: (
    value: string,
  ) => Result<T, DeserializeError>;
}
