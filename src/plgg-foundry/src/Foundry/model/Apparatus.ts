import {
  Processor,
  Switcher,
  Packer,
  VirtualType,
  explainProcessor,
  explainSwitcher,
  explainPacker,
  formatVirtualType,
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
 * Formats entries as multiline YAML-like list.
 * Shared by Processor and Switcher explain functions.
 */
export const formatEntries = (
  entries: ReadonlyArray<[string, VirtualType]>,
): string =>
  "\n" +
  entries
    .map(
      ([name, vt]) =>
        `  - ${formatVirtualType(name, vt)}`,
    )
    .join("\n");

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
