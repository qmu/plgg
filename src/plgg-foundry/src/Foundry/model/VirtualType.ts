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
  pipe,
  isSome,
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
          ? ` (${vt.description.content.content})`
          : "",
        (description) =>
          `${name}: ${vt.type.content}${isOptional ? "?" : ""}${description}`,
      ),
  );
