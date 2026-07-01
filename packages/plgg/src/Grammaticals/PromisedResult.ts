import { Result } from "plgg/index";

export type PromisedResult<T, E> = Promise<
  Result<T, E>
>;
