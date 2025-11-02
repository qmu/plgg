import { Medium } from "plgg-foundry/index";
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
  inputType: Str;
  outputTypeWhenTrue: Str;
  outputTypeWhenFalse: Str;
  check: (input: Medium) => [
    boolean, // validity
    unknown, // proppagating data
  ];
};

export type SwitcherArg = {
  id: string;
  description: string;
  inputType: string;
  outputTypeWhenTrue: string;
  outputTypeWhenFalse: string;
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
    forProp("inputType", asStr),
    forProp("outputTypeWhenTrue", asStr),
    forProp("outputTypeWhenFalse", asStr),
    forProp("check", asFunc),
  );

/**
 * Castable instance for Switcher safe casting.
 */
export const switcherCastable: Castable<
  Switcher,
  SwitcherArg
> = {
  as: asSwitcher,
};
