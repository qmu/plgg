import {
  Datum,
  Obj,
  cast,
  forProp,
  asObj,
} from "plgg";
import {
  VirtualType,
  VirtualTypeSpec,
  asVirtualType,
} from "plgg-foundry/index";

export type Param = Obj<{
  type: VirtualType;
  value: Datum;
}>;

export type ParamSpec = Obj<{
  type: VirtualTypeSpec;
  value: Datum;
}>;

export const asParam = (value: unknown) =>
  cast(
    value,
    asObj,
    forProp("type", asVirtualType),
  );
