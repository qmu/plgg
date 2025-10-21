import { Result, newOk, isErr } from "plgg";

// ---------------------------

type Foundry = {
  description: string;
  processors: ReadonlyArray<Processor>;
  switchers: ReadonlyArray<Switcher>;
};

type Processor = {
  id: string;
  description: string;
  input: string;
  output: string;
  process: (input: Medium) => unknown;
};

type Switcher = {
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

// ---------------------------

type Alignment = ReadonlyArray<Operation>;

type Operation = ProcessorOp | SwitcherOp;

type ProcessorOp = Readonly<{
  type: "processor";
  initial?: boolean;
  final?: boolean;
  id: string;
  to?: string;
}>;

const isProcessorOp = (op: Operation): op is ProcessorOp =>
  op.type === "processor";

type SwitcherOp = Readonly<{
  type: "switcher";
  id: string;
  whenTrue: string;
  whenFalse: string;
}>;

const isSwithcerOp = (op: Operation): op is SwitcherOp =>
  op.type === "switcher";

// ---------------------------

type Medium = Readonly<{
  startedAt: string;
  endedAt: string;
  currentOpId: string | undefined;
  nextOpId: string | undefined;
  lastMedium: Medium | undefined;
  output: unknown;
}>;

type Procedure = (initialValue: unknown) => Promise<Medium>;

const buildProcedure = ({
  foundry,
  alignment,
}: {
  foundry: Foundry;
  alignment: Alignment;
}): Result<{ exec: Procedure }, Error> => {
  return newOk({
    exec: async (iniValue) => {
      const iniOp = alignment.find((op) => "initial" in op && op.initial);
      if (!iniOp) {
        throw new Error("No initial operation found in alignment");
      }
      const medium: Medium = {
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        output: iniValue,
        currentOpId: undefined,
        nextOpId: iniOp.id,
        lastMedium: undefined,
      };
      return evalOperation({
        foundry,
        alignment,
        medium,
      });
    },
  });
};

const evalOperation = async ({
  foundry,
  alignment,
  medium,
}: {
  foundry: Foundry;
  alignment: Alignment;
  medium: Medium;
}): Promise<Medium> => {
  const op = alignment.find((op) => op.id === medium.nextOpId);
  if (!op) {
    throw new Error(`Operation "${medium.nextOpId}" not found in alignment`);
  }

  if (isSwithcerOp(op)) {
    const switcher = foundry.switchers.find((s) => s.id === op.id);
    if (!switcher) {
      throw new Error(`No checker found for step type "${op.id}"`);
    }
    const startedAt = new Date().toISOString();
    const [isValid, value] = switcher.check(medium);
    return evalOperation({
      foundry,
      alignment,
      medium: {
        startedAt,
        endedAt: new Date().toISOString(),
        currentOpId: op.id,
        nextOpId: isValid ? op.whenTrue : op.whenFalse,
        output: value,
        lastMedium: medium,
      },
    });
  }

  if (isProcessorOp(op)) {
    const processor = foundry.processors.find((p) => p.id === op.id);
    if (!processor) {
      throw new Error(`No processor found for step type "${op.id}"`);
    }
    const startedAt = new Date().toISOString();
    const output = await processor.process(medium);
    const newMedium = {
      startedAt,
      endedAt: new Date().toISOString(),
      currentOpId: op.id,
      nextOpId: op.to,
      output,
      lastMedium: medium,
    };
    return op.final
      ? newMedium
      : evalOperation({
          foundry,
          alignment,
          medium: newMedium,
        });
  }

  throw new Error(`Unknown operation type for operation`);
};

const planAlignment = ({
  foundry,
  instruction,
}: {
  foundry: Foundry;
  instruction: string;
}): Alignment => {
  console.log(foundry, instruction);
  const examplAlignment: Alignment = [
    {
      type: "processor",
      initial: true,
      id: "plan",
      to: "genMain",
    },
    {
      type: "processor",
      id: "genMain",
      to: "checkValidity",
    },
    {
      type: "switcher",
      id: "checkValidity",
      whenTrue: "genSpread",
      whenFalse: "plan",
    },
    {
      type: "processor",
      id: "genSpread",
      final: true,
    },
  ];

  return examplAlignment;
};

// -------------------------------
// Example
// -------------------------------

type Base64 = string;

type Image = Readonly<{
  base64: Base64;
}>;
type ImageMediumValue = ReadonlyArray<Image>;
type StringMediumValue = string;

const isImage = (a: unknown): a is ImageMediumValue =>
  Array.isArray(a) &&
  a.every((item) => typeof item === "object" && "base64" in item);

const isString = (a: unknown): a is StringMediumValue => typeof a === "string";

const exampleFoundry: Foundry = {
  description: `This is a foundry for generating character designs based on text prompts and reference images.`,
  processors: [
    {
      id: "plan",
      description: "Plans the character design based on the prompt",
      input: "string",
      output: "string",
      process: (medium) => {
        if (!isString(medium.output)) {
          console.log(medium);
          throw new Error("Invalid medium value for planning step");
        }
        console.log("01:plan");
        return "Well-planned character design description";
      },
    },
    {
      id: "analyze",
      description: "Analyzes reference images for character features",
      input: "image[]",
      output: "string",
      process: (medium) => {
        if (!isImage(medium.output)) {
          throw new Error("Invalid medium value for analyzing step");
        }
        console.log("02:analyze");
        return [{ base64: "base64imagestring" }];
      },
    },
    {
      id: "genMain",
      description: "Generates the main character image",
      input: "string",
      output: "image[]",
      process: (medium) => {
        if (!isString(medium.output)) {
          throw new Error("Invalid medium value for main generation step");
        }
        console.log("03:genMain");
        return [{ base64: "base64imagestring" }];
      },
    },
    {
      id: "genSpread",
      description: "Generates spread images for the character",
      input: "image[]",
      output: "image[]",
      process: (medium) => {
        if (!isImage(medium.output)) {
          throw new Error("Invalid medium value for spread generation step");
        }
        console.log("04:genSpread");
        return [{ base64: "base64imagestring" }];
      },
    },
  ],
  switchers: [
    {
      id: "checkValidity",
      description: "Checks for inappropriate content in images",
      input: "image[]",
      outputWhenTrue: "image[]",
      outputWhenFalse: "string",
      check: (medium) => {
        if (!isImage(medium.output)) {
          throw new Error("Invalid medium value for censoring step");
        }
        console.log("validity check");
        const isValid = Math.random() < 0.5;
        return [
          isValid,
          isValid
            ? medium.output
            : "Plan once again to avoid inappropriate content",
        ];
      },
    },
  ],
};

const main = async () => {
  const alignment = planAlignment({
    foundry: exampleFoundry,
    instruction: "A fantasy character with a sword and shield",
  });
  const procedure = buildProcedure({
    foundry: exampleFoundry,
    alignment,
  });
  if (isErr(procedure)) {
    throw procedure.content;
  }
  const r = await procedure.content.exec(
    "A fantasy character with a sword and shield",
  );
  console.log(JSON.stringify(r, null, 2));
};

main();
