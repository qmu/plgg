import { Medium } from "autoplgg/index";
import {
  Castable,
  KebabCase,
  SoftStr,
  cast,
  forProp,
  asSoftStr,
  asFunc,
  asKebabCase,
} from "plgg";

export type Processor = {
  id: KebabCase;
  description: SoftStr;
  inputType: SoftStr;
  outputType: SoftStr;
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
    forProp("description", asSoftStr),
    forProp("inputType", asSoftStr),
    forProp("outputType", asSoftStr),
    forProp("process", asFunc),
  );

/**
 * Castable instance for Processor safe casting.
 */
export const processorCastable: Castable<Processor, ProcessorArg> = {
  as: asProcessor,
};
