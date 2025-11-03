import { Medium } from "plgg-foundry/index";
import {
  KebabCase,
  Str,
  Castable,
  Option,
  cast,
  forProp,
  forOptionProp,
  asStr,
  asFunc,
  asKebabCase,
} from "plgg";

export type Switcher = {
  id: KebabCase;
  description: Str;
  inputType: Option<Str>;
  outputTypeWhenTrue: Option<Str>;
  outputTypeWhenFalse: Option<Str>;
  check: (input: Medium) => [
    boolean, // validity
    unknown, // proppagating data
  ];
};

export type SwitcherArg = {
  id: string;
  description: string;
  inputType?: string;
  outputTypeWhenTrue?: string;
  outputTypeWhenFalse?: string;
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
    forOptionProp("inputType", asStr),
    forOptionProp("outputTypeWhenTrue", asStr),
    forOptionProp("outputTypeWhenFalse", asStr),
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
