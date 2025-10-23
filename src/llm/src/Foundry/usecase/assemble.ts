import { Result, newOk } from "plgg";
import {
  Medium,
  Foundry,
  Alignment,
  isSwitcherOperation,
  isProcessorOperation,
} from "autoplgg/index";

type Procedure = (initialValue: unknown) => Promise<Medium>;

export const assemble = ({
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

  if (isSwitcherOperation(op)) {
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

  if (isProcessorOperation(op)) {
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
