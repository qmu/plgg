import {
  FoundrySpec,
  Alignment,
  Medium,
} from "autoplgg/index";

export type Env = Record<string, Medium>;

export type OperationContext = {
  foundry: FoundrySpec;
  alignment: Alignment;
  env: Env; // Register Machine Environment Variables
};
