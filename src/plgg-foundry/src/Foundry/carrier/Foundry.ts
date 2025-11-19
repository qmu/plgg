import {
  Str,
  Castable,
  Result,
  asStr,
  cast,
  forProp,
  asReadonlyArray,
  find,
  pipe,
} from "plgg";
import {
  ProcessorSpec,
  Processor,
  SwitcherSpec,
  Switcher,
  PackerSpec,
  Packer,
  asProcessor,
  asSwitcher,
  asPacker,
  explainProcessor,
  explainSwitcher,
  explainPacker,
} from "plgg-foundry/index";

/**
 * Factory containing available processors, switchers, and packers for alignment execution.
 */
export type Foundry = Readonly<{
  description: Str;
  apiKey: Str;
  maxOperationLimit: number;
  processors: ReadonlyArray<Processor>;
  switchers: ReadonlyArray<Switcher>;
  packers: ReadonlyArray<Packer>;
}>;

export type FoundrySpec = Readonly<{
  apiKey: string;
  description: string;
  maxOperationLimit?: number;
  processors: ReadonlyArray<ProcessorSpec>;
  switchers: ReadonlyArray<SwitcherSpec>;
  packers: ReadonlyArray<PackerSpec>;
}>;

/**
 * Validates and casts a FoundrySpec to Foundry with default maxOperationLimit of 10.
 */
export const asFoundry = (value: FoundrySpec) =>
  cast(
    {
      ...value,
      maxOperationLimit:
        value.maxOperationLimit ?? 10,
    },
    forProp("apiKey", asStr),
    forProp("description", asStr),
    forProp(
      "processors",
      asReadonlyArray(asProcessor),
    ),
    forProp(
      "switchers",
      asReadonlyArray(asSwitcher),
    ),
    forProp("packers", asReadonlyArray(asPacker)),
  );

/**
 * Castable instance for Foundry safe casting.
 */
export const foundrySpecCastable: Castable<
  Foundry,
  FoundrySpec
> = {
  as: asFoundry,
};

/**
 * Finds a switcher by opcode in the foundry.
 */
export const findSwitcher = (
  foundry: Foundry,
  opcode: string,
): Result<Switcher, Error> =>
  pipe(
    foundry.switchers,
    find<Switcher>({
      predicate: (s) => s.name.content === opcode,
      errMessage: `No switcher found for opcode "${opcode}"`,
    }),
  );

/**
 * Finds a processor by opcode in the foundry.
 */
export const findProcessor = (
  foundry: Foundry,
  opcode: string,
): Result<Processor, Error> =>
  pipe(
    foundry.processors,
    find<Processor>({
      predicate: (p) => p.name.content === opcode,
      errMessage: `No processor found for opcode "${opcode}"`,
    }),
  );

/**
 * Generates comprehensive markdown documentation of the foundry.
 */
export const explainFoundry = (
  foundry: Foundry,
) => `## 1. Foundry Description

${foundry.description.content}

## 2. Processors

${foundry.processors
  .map(
    (a, i) => `### 2-${i + 1}. ${a.name.content}

${explainProcessor(a)}
`,
  )
  .join("\n")}

## 3. Switchers

${foundry.switchers
  .map(
    (a, i) => `### 3-${i + 1}. ${a.name.content}

${explainSwitcher(a)}
`,
  )
  .join("\n")}

## 4. Packers

${foundry.packers
  .map(
    (a, i) => `### 4-${i + 1}. ${a.name.content}

${explainPacker(a)}
`,
  )
  .join("\n")}
`;

/**
 * Extracts opcode names from items containing name.content property.
 */
export const extractOpcodes = <
  T extends { name: { content: string } },
>(
  items: ReadonlyArray<T>,
): ReadonlyArray<string> =>
  items.map((item) => item.name.content);
