import {
  Castable,
  Result,
  InvalidError,
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
  isProcessorSpec,
  isSwitcherSpec,
  isPackerSpec,
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
  v: unknown,
): Result<Apparatus, InvalidError> => {
  if (isProcessorSpec(v)) {
    return asProcessor(v);
  }
  if (isSwitcherSpec(v)) {
    return asSwitcher(v);
  }
  if (isPackerSpec(v)) {
    return asPacker(v);
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
