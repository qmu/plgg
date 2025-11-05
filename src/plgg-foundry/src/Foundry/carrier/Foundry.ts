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
  ProcessorSpec,
  Processor,
  SwitcherSpec,
  Switcher,
  PackerSpec,
  Packer,
  asProcessor,
  asSwitcher,
  asPacker,
} from "plgg-foundry/index";

export type Foundry = Readonly<{
  description: Str;
  processors: ReadonlyArray<Processor>;
  switchers: ReadonlyArray<Switcher>;
  packers: ReadonlyArray<Packer>;
}>;

export type FoundrySpec = Readonly<{
  description: string;
  processors: ReadonlyArray<ProcessorSpec>;
  switchers: ReadonlyArray<SwitcherSpec>;
  packers: ReadonlyArray<PackerSpec>;
}>;

export const asFoundry = (value: FoundrySpec) =>
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
    forProp("packers", asReadonlyArray(asPacker)),
  );

/**
 * Castable instance for Foundry safe casting.
 */
export const foundrySpecCastable: Castable<
  Foundry,
  FoundrySpec
> = {
  as: asFoundry,
};

export const findSwitcher = (
  foundry: Foundry,
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
  foundry: Foundry,
  opcode: string,
): Result<Processor, Error> => {
  const processor = foundry.processors.find(
    (p) => p.name.content === opcode,
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
