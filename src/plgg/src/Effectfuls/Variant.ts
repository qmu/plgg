import { isObj, hasProp } from "plgg/index";

export type FixedVariant<TAG extends string> = {
  __tag: TAG;
};

export type ParametricVariant<TAG extends string, CONTENT> = {
  __tag: TAG;
  content: CONTENT;
};

export type Variant<TAG extends string, CONTENT> =
  | FixedVariant<TAG>
  | ParametricVariant<TAG, CONTENT>;

export const isVariant = (v: unknown): v is Variant<string, unknown> =>
  isObj(v) && hasProp(v, "__tag");

export const hasTag =
  <TAG extends string>(tag: TAG) =>
  <T>(v: unknown): v is Variant<TAG, T> =>
    isVariant(v) && v.__tag === tag;

// TODO
export const asVariant = () => {};

// TODO
export const withContent = () => {};

export function variantMaker<
  TAG extends string,
  V extends Variant<string, unknown>,
  CONTENT = ExtractContent<V>,
>(__tag: TAG) {
  return function () {
    function maker(): FixedVariant<TAG>;
    function maker(content: CONTENT): ParametricVariant<TAG, CONTENT>;
    function maker(
      content?: CONTENT,
    ): FixedVariant<TAG> | ParametricVariant<TAG, CONTENT> {
      return content === undefined
        ? ({ __tag } as const)
        : ({ __tag, content } as const);
    }
    return maker;
  };
}

export function pattern<TAG extends string>(__tag: TAG) {
  return function <
    V extends Variant<string, unknown>,
    CONTENT = ExtractContent<V>,
    PCONTENT = Partial<CONTENT>,
  >() {
    function maker(): FixedVariant<TAG>;
    function maker(content: PCONTENT): ParametricVariant<TAG, PCONTENT>;
    function maker(
      content?: PCONTENT,
    ): FixedVariant<TAG> | ParametricVariant<TAG, PCONTENT> {
      return content === undefined
        ? ({ __tag } as const)
        : ({ __tag, content } as const);
    }
    return maker;
  };
}

export type ExtractContent<V extends Variant<string, unknown>> =
  V extends Variant<string, infer CONTENT> ? CONTENT : never;
