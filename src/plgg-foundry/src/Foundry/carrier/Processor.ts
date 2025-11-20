import {
  Castable,
  KebabCase,
  Str,
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
 * Function that processes input data and returns output data.
 */
export type Processor = Readonly<{
  name: KebabCase;
  description: Str;
  arguments: Option<
    Dict<VariableName, VirtualType>
  >;
  returns: Option<
    Dict<VariableName, VirtualType>
  >;
  process: (
    medium: Medium,
  ) => PossiblyPromise<Dict<VariableName, Datum>>;
}>;

export type ProcessorSpec = Box<
  "ProcessorSpec",
  Readonly<{
    name: string;
    description: string;
    arguments?: Dict<VariableName, VirtualTypeSpec>;
    returns?: Dict<VariableName, VirtualTypeSpec>;
    process: (
      medium: Medium,
    ) => PossiblyPromise<Dict<VariableName, Datum>>;
  }>
>;

/**
 * Validates and casts a ProcessorSpec to Processor.
 */
export const asProcessor = (
  value: ProcessorSpec,
) =>
  cast(
    value.content,
    forProp("name", asKebabCase),
    forProp("description", asStr),
    forOptionProp(
      "arguments",
      asDictOf(asVirtualType),
    ),
    forOptionProp(
      "returns",
      asDictOf(asVirtualType),
    ),
    forProp("process", asFunc),
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
export const newProcessorSpec = <
  const R extends Dict<
    VariableName,
    VirtualTypeSpec
  >,
>(spec: {
  name: string;
  description: string;
  arguments?: Dict<VariableName, VirtualTypeSpec>;
  returns?: R;
  process: (
    medium: Medium,
  ) => PossiblyPromise<
    R extends Dict<VariableName, VirtualTypeSpec>
      ? Record<keyof R & VariableName, Datum>
      : Dict<VariableName, Datum>
  >;
}): ProcessorSpec =>
  newBox("ProcessorSpec")<ProcessorSpec["content"]>(
    spec,
  );

/**
 * Generates human-readable markdown description of processor.
 */
export const explainProcessor = (
  processor: Processor,
) => `${processor.description.content}

- Opcode: \`${processor.name.content}\`
- Arguments: ${
  isSome(processor.arguments)
    ? Object.entries(processor.arguments.content)
        .map(([name, vt]) =>
          formatVirtualType(name, vt),
        )
        .join(", ")
    : "Any"
}
- Returns: ${
  isSome(processor.returns)
    ? Object.entries(processor.returns.content)
        .map(([name, vt]) =>
          formatVirtualType(name, vt),
        )
        .join(", ")
    : "Any"
}`;
