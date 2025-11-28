import {
  Foundry,
  Alignment,
  Order,
  Env,
} from "plgg-foundry/index";

/**
 * Execution context passed through operation chain during alignment execution.
 */
export type OperationContext = {
  foundry: Foundry;
  alignment: Alignment;
  order: Order;
  env: Env;
  operationCount: number;
};
