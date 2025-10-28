import {
  Processor,
  Switcher,
  ProcessorArg,
  SwitcherArg,
  asProcessor,
  asSwitcher,
} from "autoplgg/index";
import {
  NonEmptyStr,
  Castable,
  asNonEmptyStr,
  cast,
  asObj,
  forProp,
  asReadonlyArray,
} from "plgg";

export type Foundry = {
  description: NonEmptyStr;
  processors: ReadonlyArray<Processor>;
  switchers: ReadonlyArray<Switcher>;
};

export type FoundryArg = {
  description: string;
  processors: ReadonlyArray<ProcessorArg>;
  switchers: ReadonlyArray<SwitcherArg>;
};

export const asFoundry = (value: FoundryArg) =>
  cast(
    value,
    asObj,
    forProp("description", asNonEmptyStr),
    forProp("processors", asReadonlyArray(asProcessor)),
    forProp("switchers", asReadonlyArray(asSwitcher)),
  );

/**
 * Castable instance for Foundry safe casting.
 */
export const foundryCastable: Castable<Foundry, FoundryArg> = {
  as: asFoundry,
};
