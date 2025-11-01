import {
  Str,
  Castable,
  Result,
  asStr,
  cast,
  forProp,
  asReadonlyArray,
  newOk,
  newErr,
} from "plgg";
import {
  Processor,
  Switcher,
  ProcessorArg,
  SwitcherArg,
  asProcessor,
  asSwitcher,
} from "autoplgg/index";

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

export const findSwitcher = (
  foundry: FoundrySpec,
  opcode: string,
): Result<Switcher, Error> => {
  const switcher = foundry.switchers.find(
    (s) => s.id.content === opcode,
  );
  if (!switcher) {
    return newErr(
      new Error(
        `No switcher found for opcode "${opcode}"`,
      ),
    );
  }
  return newOk(switcher);
};

export const findProcessor = (
  foundry: FoundrySpec,
  opcode: string,
): Result<Processor, Error> => {
  const processor = foundry.processors.find(
    (p) => p.opcode.content === opcode,
  );
  if (!processor) {
    return newErr(
      new Error(
        `No processor found for opcode "${opcode}"`,
      ),
    );
  }
  return newOk(processor);
};
