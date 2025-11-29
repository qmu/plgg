import { proc, debug } from "plgg";
import {
  Foundry,
  OrderSpec,
  asOrder,
} from "plgg-foundry/index";
import {
  blueprint,
  operate,
} from "plgg-foundry/Foundry/usecase";

/**
 * Main entry point that orchestrates the complete workflow:
 * 1. Validates order specification
 * 2. Generates alignment from order using AI (blueprint)
 * 3. Executes alignment operations sequentially (operate)
 *
 * Returns final medium containing alignment and output parameters.
 */
export const runFoundry = (foundry: Foundry) =>
  async (orderSpec: OrderSpec) =>
    proc(orderSpec, asOrder, (order) =>
      proc(
        order,
        blueprint(foundry),
        debug,
        operate(foundry)(order),
      ),
    );
