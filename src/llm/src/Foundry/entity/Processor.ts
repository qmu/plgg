import { Medium } from 'autoplgg/index';
import {
  Castable,
  Result,
  InvalidError,
  cast,
  asObj,
  forProp,
  asStr,
  asFunc,
} from 'plgg';

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
};

export const asProcessor = (
  value: unknown
): Result<Processor, InvalidError> =>
  cast(
    value,
    asObj,
    forProp('id', asStr),
    forProp('description', asStr),
    forProp('inputType', asStr),
    forProp('outputType', asStr),
    forProp('process', asFunc)
  );

/**
 * Castable instance for Processor safe casting.
 */
export const processorCastable: Castable<Processor> =
  {
    as: asProcessor,
  };
