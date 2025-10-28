import {
  Processor,
  Switcher,
  asProcessor,
  asSwitcher,
} from 'autoplgg/index';
import {
  NonEmptyStr,
  Castable,
  Result,
  InvalidError,
  asNonEmptyStr,
  cast,
  asObj,
  forProp,
  asReadonlyArray,
} from 'plgg';

export type Foundry = {
  description: NonEmptyStr;
  processors: ReadonlyArray<Processor>;
  switchers: ReadonlyArray<Switcher>;
};

export const asFoundry = (
  value: unknown
): Result<Foundry, InvalidError> =>
  cast(
    value,
    asObj,
    forProp('description', asNonEmptyStr),
    forProp(
      'processors',
      asReadonlyArray(asProcessor)
    ),
    forProp(
      'switchers',
      asReadonlyArray(asSwitcher)
    )
  );

/**
 * Castable instance for Foundry safe casting.
 */
export const foundryCastable: Castable<Foundry> =
  {
    as: asFoundry,
  };
