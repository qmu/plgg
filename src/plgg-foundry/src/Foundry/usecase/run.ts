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
