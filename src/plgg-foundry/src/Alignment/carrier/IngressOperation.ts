import { isRawObj, hasProp } from "plgg";

export type IngressOperation = Readonly<{
  type: "ingress";
  next: string;
  promptAddr: string;
  file1Addr?: string;
  file2Addr?: string;
  file3Addr?: string;
  file4Addr?: string;
  file5Addr?: string;
}>;

export const isIngressOperation = (
  op: unknown,
): op is IngressOperation =>
  isRawObj<object>(op) &&
  hasProp(op, "type") &&
  op.type === "ingress";
