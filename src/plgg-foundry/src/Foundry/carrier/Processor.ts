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

export type Processor = {
  name: KebabCase;
  description: Str;
  inputType: Option<Str>;
  outputType: Option<Str>;
  process: (input: Medium) => unknown;
};

export type ProcessorArg = {
  name: string;
  description: string;
  inputType?: string;
  outputType?: string;
  process: (input: Medium) => unknown;
};

export const asProcessor = (
  value: ProcessorArg,
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
  ProcessorArg
> = {
  as: asProcessor,
};
