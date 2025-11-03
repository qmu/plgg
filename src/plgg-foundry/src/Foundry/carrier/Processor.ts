import { Medium } from "plgg-foundry/index";
import {
  Castable,
  KebabCase,
  Str,
  Option,
  cast,
  forProp,
  forOptionProp,
  asStr,
  asFunc,
  asKebabCase,
} from "plgg";

export type Processor = Readonly<{
  name: KebabCase;
  description: Str;
  inputType: Option<Str>;
  outputType: Option<Str>;
  process: (input: Medium) => unknown;
}>;

export type ProcessorSpec = Readonly<{
  name: string;
  description: string;
  inputType?: string;
  outputType?: string;
  process: (input: Medium) => unknown;
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
