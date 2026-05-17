import {
  Str,
  Obj,
  Bool,
  Option,
  Dict,
  some,
  none,
  pipe,
  isSome,
  unbox,
  unsafeStr,
  unsafeBool,
} from "plgg";
import { VariableName } from "plgg-foundry/Foundry/model/NameTable";

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
 * Converts a VirtualTypeSpec to VirtualType.
 */
export const toVirtualType = (
  spec: VirtualTypeSpec,
): VirtualType => ({
  type: unsafeStr(spec.type),
  optional:
    spec.optional !== undefined
      ? some(unsafeBool(spec.optional))
      : none(),
  description: spec.description
    ? some(unsafeStr(spec.description))
    : none(),
});

/**
 * Converts a Dict of VirtualTypeSpec to Dict of VirtualType.
 */
export const toVirtualTypeDict = (
  specs: Dict<VariableName, VirtualTypeSpec>,
): Dict<VariableName, VirtualType> =>
  Object.fromEntries(
    Object.entries(specs).map(([k, v]) => [
      k,
      toVirtualType(v),
    ]),
  );

/**
 * Formats a VirtualType as a string for display.
 */
export const formatVirtualType = (
  name: string,
  vt: VirtualType,
): string =>
  pipe(
    isSome(vt.optional)
      ? vt.optional.content
      : true,
    (isOptional) =>
      pipe(
        isSome(vt.description)
          ? ` (${unbox(vt.description)})`
          : "",
        (description) =>
          `${name}: ${vt.type.content}${isOptional ? "?" : ""}${description}`,
      ),
  );
