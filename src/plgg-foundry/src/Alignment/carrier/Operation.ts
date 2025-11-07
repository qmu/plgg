import {
  EgressOperation,
  IngressOperation,
  InternalOperation,
  isInternalOperation,
  isIngressOperation,
  isEgressOperation,
} from "plgg-foundry/index";

export type Operation =
  | EgressOperation
  | IngressOperation
  | InternalOperation;

export const isOperation = (
  op: unknown,
): op is Operation =>
  isIngressOperation(op) ||
  isEgressOperation(op) ||
  isInternalOperation(op);
