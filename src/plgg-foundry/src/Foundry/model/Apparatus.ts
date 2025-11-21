import {
  Castable,
  Result,
  InvalidError,
  isBoxWithTag,
  newErr,
} from "plgg";
import {
  Processor,
  ProcessorSpec,
  Switcher,
  SwitcherSpec,
  Packer,
  PackerSpec,
  asProcessor,
  asSwitcher,
  asPacker,
  explainProcessor,
  explainSwitcher,
  explainPacker,
  isProcessor,
  isSwitcher,
  isPacker,
} from "plgg-foundry/index";

/**
 * Unified type representing any apparatus in the foundry.
 * Can be a processor, switcher, or packer.
 */
export type Apparatus =
  | Processor
  | Switcher
  | Packer;

export type ApparatusSpec =
  | ProcessorSpec
  | SwitcherSpec
  | PackerSpec;

/**
 * Validates and casts an ApparatusSpec to Apparatus.
 */
export const asApparatus = (
  value: unknown,
): Result<Apparatus, InvalidError> => {
  if (isBoxWithTag("ProcessorSpec")(value)) {
    return asProcessor(value as ProcessorSpec);
  }
  if (isBoxWithTag("SwitcherSpec")(value)) {
    return asSwitcher(value as SwitcherSpec);
  }
  if (isBoxWithTag("PackerSpec")(value)) {
    return asPacker(value as PackerSpec);
  }
  return newErr(
    new InvalidError({
      message:
        "Value is not a valid ApparatusSpec",
    }),
  );
};

/**
 * Castable instance for Apparatus safe casting.
 */
export const apparatusCastable: Castable<
  Apparatus,
  ApparatusSpec
> = {
  as: asApparatus,
};

/**
 * Generates human-readable markdown description of apparatus.
 */
export const explainApparatus = (
  apparatus: Apparatus,
): string => {
  if (isProcessor(apparatus)) {
    return explainProcessor(apparatus);
  }
  if (isSwitcher(apparatus)) {
    return explainSwitcher(apparatus);
  }
  if (isPacker(apparatus)) {
    return explainPacker(apparatus);
  }
  return "Unknown apparatus type";
};
