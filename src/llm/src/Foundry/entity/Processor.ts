import { Medium } from "autoplgg/index";
import {
  Castable,
  KebabCase,
  Str,
  cast,
  forProp,
  asStr,
  asFunc,
  asKebabCase,
} from "plgg";

export type Processor = {
  opcode: KebabCase;
  description: Str;
  inputType: Str;
  outputType: Str;
  process: (input: Medium) => unknown;
};

export type ProcessorArg = {
  opcode: string;
  description: string;
  inputType: string;
  outputType: string;
  process: (input: Medium) => unknown;
};

export const asProcessor = (
  value: ProcessorArg,
) =>
  cast(
    value,
    forProp("opcode", asKebabCase),
    forProp("description", asStr),
    forProp("inputType", asStr),
    forProp("outputType", asStr),
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
