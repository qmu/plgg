import {
  Castable,
  KebabCase,
  Str,
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
    returns: Dict<VariableName, VirtualType>;
    fn: (
      medium: Medium,
    ) => PossiblyPromise<
      Dict<VariableName, Datum>
    >;
  }>
>;

export type ProcessorSpec = Box<
  "ProcessorSpec",
  Readonly<{
    name: string;
    description: string;
    arguments?: Dict<
      VariableName,
      VirtualTypeSpec
    >;
    returns: Dict<VariableName, VirtualTypeSpec>;
    fn: (
      medium: Medium,
    ) => PossiblyPromise<
      Dict<VariableName, Datum>
    >;
  }>
>;

/**
 * Type guard to check if apparatus is a Processor.
 */
export const isProcessor = (
  v: unknown,
): v is Processor => isBoxWithTag("Processor")(v);

/**
 * Type guard to check if apparatus spec is a ProcessorSpec.
 */
export const isProcessorSpec = (
  v: unknown,
): v is ProcessorSpec =>
  isBoxWithTag("ProcessorSpec")(v);

/**
 * Validates and casts a ProcessorSpec to Processor.
 */
export const asProcessor = (
  value: ProcessorSpec,
) =>
  cast(
    value.content,
    asBox,
    forContent("Processor", (a) =>
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
          "returns",
          asDictOf(asVirtualType),
        ),
        forProp("fn", asFunc),
      ),
    ),
  );

/**
 *
 * Castable instance for Processor safe casting.
 */
export const processorCastable: Castable<
  Processor,
  ProcessorSpec
> = {
  as: asProcessor,
};

/**
 * Creates a ProcessorSpec with strict type checking on return type.
 * The process function must return keys matching the returns field.
 */
export const makeProcessorSpec = <
  const R extends Dict<
    VariableName,
    VirtualTypeSpec
  >,
>(spec: {
  name: string;
  description: string;
  arguments?: Dict<VariableName, VirtualTypeSpec>;
  returns: R;
  fn: (
    medium: Medium,
  ) => PossiblyPromise<
    R extends Dict<VariableName, VirtualTypeSpec>
      ? Record<keyof R & VariableName, Datum>
      : Dict<VariableName, Datum>
  >;
}): ProcessorSpec =>
  box("ProcessorSpec")<ProcessorSpec["content"]>({
    ...spec,
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
- Returns: ${formatEntries(
  Object.entries(processor.content.returns),
)}`;
