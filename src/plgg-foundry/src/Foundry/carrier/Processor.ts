import {
  Castable,
  KebabCase,
  Str,
  Option,
  PossiblyPromise,
  cast,
  forProp,
  forOptionProp,
  asStr,
  asFunc,
  asKebabCase,
  isSome,
} from "plgg";
import {
  Medium,
  Alignment,
} from "plgg-foundry/index";

export type Processor = Readonly<{
  name: KebabCase;
  description: Str;
  inputType: Option<Str>;
  outputType: Option<Str>;
  process: (arg: {
    medium: Medium;
    alignment: Alignment;
  }) => PossiblyPromise<unknown>;
}>;

export type ProcessorSpec = Readonly<{
  name: string;
  description: string;
  inputType?: string;
  outputType?: string;
  process: (arg: {
    medium: Medium;
    alignment: Alignment;
  }) => PossiblyPromise<unknown>;
}>;

export const asProcessor = (
  value: ProcessorSpec,
) =>
  cast(
    value,
    forProp("name", asKebabCase),
    forProp("description", asStr),
    forOptionProp("inputType", asStr),
    forOptionProp("outputType", asStr),
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

export const explainProcessor = (
  processor: Processor,
) => `${processor.description.content}

- Opcode: \`${processor.name.content}\`
- Input Type: ${
  isSome(processor.inputType)
    ? `\`${processor.inputType.content.content}\``
    : "Any"
}
- Output Type: ${
  isSome(processor.outputType)
    ? `\`${processor.outputType.content.content}\``
    : "Any"
}`;
