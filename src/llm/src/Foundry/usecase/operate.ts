import {
  Medium,
  OperationContext,
  isSwitcherOperation,
  isProcessorOperation,
} from 'autoplgg/index';

export const operate = async ({
  foundry,
  alignment,
  medium,
}: OperationContext): Promise<Medium> => {
  const op = alignment.operations.find(
    (op) => op.id === medium.nextOpId
  );
  if (!op) {
    throw new Error(
      `Operation "${medium.nextOpId}" not found in alignment`
    );
  }

  if (isSwitcherOperation(op)) {
    const switcher = foundry.switchers.find(
      (s) => s.id === op.id
    );
    if (!switcher) {
      throw new Error(
        `No checker found for step type "${op.id}"`
      );
    }
    const startedAt = new Date().toISOString();
    const [isValid, value] =
      switcher.check(medium);
    return operate({
      foundry,
      alignment,
      medium: {
        startedAt,
        endedAt: new Date().toISOString(),
        currentOpId: op.id,
        nextOpId: isValid
          ? op.whenTrue
          : op.whenFalse,
        value: value,
        lastMedium: medium,
      },
    });
  }

  if (isProcessorOperation(op)) {
    const processor = foundry.processors.find(
      (p) => p.id === op.id
    );
    if (!processor) {
      throw new Error(
        `No processor found for step type "${op.id}"`
      );
    }
    const startedAt = new Date().toISOString();
    const value = await processor.process(medium);
    const newMedium = {
      startedAt,
      endedAt: new Date().toISOString(),
      currentOpId: op.id,
      nextOpId: op.to,
      value,
      lastMedium: medium,
    };
    return op.final
      ? newMedium
      : operate({
          foundry,
          alignment,
          medium: newMedium,
        });
  }

  throw new Error(
    `Unknown operation type for operation`
  );
};
