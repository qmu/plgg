import {
  KebabCase,
  Str,
  Castable,
  Option,
  PossiblyPromise,
  Datum,
  Dict,
  cast,
  forProp,
  forOptionProp,
  asStr,
  asFunc,
  asKebabCase,
  isSome,
  asDictOf,
} from "plgg";
import {
  Medium,
  VirtualType,
  VirtualTypeSpec,
  VariableName,
  asVirtualType,
} from "plgg-foundry/index";

/**
 * Function that evaluates a condition and returns boolean with optional data for each branch.
 */
export type Switcher = Readonly<{
  name: KebabCase;
  description: Str;
  arguments: Option<
    Dict<VariableName, VirtualType>
  >;
  returnsWhenTrue: Option<
    Dict<VariableName, VirtualType>
  >;
  returnsWhenFalse: Option<
    Dict<VariableName, VirtualType>
  >;
  check: (medium: Medium) => PossiblyPromise<
    [
      boolean,
      Dict<VariableName, Datum>,
    ]
  >;
}>;

export type SwitcherSpec = Readonly<{
  name: string;
  description: string;
  arguments?: Dict<VariableName, VirtualTypeSpec>;
  returnsWhenTrue?: Dict<
    VariableName,
    VirtualTypeSpec
  >;
  returnsWhenFalse?: Dict<
    VariableName,
    VirtualTypeSpec
  >;
  check: (medium: Medium) => PossiblyPromise<
    [
      boolean,
      Dict<VariableName, Datum>,
    ]
  >;
}>;

/**
 * Validates and casts a SwitcherSpec to Switcher.
 */
export const asSwitcher = (value: SwitcherSpec) =>
  cast(
    value,
    forProp("name", asKebabCase),
    forProp("description", asStr),
    forOptionProp(
      "arguments",
      asDictOf(asVirtualType),
    ),
    forOptionProp(
      "returnsWhenTrue",
      asDictOf(asVirtualType),
    ),
    forOptionProp(
      "returnsWhenFalse",
      asDictOf(asVirtualType),
    ),
    forProp("check", asFunc),
  );

/**
 * Castable instance for Switcher safe casting.
 */
export const switcherCastable: Castable<
  Switcher,
  SwitcherSpec
> = {
  as: asSwitcher,
};

const formatVirtualType = (
  name: string,
  vt: VirtualType,
): string => {
  const isOptional = isSome(vt.optional)
    ? vt.optional.content
    : true;
  const optionalMarker = isOptional ? "?" : "";
  const description = isSome(vt.description)
    ? ` (${vt.description.content.content})`
    : "";
  return `${name}: ${vt.type.content}${optionalMarker}${description}`;
};

/**
 * Generates human-readable markdown description of switcher.
 */
export const explainSwitcher = (
  switcher: Switcher,
) =>
  `${switcher.description.content}

- Opcode: \`${switcher.name.content}\`
- Arguments: ${
    isSome(switcher.arguments)
      ? Object.entries(switcher.arguments.content)
          .map(([name, vt]) =>
            formatVirtualType(name, vt),
          )
          .join(", ")
      : "Any"
  }
- Returns When True: ${
    isSome(switcher.returnsWhenTrue)
      ? Object.entries(
          switcher.returnsWhenTrue.content,
        )
          .map(([name, vt]) =>
            formatVirtualType(name, vt),
          )
          .join(", ")
      : "Any"
  }
- Returns When False: ${
    isSome(switcher.returnsWhenFalse)
      ? Object.entries(
          switcher.returnsWhenFalse.content,
        )
          .map(([name, vt]) =>
            formatVirtualType(name, vt),
          )
          .join(", ")
      : "Any"
  }`;
