import { Result, newOk } from "plgg";
import { Medium, Foundry, Alignment, OperationContext } from "autoplgg/index";

export const assemble =
  (foundry: Foundry) =>
  (alignment: Alignment): Result<OperationContext, Error> => {
    const iniOp = alignment.operations.find(
      (op) => "initial" in op && op.initial,
    );
    if (!iniOp) {
      throw new Error("No initial operation found in alignment");
    }
    const medium: Medium = {
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      output: alignment.instruction,
      currentOpId: undefined,
      nextOpId: iniOp.id,
      lastMedium: undefined,
    };
    return newOk({
      foundry,
      alignment,
      medium,
    });
  };
