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
  name: Str;
  type: Str;
  optional: Option<Bool>;
}>;

export type VirtualTypeSpec = Obj<{
  name: string;
  type: string;
  optional?: boolean;
}>;

export const asVirtualType = (value: unknown) =>
  cast(
    value,
    asObj,
    forProp("name", asStr),
    forProp("type", asStr),
    forOptionProp("optional", asBool),
  );
