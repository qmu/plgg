import {
  Foundry,
  Alignment,
  Env,
} from "plgg-foundry/index";

/**
 * Execution context passed through operation chain during alignment execution.
 */
export type OperationContext = {
  foundry: Foundry;
  alignment: Alignment;
  env: Env;
  operationCount: number;
};
