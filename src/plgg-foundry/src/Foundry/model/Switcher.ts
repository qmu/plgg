import {
  KebabCase,
  Str,
  Option,
  PossiblyPromise,
  Datum,
  Dict,
  Box,
  box,
  isSome,
  isBoxWithTag,
  some,
  none,
} from "plgg";
import {
  Medium,
  VirtualType,
  VirtualTypeSpec,
  VariableName,
  formatVirtualType,
  toVirtualTypeDict,
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

/**
 * Type guard to check if apparatus is a Switcher.
 */
export const isSwitcher = (
  v: unknown,
): v is Switcher => isBoxWithTag("Switcher")(v);

/**
 * Creates a Switcher with strict type checking on return types.
 * The check function must return keys matching the returnsWhenTrue and returnsWhenFalse fields.
 * When returns fields are omitted, fn can return [boolean, unknown].
 */
export const makeSwitcher = <
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
}): Switcher =>
  box("Switcher")({
    name: box("KebabCase")(spec.name) as KebabCase,
    description: box("Str")(spec.description) as Str,
    arguments: spec.arguments
      ? some(toVirtualTypeDict(spec.arguments))
      : none(),
    returnsWhenTrue: spec.returnsWhenTrue
      ? some(toVirtualTypeDict(spec.returnsWhenTrue))
      : none(),
    returnsWhenFalse: spec.returnsWhenFalse
      ? some(toVirtualTypeDict(spec.returnsWhenFalse))
      : none(),
    fn: spec.fn,
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
      : "None"
  }
- Returns When False: ${
    isSome(switcher.content.returnsWhenFalse)
      ? formatEntries(
          Object.entries(
            switcher.content.returnsWhenFalse.content,
          ),
        )
      : "None"
  }`;
