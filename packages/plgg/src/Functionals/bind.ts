import {
  isOk,
  isResult,
  ok,
  err,
  Result,
} from "plgg/index";

/**
 * Type guard to check if T is exactly an Ok type (tag is literally "Ok")
 */
type IsOkType<T> = T extends { __tag: infer Tag }
  ? Tag extends "Ok"
    ? true
    : false
  : false;

/**
 * Type guard to check if T is exactly an Err type (tag is literally "Err")
 */
type IsErrType<T> = T extends { __tag: infer Tag }
  ? Tag extends "Err"
    ? true
    : false
  : false;

/**
 * Extracts the unwrapped value type from a return value.
 * Only unwraps Ok/Err/Result types (with __tag: "Ok" or "Err"),
 * not other Box types.
 */
type UnwrapValue<T> = T extends Promise<infer U>
  ? UnwrapValue<U>
  : IsOkType<T> extends true
    ? T extends { content: infer V }
      ? V
      : never
    : IsErrType<T> extends true
      ? never
      : T;

/**
 * A binding entry: [key, function that takes context and returns value]
 * R is the raw return type of the function.
 */
type BindEntry<
  K extends string,
  Ctx,
  R,
> = readonly [K, (ctx: Ctx) => R];

/**
 * Executes a sequence of binding operations, accumulating context.
 * Each entry receives the accumulated context from previous entries.
 * Returns a Promise of the final accumulated context wrapped in Result.
 *
 * @example
 * const result = await proc(
 *   bind(
 *     ["apiKey", () => env("OPENAI_API_KEY")],
 *     ["provider", ({ apiKey }) => createProvider({ apiKey })],
 *     ["result", ({ provider }) => provider.execute()],
 *   ),
 *   ({ result }) => result,
 * );
 */
export function bind<
  K1 extends string,
  V1,
>(
  e1: BindEntry<K1, object, V1>,
): Promise<Result<Record<K1, UnwrapValue<V1>>, Error>>;
export function bind<
  K1 extends string,
  V1,
  K2 extends string,
  V2,
>(
  e1: BindEntry<K1, object, V1>,
  e2: BindEntry<K2, Record<K1, UnwrapValue<V1>>, V2>,
): Promise<
  Result<
    Record<K1, UnwrapValue<V1>> & Record<K2, UnwrapValue<V2>>,
    Error
  >
>;
export function bind<
  K1 extends string,
  V1,
  K2 extends string,
  V2,
  K3 extends string,
  V3,
>(
  e1: BindEntry<K1, object, V1>,
  e2: BindEntry<K2, Record<K1, UnwrapValue<V1>>, V2>,
  e3: BindEntry<
    K3,
    Record<K1, UnwrapValue<V1>> & Record<K2, UnwrapValue<V2>>,
    V3
  >,
): Promise<
  Result<
    Record<K1, UnwrapValue<V1>> &
      Record<K2, UnwrapValue<V2>> &
      Record<K3, UnwrapValue<V3>>,
    Error
  >
>;
export function bind<
  K1 extends string,
  V1,
  K2 extends string,
  V2,
  K3 extends string,
  V3,
  K4 extends string,
  V4,
>(
  e1: BindEntry<K1, object, V1>,
  e2: BindEntry<K2, Record<K1, UnwrapValue<V1>>, V2>,
  e3: BindEntry<
    K3,
    Record<K1, UnwrapValue<V1>> & Record<K2, UnwrapValue<V2>>,
    V3
  >,
  e4: BindEntry<
    K4,
    Record<K1, UnwrapValue<V1>> &
      Record<K2, UnwrapValue<V2>> &
      Record<K3, UnwrapValue<V3>>,
    V4
  >,
): Promise<
  Result<
    Record<K1, UnwrapValue<V1>> &
      Record<K2, UnwrapValue<V2>> &
      Record<K3, UnwrapValue<V3>> &
      Record<K4, UnwrapValue<V4>>,
    Error
  >
>;
export function bind<
  K1 extends string,
  V1,
  K2 extends string,
  V2,
  K3 extends string,
  V3,
  K4 extends string,
  V4,
  K5 extends string,
  V5,
>(
  e1: BindEntry<K1, object, V1>,
  e2: BindEntry<K2, Record<K1, UnwrapValue<V1>>, V2>,
  e3: BindEntry<
    K3,
    Record<K1, UnwrapValue<V1>> & Record<K2, UnwrapValue<V2>>,
    V3
  >,
  e4: BindEntry<
    K4,
    Record<K1, UnwrapValue<V1>> &
      Record<K2, UnwrapValue<V2>> &
      Record<K3, UnwrapValue<V3>>,
    V4
  >,
  e5: BindEntry<
    K5,
    Record<K1, UnwrapValue<V1>> &
      Record<K2, UnwrapValue<V2>> &
      Record<K3, UnwrapValue<V3>> &
      Record<K4, UnwrapValue<V4>>,
    V5
  >,
): Promise<
  Result<
    Record<K1, UnwrapValue<V1>> &
      Record<K2, UnwrapValue<V2>> &
      Record<K3, UnwrapValue<V3>> &
      Record<K4, UnwrapValue<V4>> &
      Record<K5, UnwrapValue<V5>>,
    Error
  >
>;
export async function bind(
  ...entries: ReadonlyArray<
    BindEntry<string, object, unknown>
  >
): Promise<Result<object, Error>> {
  let current: object = {};
  for (const [key, fn] of entries) {
    const result = await fn(current);
    if (isResult(result)) {
      if (isOk(result)) {
        current = {
          ...current,
          [key]: result.content,
        };
      } else {
        return err(
          result.content instanceof Error
            ? result.content
            : new Error(String(result.content)),
        );
      }
    } else {
      current = {
        ...current,
        [key]: result,
      };
    }
  }
  return ok(current);
}
