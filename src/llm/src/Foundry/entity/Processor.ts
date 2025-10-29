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
  id: KebabCase;
  description: Str;
  inputType: Str;
  outputType: Str;
  process: (input: Medium) => unknown;
};

export type ProcessorArg = {
  id: string;
  description: string;
  inputType: string;
  outputType: string;
  process: (input: Medium) => unknown;
};

export const asProcessor = (value: ProcessorArg) =>
  cast(
    value,
    forProp("id", asKebabCase),
    forProp("description", asStr),
    forProp("inputType", asStr),
    forProp("outputType", asStr),
    forProp("process", asFunc),
  );

/**
 * Castable instance for Processor safe casting.
 */
export const processorCastable: Castable<Processor, ProcessorArg> = {
  as: asProcessor,
};
