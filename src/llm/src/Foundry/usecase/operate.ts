import { Result, newOk, newErr } from "plgg";
import {
  Medium,
  OperationContext,
  isSwitcherOperation,
  isProcessorOperation,
} from "autoplgg/index";

export const operate = async ({
  foundry,
  alignment,
  medium,
  opcode,
  env,
}: OperationContext): Promise<
  Result<Medium, Error>
> => {
  const op = alignment.operations.find(
    (op) => op.opcode === opcode,
  );
  if (!op) {
    return newErr(
      new Error(
        `Operation "${opcode}" not found in alignment`,
      ),
    );
  }

  if (isSwitcherOperation(op)) {
    const switcher = foundry.switchers.find(
      (s) => s.id.content === op.opcode,
    );
    if (!switcher) {
      return newErr(
        new Error(
          `No checker found for step type "${op.opcode}"`,
        ),
      );
    }
    const startedAt = new Date().toISOString();
    const [isValid, value] =
      switcher.check(medium);
    return operate({
      foundry,
      alignment,
      opcode: isValid
        ? op.whenTrue
        : op.whenFalse,
      medium: {
        ...medium,
        startedAt,
        endedAt: new Date().toISOString(),
        value: value,
        lastMedium: medium,
      },
      env,
    });
  }

  if (isProcessorOperation(op)) {
    const processor = foundry.processors.find(
      (p) => p.id.content === op.opcode,
    );
    if (!processor) {
      return newErr(
        new Error(
          `No processor found for step type "${op.opcode}"`,
        ),
      );
    }
    const startedAt = new Date().toISOString();
    const value = await processor.process(medium);
    const newMedium = {
      startedAt,
      endedAt: new Date().toISOString(),
      value,
      lastMedium: medium,
    };
    return op.final
      ? newOk(newMedium)
      : op.next
        ? operate({
            foundry,
            alignment,
            medium: newMedium,
            opcode: op.next,
            env,
          })
        : newErr(new Error());
  }
  return newErr(
    new Error(
      `Unknown operation type for operation`,
    ),
  );
};
