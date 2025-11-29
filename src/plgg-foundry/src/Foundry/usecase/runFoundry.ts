import { proc, debug } from "plgg";
import {
  FoundrySpec,
  OrderSpec,
  asFoundry,
  asOrder,
  isFoundrySpec,
} from "plgg-foundry/index";
import { Provider, openai } from "plgg-kit";
import {
  blueprint,
  operate,
} from "plgg-foundry/Foundry/usecase";

type RunFoundryReturn = ReturnType<typeof runFoundryImpl>;

/**
 * Main entry point that orchestrates the complete workflow:
 * 1. Validates foundry specification
 * 2. Validates order specification
 * 3. Generates alignment from order using AI (blueprint)
 * 4. Executes alignment operations sequentially (operate)
 *
 * Returns final medium containing alignment and output parameters.
 */
export function runFoundry(spec: FoundrySpec): RunFoundryReturn;
export function runFoundry(config: {
  spec: FoundrySpec;
  provider?: Provider;
}): RunFoundryReturn;
export function runFoundry(
  arg: FoundrySpec | { spec: FoundrySpec; provider?: Provider },
): RunFoundryReturn {
  if (isFoundrySpec(arg)) {
    return runFoundryImpl({ spec: arg });
  }
  return runFoundryImpl(arg);
}

const runFoundryImpl = ({
  spec,
  provider = openai("gpt-5.1"),
}: {
  spec: FoundrySpec;
  provider?: Provider;
}) =>
  async (orderSpec: OrderSpec) =>
    proc(
      { provider, spec },
      asFoundry,
      (foundry) =>
        proc(orderSpec, asOrder, (order) =>
          proc(
            order,
            blueprint(foundry),
            debug,
            operate(foundry)(order),
          ),
        ),
    );
