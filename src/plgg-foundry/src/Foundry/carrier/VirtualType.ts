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

export type VirtualType = Obj<{
  type: Str;
  optional: Option<Bool>;
}>;

export type VirtualTypeSpec = Obj<{
  type: string;
  optional?: boolean;
}>;

export const asVirtualType = (value: unknown) =>
  cast(
    value,
    asObj,
    forProp("type", asStr),
    forOptionProp("optional", asBool),
  );
