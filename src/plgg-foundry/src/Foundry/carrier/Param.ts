import { cast, forProp, asObj } from "plgg";
import {
  VirtualType,
  VirtualTypeSpec,
  asVirtualType,
} from "plgg-foundry/index";

export type Param = Readonly<{
  argument: VirtualType;
  value: unknown;
}>;

export type ParamSpec = Readonly<{
  argument: VirtualTypeSpec;
  value: unknown;
}>;

export const asParam = (value: unknown) =>
  cast(
    value,
    asObj,
    forProp("argument", asVirtualType),
  );
