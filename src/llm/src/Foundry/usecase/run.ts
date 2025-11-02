import { proc } from "plgg";
import {
  FoundrySpec,
  Order,
  blueprint,
  assemble,
  operate,
} from "autoplgg/index";

export const run = async ({
  foundrySpec,
  order,
}: {
  foundrySpec: FoundrySpec;
  order: Order;
}) =>
  proc(
    order,
    blueprint(foundrySpec),
    assemble(foundrySpec),
    operate,
  );
