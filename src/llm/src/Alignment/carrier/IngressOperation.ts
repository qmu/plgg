import { Operation } from "autoplgg/index";

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
  op: Operation,
): op is IngressOperation =>
  op.type === "ingress";
