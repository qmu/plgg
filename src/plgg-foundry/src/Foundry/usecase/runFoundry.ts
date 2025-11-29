import { proc, tap } from "plgg";
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
 *
 * Accepts either a string (text only) or OrderSpec object.
 */
export const runFoundry =
  (foundry: Foundry) =>
  (input: string | OrderSpec) => {
    const orderSpec: OrderSpec =
      typeof input === "string"
        ? { text: input }
        : input;
    return proc(orderSpec, asOrder, (order) =>
      proc(
        order,
        blueprint(foundry),
        tap((v) =>
          console.log(JSON.stringify(v, null, 2)),
        ),
        operate(foundry)(order),
      ),
    );
  };
