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

export type FoundrySpec = {
  description: Str;
  processors: ReadonlyArray<Processor>;
  switchers: ReadonlyArray<Switcher>;
};

export type FoundrySpecArg = {
  description: string;
  processors: ReadonlyArray<ProcessorArg>;
  switchers: ReadonlyArray<SwitcherArg>;
};

export const asFoundrySpec = (
  value: FoundrySpecArg,
) =>
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
export const foundrySpecCastable: Castable<
  FoundrySpec,
  FoundrySpecArg
> = {
  as: asFoundrySpec,
};
