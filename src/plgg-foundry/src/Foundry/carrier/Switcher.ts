import {
  KebabCase,
  Str,
  Castable,
  Option,
  PossiblyPromise,
  Datum,
  Dict,
  Box,
  newBox,
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
  formatVirtualType,
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
  check: (
    medium: Medium,
  ) => PossiblyPromise<
    [boolean, Dict<VariableName, Datum>]
  >;
}>;

export type SwitcherSpec = Box<
  "SwitcherSpec",
  Readonly<{
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
    check: (
      medium: Medium,
    ) => PossiblyPromise<
      [boolean, Dict<VariableName, Datum>]
    >;
  }>
>;

/**
 * Creates a SwitcherSpec with strict type checking on return types.
 * The check function must return keys matching the returnsWhenTrue and returnsWhenFalse fields.
 */
export const newSwitcherSpec = <
  const RT extends Dict<
    VariableName,
    VirtualTypeSpec
  >,
  const RF extends Dict<
    VariableName,
    VirtualTypeSpec
  >,
>(spec: {
  name: string;
  description: string;
  arguments?: Dict<VariableName, VirtualTypeSpec>;
  returnsWhenTrue: RT;
  returnsWhenFalse: RF;
  check: (
    medium: Medium,
  ) => PossiblyPromise<
    [
      boolean,
      (RT extends Dict<VariableName, VirtualTypeSpec>
        ? Record<keyof RT & VariableName, Datum>
        : Dict<VariableName, Datum>) |
      (RF extends Dict<VariableName, VirtualTypeSpec>
        ? Record<keyof RF & VariableName, Datum>
        : Dict<VariableName, Datum>),
    ]
  >;
}): SwitcherSpec =>
  newBox("SwitcherSpec")<SwitcherSpec["content"]>(
    spec,
  );

/**
 * Validates and casts a SwitcherSpec to Switcher.
 */
export const asSwitcher = (value: SwitcherSpec) =>
  cast(
    value.content,
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
