import { Result, newOk, isErr } from "plgg";
import {
  FoundrySpec,
  Alignment,
  OperationContext,
  Operation,
  findIngressOp,
  findInternalOp,
} from "autoplgg/index";

export const assemble =
  (foundry: FoundrySpec) =>
  (
    alignment: Alignment,
  ): Result<
    { op: Operation; ctx: OperationContext },
    Error
  > => {
    const ingressOp = findIngressOp(alignment);
    if (isErr(ingressOp)) {
      return ingressOp;
    }
    const newEnv = {
      [ingressOp.content.promptAddr]: {
        value: alignment.instruction,
      },
    };
    const nextOp = findInternalOp(
      alignment,
      ingressOp.content.next,
    );
    if (isErr(nextOp)) {
      return nextOp;
    }
    return newOk({
      op: nextOp.content,
      ctx: {
        foundry,
        alignment,
        env: newEnv,
      },
    });
  };
