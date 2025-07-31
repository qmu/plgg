import { isObj, hasProp } from "plgg/index";

export type Variant<TAG extends string, BODY = never> = BODY extends never
  ? { __tag: TAG }
  : { __tag: TAG; __body: NonNullable<BODY> };

export const isVariant = (v: unknown): v is Variant<string> =>
  isObj(v) && hasProp(v, "__tag");

// TODO
export const asVariant = () => {};

// TODO
export const withBody = () => {};

export type ExtractBody<V extends Variant<string, unknown>> =
  V extends Variant<string, infer BODY> ? NonNullable<BODY> : never;

export function variantMaker<TAG extends string>(tag: TAG) {
  return function <V extends Variant<string, unknown>>() {
    type BODY = ExtractBody<V>;
    function maker(): Variant<TAG, BODY>;
    function maker(body: BODY): Variant<TAG, BODY>;
    function maker(
      body?: BODY,
    ): { __tag: TAG } | { __tag: TAG; __body: NonNullable<BODY> } {
      return !body
        ? ({ __tag: tag } as const)
        : ({ __tag: tag, __body: body } as const);
    }
    return maker;
  };
}

export function pattern<TAG extends string>(tag: TAG) {
  return function <
    V extends Variant<string, unknown>,
    BODY = ExtractBody<V>,
    PBODY = Partial<BODY>,
  >() {
    function maker(): { __tag: TAG };
    function maker(body: PBODY): Variant<TAG, PBODY>;
    function maker(
      body?: PBODY,
    ): { __tag: TAG } | { __tag: TAG; __body: NonNullable<PBODY> } {
      return !body
        ? ({ __tag: tag } as const)
        : ({ __tag: tag, __body: body } as const);
    }
    return maker;
  };
}
