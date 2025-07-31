import { isObj, hasProp } from "plgg/index";

export type Variant<TAG extends string, BODY = never> = BODY extends never
  ? { __tag: TAG }
  : { __tag: TAG; __body: NonNullable<BODY> };

export const isVariant = (v: unknown): v is Variant<string> =>
  isObj(v) && hasProp(v, "__tag");

export function variant<TAG extends string>(tag: TAG) {
  return function <V extends Variant<string, unknown>>() {
    type BODY = ExtractBody<V>;
    function tagMaker(): Variant<TAG, BODY>;
    function tagMaker(body: BODY): Variant<TAG, BODY>;
    function tagMaker(
      body?: BODY,
    ): { __tag: TAG } | { __tag: TAG; __body: NonNullable<BODY> } {
      return body ? { __tag: tag, __body: body } : { __tag: tag };
    }
    return tagMaker;
  };
}

type ExtractBody<V extends Variant<string, unknown>> =
  V extends Variant<string, infer BODY> ? NonNullable<BODY> : never;
