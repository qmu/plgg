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

/**
 * Castable instance for Foundry safe casting.
 */
export const foundryCastable: Castable<
  unknown,
  Foundry
> = {
  as: (
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
    ),
};

/**
 * Exported safe casting function for Foundry values.
 */
export const { as: asFoundry } = foundryCastable;
