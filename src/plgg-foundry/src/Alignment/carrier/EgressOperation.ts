import { Operation } from "plgg-foundry/index";

export type EgressOperation = Readonly<{
  type: "egress";
  result: Record<string, unknown>;
}>;

export const isEgressOperation = (
  op: Operation,
): op is EgressOperation => op.type === "egress";
