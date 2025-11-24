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
  asBox,
  asRawObj,
  forContent,
  isBoxWithTag,
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
 * Function that evaluates a condition and returns boolean with data for each branch.
 */
export type Switcher = Box<
  "Switcher",
  {
    name: KebabCase;
    description: Str;
    arguments: Option<
      Dict<VariableName, VirtualType>
    >;
    returnsWhenTrue: Dict<
      VariableName,
      VirtualType
    >;
    returnsWhenFalse: Dict<
      VariableName,
      VirtualType
    >;
    fn: (
      medium: Medium,
    ) => PossiblyPromise<
      [boolean, Dict<VariableName, Datum>]
    >;
  }
>;

export type SwitcherSpec = Box<
  "SwitcherSpec",
  Readonly<{
    name: string;
    description: string;
    arguments?: Dict<
      VariableName,
      VirtualTypeSpec
    >;
    returnsWhenTrue: Dict<
      VariableName,
      VirtualTypeSpec
    >;
    returnsWhenFalse: Dict<
      VariableName,
      VirtualTypeSpec
    >;
    fn: (
      medium: Medium,
    ) => PossiblyPromise<
      [boolean, Dict<VariableName, Datum>]
    >;
  }>
>;

/**
 * Type guard to check if apparatus is a Switcher.
 */
export const isSwitcher = (
  v: unknown,
): v is Switcher => isBoxWithTag("Switcher")(v);

/**
 * Validates and casts a SwitcherSpec to Switcher.
 */
export const asSwitcher = (value: SwitcherSpec) =>
  cast(
    value.content,
    asBox,
    forContent("Switcher", (a) =>
      cast(
        a,
        asRawObj,
        forProp("name", asKebabCase),
        forProp("description", asStr),
        forOptionProp(
          "arguments",
          asDictOf(asVirtualType),
        ),
        forProp(
          "returnsWhenTrue",
          asDictOf(asVirtualType),
        ),
        forProp(
          "returnsWhenFalse",
          asDictOf(asVirtualType),
        ),
        forProp("fn", asFunc),
      ),
    ),
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
  fn: (
    medium: Medium,
  ) => PossiblyPromise<
    [
      boolean,
      (
        | (RT extends Dict<
            VariableName,
            VirtualTypeSpec
          >
            ? Record<
                keyof RT & VariableName,
                Datum
              >
            : Dict<VariableName, Datum>)
        | (RF extends Dict<
            VariableName,
            VirtualTypeSpec
          >
            ? Record<
                keyof RF & VariableName,
                Datum
              >
            : Dict<VariableName, Datum>)
      ),
    ]
  >;
}): SwitcherSpec =>
  newBox("SwitcherSpec")<SwitcherSpec["content"]>(
    spec,
  );

/**
 * Generates human-readable markdown description of switcher.
 */
export const explainSwitcher = (
  switcher: Switcher,
) =>
  `${switcher.content.description.content}

- Opcode: \`${switcher.content.name.content}\`
- Arguments: ${
    isSome(switcher.content.arguments)
      ? Object.entries(
          switcher.content.arguments.content,
        )
          .map(([name, vt]) =>
            formatVirtualType(name, vt),
          )
          .join(", ")
      : "Any"
  }
- Returns When True: ${Object.entries(
    switcher.content.returnsWhenTrue,
  )
    .map(([name, vt]) =>
      formatVirtualType(name, vt),
    )
    .join(", ")}
- Returns When False: ${Object.entries(
    switcher.content.returnsWhenFalse,
  )
    .map(([name, vt]) =>
      formatVirtualType(name, vt),
    )
    .join(", ")}`;
