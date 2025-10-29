import {
  Processor,
  Switcher,
  ProcessorArg,
  SwitcherArg,
  asProcessor,
  asSwitcher,
} from "autoplgg/index";
import {
  Str,
  Castable,
  asStr,
  cast,
  forProp,
  asReadonlyArray,
} from "plgg";

export type Foundry = {
  description: Str;
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
    forProp("description", asStr),
    forProp(
      "processors",
      asReadonlyArray(asProcessor),
    ),
    forProp(
      "switchers",
      asReadonlyArray(asSwitcher),
    ),
  );

/**
 * Castable instance for Foundry safe casting.
 */
export const foundryCastable: Castable<
  Foundry,
  FoundryArg
> = {
  as: asFoundry,
};
