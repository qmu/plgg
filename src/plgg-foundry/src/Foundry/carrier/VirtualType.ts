import {
  Str,
  Obj,
  Bool,
  Option,
  cast,
  forProp,
  forOptionProp,
  asObj,
  asStr,
  asBool,
} from "plgg";

/**
 * Type descriptor for function arguments and return values.
 */
export type VirtualType = Obj<{
  type: Str;
  optional: Option<Bool>;
}>;

export type VirtualTypeSpec = Obj<{
  type: string;
  optional?: boolean;
}>;

/**
 * Validates and casts a value to VirtualType.
 */
export const asVirtualType = (value: unknown) =>
  cast(
    value,
    asObj,
    forProp("type", asStr),
    forOptionProp("optional", asBool),
  );
