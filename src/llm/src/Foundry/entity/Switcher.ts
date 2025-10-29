import { Medium } from "autoplgg/index";
import {
  KebabCase,
  Str,
  Castable,
  cast,
  forProp,
  asStr,
  asFunc,
  asKebabCase,
} from "plgg";

export type Switcher = {
  id: KebabCase;
  description: Str;
  input: Str;
  outputWhenTrue: Str;
  outputWhenFalse: Str;
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
    forProp("description", asStr),
    forProp("input", asStr),
    forProp("outputWhenTrue", asStr),
    forProp("outputWhenFalse", asStr),
    forProp("check", asFunc),
  );

/**
 * Castable instance for Switcher safe casting.
 */
export const switcherCastable: Castable<Switcher, SwitcherArg> = {
  as: asSwitcher,
};
