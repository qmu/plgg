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
  description: Option<Str>;
}>;

export type VirtualTypeSpec = Obj<{
  type: string;
  optional?: boolean;
  description?: string;
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
    forOptionProp("description", asStr),
  );
