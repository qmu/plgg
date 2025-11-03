import { proc } from "plgg";
import {
  FoundrySpec,
  OrderSpec,
  blueprint,
  assemble,
  operate,
  asFoundry,
  asOrder,
} from "plgg-foundry/index";

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
      assemble(foundry),
      operate,
    ),
  );
