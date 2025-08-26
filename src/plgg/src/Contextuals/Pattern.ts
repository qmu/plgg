import {
  Atomic,
  isObj,
  hasProp,
  Or,
} from "plgg/index";

export const isMatcherAbstract = (
  p: unknown,
): p is {
  tag: string;
  type: string;
  body: unknown;
} =>
  isObj(p) &&
  hasProp(p, "tag") &&
  hasProp(p, "type") &&
  hasProp(p, "body");

export type VariantPatternAtomic<
  T extends Atomic,
> = {
  tag: string;
  type: "atomic";
  body: T;
};

export type IsVariantPatternAtomic<P> =
  P extends {
    tag: string;
    type: "atomic";
    body: Atomic;
  }
    ? true
    : false;

export const isVariantPatternAtomic = <
  T extends Atomic,
>(
  p: unknown,
): p is VariantPatternAtomic<T> =>
  isMatcherAbstract(p) && p.type === "atomic";

export type VariantPatternObject<T> = {
  tag: string;
  type: "object";
  body: T;
};

export type IsVariantPatternObject<P> =
  P extends {
    tag: string;
    type: "object";
    body: object;
  }
    ? true
    : false;

export const isVariantPatternObject = <T>(
  p: unknown,
): p is VariantPatternObject<T> =>
  isMatcherAbstract(p) && p.type === "object";

export type VariantPatternTag<T> = {
  tag: T;
  type: "tag";
  body: undefined;
};

export type IsVariantPatternTag<P> = P extends {
  tag: string;
  type: "tag";
}
  ? true
  : false;

export const isVariantPatternTag = <TAG>(
  p: unknown,
): p is VariantPatternTag<TAG> =>
  isMatcherAbstract(p) && p.type === "tag";

export type IsVariantPattern<P> = Or<
  IsVariantPatternAtomic<P>,
  Or<
    IsVariantPatternObject<P>,
    IsVariantPatternTag<P>
  >
>;

export type Pattern<
  T,
  TAG extends string,
> = T extends Atomic
  ? VariantPatternAtomic<T>
  : T extends Record<string, unknown>
    ? VariantPatternObject<T>
    : VariantPatternTag<TAG>;

export const pattern =
  <TAG extends string>(tag: TAG) =>
  <T>(value?: T): Pattern<T, TAG> =>
    ({
      tag,
      type:
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "bigint"
          ? "atomic"
          : typeof value === "object" &&
              value !== null
            ? "object"
            : "tag",
      body: value,
    }) as Pattern<T, TAG>;

export type ExtractBodyFromVariantPattern<P> =
  P extends {
    tag: string;
    type: string;
    body: infer B;
  }
    ? B
    : never;
