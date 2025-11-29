import {
  KebabCase,
  Str,
  Castable,
  Option,
  PossiblyPromise,
  Datum,
  Dict,
  Box,
  box,
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
    returnsWhenTrue: Option<
      Dict<VariableName, VirtualType>
    >;
    returnsWhenFalse: Option<
      Dict<VariableName, VirtualType>
    >;
    fn: (
      medium: Medium,
    ) => PossiblyPromise<[boolean, unknown]>;
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
    returnsWhenTrue?: Dict<
      VariableName,
      VirtualTypeSpec
    >;
    returnsWhenFalse?: Dict<
      VariableName,
      VirtualTypeSpec
    >;
    fn: (
      medium: Medium,
    ) => PossiblyPromise<[boolean, unknown]>;
  }>
>;

/**
 * Type guard to check if apparatus is a Switcher.
 */
export const isSwitcher = (
  v: unknown,
): v is Switcher => isBoxWithTag("Switcher")(v);

/**
 * Type guard to check if apparatus spec is a SwitcherSpec.
 */
export const isSwitcherSpec = (
  v: unknown,
): v is SwitcherSpec =>
  isBoxWithTag("SwitcherSpec")(v);

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
        forOptionProp(
          "returnsWhenTrue",
          asDictOf(asVirtualType),
        ),
        forOptionProp(
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
 * When returns fields are omitted, fn can return [boolean, unknown].
 */
export const makeSwitcherSpec = <
  const RT extends
    | Dict<VariableName, VirtualTypeSpec>
    | undefined,
  const RF extends
    | Dict<VariableName, VirtualTypeSpec>
    | undefined,
>(spec: {
  name: string;
  description: string;
  arguments?: Dict<VariableName, VirtualTypeSpec>;
  returnsWhenTrue?: RT;
  returnsWhenFalse?: RF;
  fn: (
    medium: Medium,
  ) => RT extends Dict<VariableName, VirtualTypeSpec>
    ? RF extends Dict<VariableName, VirtualTypeSpec>
      ? PossiblyPromise<
          [
            boolean,
            | Record<keyof RT & VariableName, Datum>
            | Record<keyof RF & VariableName, Datum>,
          ]
        >
      : PossiblyPromise<
          [boolean, Record<keyof RT & VariableName, Datum>]
        >
    : RF extends Dict<VariableName, VirtualTypeSpec>
      ? PossiblyPromise<
          [boolean, Record<keyof RF & VariableName, Datum>]
        >
      : PossiblyPromise<[boolean, unknown]>;
}): SwitcherSpec =>
  box("SwitcherSpec")<SwitcherSpec["content"]>({
    name: spec.name,
    description: spec.description,
    fn: spec.fn,
    ...(spec.arguments && { arguments: spec.arguments }),
    ...(spec.returnsWhenTrue && {
      returnsWhenTrue: spec.returnsWhenTrue,
    }),
    ...(spec.returnsWhenFalse && {
      returnsWhenFalse: spec.returnsWhenFalse,
    }),
  });

/**
 * Formats entries as multiline YAML-like list.
 */
const formatEntries = (
  entries: ReadonlyArray<[string, VirtualType]>,
): string =>
  "\n" +
  entries
    .map(
      ([name, vt]) =>
        `  - ${formatVirtualType(name, vt)}`,
    )
    .join("\n");

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
      ? formatEntries(
          Object.entries(
            switcher.content.arguments.content,
          ),
        )
      : "Any"
  }
- Returns When True: ${
    isSome(switcher.content.returnsWhenTrue)
      ? formatEntries(
          Object.entries(
            switcher.content.returnsWhenTrue.content,
          ),
        )
      : "Any"
  }
- Returns When False: ${
    isSome(switcher.content.returnsWhenFalse)
      ? formatEntries(
          Object.entries(
            switcher.content.returnsWhenFalse.content,
          ),
        )
      : "Any"
  }`;
