import { Medium } from "autoplgg/index";
import { Castable, cast, forProp, asStr, asFunc } from "plgg";

export type Processor = {
  id: string;
  description: string;
  inputType: string;
  outputType: string;
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
    forProp("id", asStr),
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
