import {
  Str,
  Result,
  box,
  find,
  pipe,
  filter,
} from "plgg";
import { Provider, openai } from "plgg-kit";
import {
  Apparatus,
  Processor,
  Switcher,
  Alignment,
  Medium,
  Order,
  isProcessor,
  isSwitcher,
  isPacker,
  explainApparatus,
} from "plgg-foundry/index";

/**
 * Callback invoked before operations are executed.
 * Receives the generated alignment (blueprint result).
 */
export type BeforeOperations = (ctx: {
  alignment: Alignment;
  order: Order;
}) => void;

/**
 * Callback invoked after operations are executed.
 * Receives the final medium containing results.
 */
export type AfterOperations = (ctx: {
  medium: Medium;
  order: Order;
}) => void;

/**
 * Factory containing available apparatuses (processors, switchers, and packers) for alignment execution.
 */
export type Foundry = Readonly<{
  provider: Provider;
  description: Str;
  maxOperationLimit: number;
  apparatuses: ReadonlyArray<Apparatus>;
  beforeOperations?: BeforeOperations;
  afterOperations?: AfterOperations;
}>;

/**
 * Creates a new Foundry with the given apparatuses.
 * Provider defaults to openai("gpt-5.1") if not specified.
 * maxOperationLimit defaults to 10 if not specified.
 */
export const makeFoundry = (spec: {
  description: string;
  apparatuses: ReadonlyArray<Apparatus>;
  provider?: Provider;
  maxOperationLimit?: number;
  beforeOperations?: BeforeOperations;
  afterOperations?: AfterOperations;
}): Foundry => {
  const base = {
    provider: spec.provider ?? openai("gpt-5.1"),
    description: box("Str")(spec.description) as Str,
    maxOperationLimit: spec.maxOperationLimit ?? 10,
    apparatuses: spec.apparatuses,
  };
  return {
    ...base,
    ...(spec.beforeOperations && {
      beforeOperations: spec.beforeOperations,
    }),
    ...(spec.afterOperations && {
      afterOperations: spec.afterOperations,
    }),
  };
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
