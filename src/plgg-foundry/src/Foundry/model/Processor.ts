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
 * Function that processes input data and returns output data.
 */
export type Processor = Box<
  "Processor",
  Readonly<{
    name: KebabCase;
    description: Str;
    arguments: Option<
      Dict<VariableName, VirtualType>
    >;
    returns: Option<
      Dict<VariableName, VirtualType>
    >;
    fn: (
      medium: Medium,
    ) => PossiblyPromise<unknown>;
  }>
>;

/**
 * Type guard to check if apparatus is a Processor.
 */
export const isProcessor = (
  v: unknown,
): v is Processor => isBoxWithTag("Processor")(v);

/**
 * Creates a Processor with strict type checking on return type.
 * The process function must return keys matching the returns field.
 * When returns is omitted, fn can return void.
 */
export const makeProcessor = <
  const R extends
    | Dict<VariableName, VirtualTypeSpec>
    | undefined,
>(spec: {
  name: string;
  description: string;
  arguments?: Dict<VariableName, VirtualTypeSpec>;
  returns?: R;
  fn: (
    medium: Medium,
  ) => R extends Dict<VariableName, VirtualTypeSpec>
    ? PossiblyPromise<Record<keyof R & VariableName, Datum>>
    : PossiblyPromise<unknown>;
}): Processor =>
  box("Processor")({
    name: box("KebabCase")(spec.name) as KebabCase,
    description: box("Str")(spec.description) as Str,
    arguments: spec.arguments
      ? some(toVirtualTypeDict(spec.arguments))
      : none(),
    returns: spec.returns
      ? some(toVirtualTypeDict(spec.returns))
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
 * Generates human-readable markdown description of processor.
 */
export const explainProcessor = (
  processor: Processor,
) => `${processor.content.description.content}

- Opcode: \`${processor.content.name.content}\`
- Arguments: ${
  isSome(processor.content.arguments)
    ? formatEntries(
        Object.entries(
          processor.content.arguments.content,
        ),
      )
    : "Any"
}
- Returns: ${
  isSome(processor.content.returns)
    ? formatEntries(
        Object.entries(
          processor.content.returns.content,
        ),
      )
    : "None"
}`;
