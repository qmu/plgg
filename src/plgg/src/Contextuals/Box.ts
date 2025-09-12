import {
  Result,
  InvalidError,
  Refinable1,
  Castable1,
  newOk,
  newErr,
  isObj,
  hasProp,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface MapKind1<A> {
    Box: Box<string, A>;
  }
}

/**
 * A variant with both a tag and body.
 */
export type Box<TAG extends string, CONTENT> = {
  __tag: TAG;
  content: CONTENT;
};

/**
 * Type predicate to check if a type is a parametric variant.
 */
export type IsBox<V> = V extends {
  __tag: infer T;
  content: infer B;
}
  ? T extends string
    ? B extends undefined
      ? false
      : true
    : false
  : false;

/**
 * Type guard to check if a value is a Box.
 */
const is = <TAG extends string, CONTENT>(
  value: unknown,
): value is Box<TAG, CONTENT> =>
  isObj(value) &&
  hasProp(value, "__tag") &&
  typeof value.__tag === "string" &&
  hasProp(value, "content") &&
  value.content !== undefined;

/**
 * Refinable instance for Box type guards.
 */
export const boxRefinable: Refinable1<"Box"> = {
  KindKey: "Box",
  is,
};
/**
 * Exported type guard function for Box values.
 */
export const { is: isBox } = boxRefinable;

/**
 * Castable instance for Box safe casting.
 */
export const boxCastable: Castable1<"Box"> = {
  KindKey: "Box",
  as: <A>(
    value: unknown,
  ): Result<Box<string, A>, InvalidError> =>
    is<string, A>(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Value is not a Box",
          }),
        ),
};
/**
 * Exported safe casting function for Box values.
 */
export const { as: asBox } = boxCastable;
