import {
  KebabCase,
  Str,
  Castable,
  Option,
  PossiblyPromise,
  cast,
  forProp,
  forOptionProp,
  asStr,
  asFunc,
  asKebabCase,
  isSome,
} from "plgg";
import {
  Medium,
  Alignment,
} from "plgg-foundry/index";

export type Switcher = Readonly<{
  name: KebabCase;
  description: Str;
  inputType: Option<Str>;
  outputTypeWhenTrue: Option<Str>;
  outputTypeWhenFalse: Option<Str>;
  check: (arg: {
    medium: Medium;
    alignment: Alignment;
  }) => PossiblyPromise<
    [
      boolean, // validity
      unknown, // proppagating data
    ]
  >;
}>;

export type SwitcherSpec = Readonly<{
  name: string;
  description: string;
  inputType?: string;
  outputTypeWhenTrue?: string;
  outputTypeWhenFalse?: string;
  check: (arg: {
    medium: Medium;
    alignment: Alignment;
  }) => PossiblyPromise<
    [
      boolean, // validity
      unknown, // proppagating data
    ]
  >;
}>;

export const asSwitcher = (value: SwitcherSpec) =>
  cast(
    value,
    forProp("name", asKebabCase),
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
  SwitcherSpec
> = {
  as: asSwitcher,
};

export const explainSwitcher = (
  switcher: Switcher,
) =>
  `${switcher.description.content}

- Opcode: \`${switcher.name.content}\`
- Input Type: ${
    isSome(switcher.inputType)
      ? `\`${switcher.inputType.content.content}\``
      : "None"
  }
- Output Type When True: ${
    isSome(switcher.outputTypeWhenTrue)
      ? `\`${switcher.outputTypeWhenTrue.content.content}\``
      : "None"
  }
- Output Type When False: ${
    isSome(switcher.outputTypeWhenFalse)
      ? `\`${switcher.outputTypeWhenFalse.content.content}\``
      : "None"
  }`;
