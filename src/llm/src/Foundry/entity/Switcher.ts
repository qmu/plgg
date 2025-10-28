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

export type Switcher = {
  id: string;
  description: string;
  input: string;
  outputWhenTrue: string;
  outputWhenFalse: string;
  check: (input: Medium) => [
    boolean, // validity
    unknown, // proppagating data
  ];
};

/**
 * Castable instance for Switcher safe casting.
 */
export const switcherCastable: Castable<
  unknown,
  Switcher
> = {
  as: (
    value: unknown
  ): Result<Switcher, InvalidError> =>
    cast(
      value,
      asObj,
      forProp('id', asStr),
      forProp('description', asStr),
      forProp('input', asStr),
      forProp('outputWhenTrue', asStr),
      forProp('outputWhenFalse', asStr),
      forProp('check', asFunc)
    ),
};

/**
 * Exported safe casting function for Switcher values.
 */
export const { as: asSwitcher } =
  switcherCastable;
