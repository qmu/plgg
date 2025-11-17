import {
  Castable,
  KebabCase,
  Str,
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

export type ProcessorSpec = Readonly<{
  name: string;
  description: string;
  arguments?: Dict<VariableName, VirtualTypeSpec>;
  returns?: Dict<VariableName, VirtualTypeSpec>;
  process: (
    medium: Medium,
  ) => PossiblyPromise<unknown>;
}>;

export const asProcessor = (
  value: ProcessorSpec,
) =>
  cast(
    value,
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
 * Castable instance for Processor safe casting.
 */
export const processorCastable: Castable<
  Processor,
  ProcessorSpec
> = {
  as: asProcessor,
};

const formatVirtualType = (
  name: string,
  vt: VirtualType,
): string => {
  const isOptional = isSome(vt.optional)
    ? vt.optional.content
    : true;
  const optionalMarker = isOptional ? "?" : "";
  return `${name}: ${vt.type.content}${optionalMarker}`;
};

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
