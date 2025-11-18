import { proc } from "plgg";
import {
  FoundrySpec,
  OrderSpec,
  asFoundry,
  asOrder,
} from "plgg-foundry/index";
import {
  blueprint,
  operate,
} from "plgg-foundry/Foundry/usecase";

/**
 * Main entry point that orchestrates the complete workflow:
 * 1. Validates foundry specification
 * 2. Validates order specification
 * 3. Generates alignment from order using AI (blueprint)
 * 4. Executes alignment operations sequentially (operate)
 *
 * Returns final medium containing alignment and output parameters.
 */
export const run = async ({
  foundrySpec,
  orderSpec,
}: {
  foundrySpec: FoundrySpec;
  orderSpec: OrderSpec;
}) =>
  await proc(foundrySpec, asFoundry, (foundry) =>
    proc(
      orderSpec,
      asOrder,
      blueprint(foundry),
      operate(foundry),
    ),
  );
