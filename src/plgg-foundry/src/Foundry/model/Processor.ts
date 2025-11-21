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
  type: "Processor";
  name: KebabCase;
  description: Str;
  arguments: Option<
    Dict<VariableName, VirtualType>
  >;
  returns: Dict<VariableName, VirtualType>;
  fn: (
    medium: Medium,
  ) => PossiblyPromise<Dict<VariableName, Datum>>;
}>;

export type ProcessorSpec = Box<
  "ProcessorSpec",
  Readonly<{
    type: "Processor";
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
  apparatus: unknown,
): apparatus is Processor =>
  typeof apparatus === "object" &&
  apparatus !== null &&
  "type" in apparatus &&
  apparatus.type === "Processor";

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
    forProp("returns", asDictOf(asVirtualType)),
    forProp("fn", asFunc),
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
  returns: R;
  fn: (
    medium: Medium,
  ) => PossiblyPromise<
    R extends Dict<VariableName, VirtualTypeSpec>
      ? Record<keyof R & VariableName, Datum>
      : Dict<VariableName, Datum>
  >;
}): ProcessorSpec =>
  newBox("ProcessorSpec")<
    ProcessorSpec["content"]
  >({
    type: "Processor",
    ...spec,
  });

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
- Returns: ${Object.entries(processor.returns)
  .map(([name, vt]) =>
    formatVirtualType(name, vt),
  )
  .join(", ")}`;
