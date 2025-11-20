import {
  Castable,
  Result,
  isBoxWithTag,
  newErr,
  InvalidError,
} from "plgg";
import type { Processor, ProcessorSpec } from "./Processor";
import type { Switcher, SwitcherSpec } from "./Switcher";
import type { Packer, PackerSpec } from "./Packer";
import { asProcessor } from "./Processor";
import { asSwitcher } from "./Switcher";
import { asPacker } from "./Packer";
import { explainProcessor } from "./Processor";
import { explainSwitcher } from "./Switcher";
import { explainPacker } from "./Packer";

/**
 * Unified type representing any apparatus in the foundry.
 * Can be a processor, switcher, or packer.
 */
export type Apparatus = Processor | Switcher | Packer;

export type ApparatusSpec = ProcessorSpec | SwitcherSpec | PackerSpec;

/**
 * Type guard to check if apparatus is a Processor.
 */
export const isProcessor = (
  apparatus: unknown,
): apparatus is Processor =>
  typeof apparatus === "object" &&
  apparatus !== null &&
  "process" in apparatus &&
  typeof apparatus.process === "function";

/**
 * Type guard to check if apparatus is a Switcher.
 */
export const isSwitcher = (
  apparatus: unknown,
): apparatus is Switcher =>
  typeof apparatus === "object" &&
  apparatus !== null &&
  "check" in apparatus &&
  typeof apparatus.check === "function";

/**
 * Type guard to check if apparatus is a Packer.
 * Packers are plain Dict objects without 'process' or 'check' functions.
 */
export const isPacker = (
  apparatus: unknown,
): apparatus is Packer =>
  typeof apparatus === "object" &&
  apparatus !== null &&
  !("process" in apparatus) &&
  !("check" in apparatus) &&
  !("name" in apparatus);

/**
 * Validates and casts an ApparatusSpec to Apparatus.
 */
export const asApparatus = (
  value: ApparatusSpec,
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
      message: "Value is not a valid ApparatusSpec",
    }),
  );
};

/**
 * Castable instance for Apparatus safe casting.
 */
export const apparatusCastable: Castable<Apparatus, ApparatusSpec> = {
  as: asApparatus,
};

/**
 * Generates human-readable markdown description of apparatus.
 */
export const explainApparatus = (apparatus: Apparatus): string => {
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
