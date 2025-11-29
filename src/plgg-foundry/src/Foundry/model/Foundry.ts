import {
  Str,
  Castable,
  Result,
  Box,
  box,
  asStr,
  cast,
  forProp,
  asReadonlyArray,
  find,
  pipe,
  filter,
  isBoxWithTag,
} from "plgg";
import { Provider } from "plgg-kit";
import {
  Apparatus,
  ApparatusSpec,
  Processor,
  Switcher,
  asApparatus,
  isProcessor,
  isSwitcher,
  isPacker,
  explainApparatus,
} from "plgg-foundry/index";

/**
 * Factory containing available apparatuses (processors, switchers, and packers) for alignment execution.
 */
export type Foundry = Readonly<{
  provider: Provider;
  description: Str;
  maxOperationLimit: number;
  apparatuses: ReadonlyArray<Apparatus>;
}>;

export type FoundrySpec = Box<
  "FoundrySpec",
  Readonly<{
    description: string;
    maxOperationLimit?: number;
    apparatuses: ReadonlyArray<ApparatusSpec>;
  }>
>;

/**
 * Creates a new FoundrySpec with type-safe content.
 */
export const makeFoundrySpec = (
  content: FoundrySpec["content"],
): FoundrySpec =>
  box("FoundrySpec")<FoundrySpec["content"]>(
    content,
  );

/**
 * Type guard to check if a value is a FoundrySpec.
 */
export const isFoundrySpec = (
  v: unknown,
): v is FoundrySpec => isBoxWithTag("FoundrySpec")(v);

/**
 * Validates and casts a FoundrySpec to Foundry with default maxOperationLimit of 10.
 */
export const asFoundry = ({
  provider,
  spec,
}: {
  provider: Provider;
  spec: FoundrySpec;
}) =>
  cast(
    {
      provider,
      maxOperationLimit: 10,
      ...spec.content,
    },
    forProp("description", asStr),
    forProp(
      "apparatuses",
      asReadonlyArray(asApparatus),
    ),
  );

/**
 * Castable instance for Foundry safe casting.
 */
export const foundrySpecCastable: Castable<
  Foundry,
  {
    provider: Provider;
    spec: FoundrySpec;
  }
> = {
  as: asFoundry,
};

/**
 * Finds a switcher by opcode in the foundry apparatuses.
 */
export const findSwitcher = (
  foundry: Foundry,
  opcode: string,
): Result<Switcher, Error> =>
  pipe(
    foundry.apparatuses,
    filter(isSwitcher),
    find<Switcher>({
      predicate: (s) =>
        s.content.name.content === opcode,
      errMessage: `No switcher found for opcode "${opcode}"`,
    }),
  );

/**
 * Finds a processor by opcode in the foundry apparatuses.
 */
export const findProcessor = (
  foundry: Foundry,
  opcode: string,
): Result<Processor, Error> =>
  pipe(
    foundry.apparatuses,
    filter(isProcessor),
    find<Processor>({
      predicate: (p) =>
        p.content.name.content === opcode,
      errMessage: `No processor found for opcode "${opcode}"`,
    }),
  );

/**
 * Generates comprehensive markdown documentation of the foundry.
 */
export const explainFoundry = (
  foundry: Foundry,
) => {
  const processors = pipe(
    foundry.apparatuses,
    filter(isProcessor),
  );
  const switchers = pipe(
    foundry.apparatuses,
    filter(isSwitcher),
  );
  const packers = pipe(
    foundry.apparatuses,
    filter(isPacker),
  );

  return `## 1. Foundry Description

${foundry.description.content}

## 2. Processors

${processors
  .map(
    (
      a,
      i,
    ) => `### 2-${i + 1}. ${a.content.name.content}

${explainApparatus(a)}
`,
  )
  .join("\n")}

## 3. Switchers

${switchers
  .map(
    (
      a,
      i,
    ) => `### 3-${i + 1}. ${a.content.name.content}

${explainApparatus(a)}
`,
  )
  .join("\n")}

## 4. Packers

${packers
  .map(
    (a, i) => `### 4-${i + 1}. Packer ${i + 1}

${explainApparatus(a)}
`,
  )
  .join("\n")}
`;
};

/**
 * Extracts opcode names from apparatuses of a specific type.
 * Only works for Processors and Switchers which have name fields.
 */
export const extractOpcodes = (
  apparatuses: ReadonlyArray<Apparatus>,
  filter: (apparatus: Apparatus) => boolean,
): ReadonlyArray<string> =>
  apparatuses
    .filter(filter)
    .filter(
      (item): item is Processor | Switcher =>
        "name" in item.content,
    )
    .map((item) => item.content.name.content);
