import { cast, forProp, asObj } from "plgg";
import {
  VirtualType,
  VirtualTypeSpec,
  asVirtualType,
} from "plgg-foundry/index";

/**
 * Typed value stored in a register.
 */
export type Param = Readonly<{
  type: VirtualType;
  value: unknown;
}>;

export type ParamSpec = Readonly<{
  type: VirtualTypeSpec;
  value: unknown;
}>;

/**
 * Validates and casts a value to Param type.
 */
export const asParam = (value: unknown) =>
  cast(
    value,
    asObj,
    forProp("type", asVirtualType),
  );
