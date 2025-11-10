import {
  Foundry,
  Alignment,
  Medium,
} from "plgg-foundry/index";

export type Env = Record<string, Medium>;

export type OperationContext = {
  foundry: Foundry;
  alignment: Alignment;
  env: Env; // Register Machine Environment Variables
  operationCount: number;
};
