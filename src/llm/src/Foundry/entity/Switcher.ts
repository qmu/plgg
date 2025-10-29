import { Medium } from "autoplgg/index";
import {
  KebabCase,
  SoftStr,
  Castable,
  cast,
  forProp,
  asSoftStr,
  asFunc,
  asKebabCase,
} from "plgg";

export type Switcher = {
  id: KebabCase;
  description: SoftStr;
  input: SoftStr;
  outputWhenTrue: SoftStr;
  outputWhenFalse: SoftStr;
  check: (input: Medium) => [
    boolean, // validity
    unknown, // proppagating data
  ];
};

export type SwitcherArg = {
  id: string;
  description: string;
  input: string;
  outputWhenTrue: string;
  outputWhenFalse: string;
  check: (input: Medium) => [
    boolean, // validity
    unknown, // proppagating data
  ];
};

export const asSwitcher = (value: SwitcherArg) =>
  cast(
    value,
    forProp("id", asKebabCase),
    forProp("description", asSoftStr),
    forProp("input", asSoftStr),
    forProp("outputWhenTrue", asSoftStr),
    forProp("outputWhenFalse", asSoftStr),
    forProp("check", asFunc),
  );

/**
 * Castable instance for Switcher safe casting.
 */
export const switcherCastable: Castable<Switcher, SwitcherArg> = {
  as: asSwitcher,
};
