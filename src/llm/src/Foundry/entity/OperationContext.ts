import {
  FoundrySpec,
  Alignment,
  Medium,
  Operation,
} from "autoplgg/index";

export type OperationContext = {
  foundry: FoundrySpec;
  alignment: Alignment;
  medium: Medium;
  operation: Operation;
  env: Record<string, unknown>; // Register Machine Environment Variables
};
