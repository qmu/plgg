import {
  Castable,
  KebabCase,
  Str,
  Option,
  PossiblyPromise,
  Vec,
  cast,
  forProp,
  forOptionProp,
  asStr,
  asFunc,
  asKebabCase,
  isSome,
  asVecOf,
} from "plgg";
import {
  Medium,
  VirtualType,
  VirtualTypeSpec,
  asVirtualType,
} from "plgg-foundry/index";

export type Processor = Readonly<{
  name: KebabCase;
  description: Str;
  arguments: Option<Vec<VirtualType>>;
  returns: Option<Vec<VirtualType>>;
  process: (medium: Medium) => PossiblyPromise<unknown>;
}>;

export type ProcessorSpec = Readonly<{
  name: string;
  description: string;
  arguments?: ReadonlyArray<VirtualTypeSpec>;
  returns?: ReadonlyArray<VirtualTypeSpec>;
  process: (medium: Medium) => PossiblyPromise<unknown>;
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
      asVecOf(asVirtualType),
    ),
    forOptionProp(
      "returns",
      asVecOf(asVirtualType),
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
  vt: VirtualType,
): string => {
  const isOptional = isSome(vt.optional)
    ? vt.optional.content
    : true;
  const optionalMarker = isOptional ? "?" : "";
  return `${vt.name.content}: ${vt.type.content}${optionalMarker}`;
};

export const explainProcessor = (
  processor: Processor,
) => `${processor.description.content}

- Opcode: \`${processor.name.content}\`
- Arguments: ${
  isSome(processor.arguments)
    ? processor.arguments.content
        .map(formatVirtualType)
        .join(", ")
    : "Any"
}
- Returns: ${
  isSome(processor.returns)
    ? processor.returns.content
        .map(formatVirtualType)
        .join(", ")
    : "Any"
}`;
