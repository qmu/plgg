import { Operation } from "autoplgg/index";

export type ProcessorOperation = Readonly<{
  type: "processor";
  initial?: boolean;
  final?: boolean;
  id: string;
  to?: string;
}>;

export const isProcessorOperation = (
  op: Operation,
): op is ProcessorOperation =>
  op.type === "processor";
