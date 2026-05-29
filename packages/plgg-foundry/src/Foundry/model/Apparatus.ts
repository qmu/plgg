import {
  Processor,
  Switcher,
  Packer,
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
