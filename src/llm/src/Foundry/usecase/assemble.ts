import { Result, newOk, isErr } from "plgg";
import {
  Medium,
  FoundrySpec,
  Alignment,
  OperationContext,
  findIngressOp,
  findInternalOp,
} from "autoplgg/index";

export const assemble =
  (foundry: FoundrySpec) =>
  (
    alignment: Alignment,
  ): Result<OperationContext, Error> => {
    const ingressOp = findIngressOp(alignment);
    if (isErr(ingressOp)) {
      return ingressOp;
    }
    const medium: Medium = {
      value: alignment.instruction,
    };
    const nextOp = findInternalOp(
      alignment,
      ingressOp.content.next,
    );
    if (isErr(nextOp)) {
      return nextOp;
    }
    return newOk({
      foundry,
      alignment,
      medium,
      operation: nextOp.content,
      env: {},
    });
  };
