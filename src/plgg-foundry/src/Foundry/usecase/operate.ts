import {
  Result,
  PromisedResult,
  proc,
  pipe,
  ok,
  err,
  isOk,
  tryCatch,
  conclude,
  isObj,
  filter,
} from "plgg";
import {
  Foundry,
  Alignment,
  Order,
  Medium,
  Param,
  Ingress,
  Assign,
  Switch,
  Process,
  Egress,
  Operation,
  OperationContext,
  Env,
  Address,
  isAssign,
  isSwitch,
  isProcess,
  isEgress,
  findOperations,
  findEgress,
  findSwitcher,
  findProcessor,
  findIngress,
  asVirtualType,
  isPacker,
} from "plgg-foundry/index";

/**
 * Executes an alignment by processing operations sequentially starting from ingress.
 */
export const operate =
  (foundry: Foundry) =>
  (order: Order) =>
  (
    alignment: Alignment,
  ): PromisedResult<Medium, Error> =>
    proc(
      alignment,
      findIngress,
      execIngress({
        foundry,
        alignment,
        order,
        env: {},
        operationCount: 0,
      }),
    );

/**
 * Dispatches operation execution based on type with operation limit check.
 */
const execute =
  (ctx: OperationContext) =>
  async (
    op: Operation | Egress,
  ): PromisedResult<Medium, Error> => {
    if (
      ctx.operationCount >=
      ctx.foundry.maxOperationLimit
    ) {
      return err(
        new Error("Operation limit exceeded"),
      );
    }

    if (isAssign(op)) {
      return execAssign({ op, ctx });
    }
    if (isSwitch(op)) {
      return execSwitch({ op, ctx });
    }
    if (isProcess(op)) {
      return execProcess({ op, ctx });
    }
    if (isEgress(op)) {
      return execEgress({ op, ctx });
    }
    return err(
      new Error(`Unknown operation type`),
    );
  };

/**
 * Executes ingress operation by proceeding to next operation.
 */
const execIngress =
  (ctx: OperationContext) =>
  (op: Ingress): PromisedResult<Medium, Error> =>
    proc(
      ctx.alignment,
      findOperations(op.next),
      execute({
        ...ctx,
        operationCount: ctx.operationCount + 1,
      }),
    );

/**
 * Executes assign operation by binding a value to a register address.
 */
const execAssign = ({
  op,
  ctx,
}: {
  op: Assign;
  ctx: OperationContext;
}): PromisedResult<Medium, Error> =>
  proc(
    { name: op.address, type: "string" },
    asVirtualType,
    (virtualType) => {
      const nextCtx = {
        ...ctx,
        env: {
          ...ctx.env,
          [op.address]: {
            type: virtualType,
            value: op.value,
          },
        },
        operationCount: ctx.operationCount + 1,
      };

      if (op.next === "egress") {
        return proc(
          ctx.alignment,
          findEgress,
          execute(nextCtx),
        );
      }

      return proc(
        ctx.alignment,
        findOperations(op.next),
        execute(nextCtx),
      );
    },
  );

/**
 * Loads a param from environment by address.
 */
const loadValueFromEnv =
  (env: Env) =>
  (
    addr: string,
  ): Result<[Address, Param], Error> =>
    env[addr]
      ? ok([addr, env[addr]])
      : err(
          new Error(
            `No value found at load address "${addr}"`,
          ),
        );

/**
 * Executes switch operation by evaluating condition and branching accordingly.
 */
const execSwitch = async ({
  op,
  ctx,
}: {
  op: Switch;
  ctx: OperationContext;
}): PromisedResult<Medium, Error> => {
  const { foundry, alignment, env } = ctx;

  // Step 1: Find the switcher function by opcode
  const switcherResult = findSwitcher(
    foundry,
    op.action,
  );
  if (!isOk(switcherResult)) {
    return err(switcherResult.content);
  }
  const switcher = switcherResult.content;

  // Step 2: Load input parameters from registers using input NameTableEntry array
  const addrParams = pipe(
    op.input.map((entry) => entry.address),
    conclude(loadValueFromEnv(env)),
  );
  if (!isOk(addrParams)) {
    return err(
      new Error(
        addrParams.content
          .map((e) => e.message)
          .join("; "),
      ),
    );
  }
  const params: Record<Address, Param> =
    Object.fromEntries(addrParams.content);

  // Step 3: Execute the switcher check function
  const checkResult = await proc(
    {
      alignment,
      params,
    } satisfies Medium,
    tryCatch(switcher.content.fn),
  );

  if (!isOk(checkResult)) {
    return err(checkResult.content);
  }

  const [isValid, returnedValue] =
    await checkResult.content;

  // Step 4: Determine next operation based on condition result
  const opResult = findOperations(
    isValid ? op.nextWhenTrue : op.nextWhenFalse,
  )(alignment);

  // Step 5: Store returned values in registers using appropriate output NameTableEntry array
  const outputs = isValid
    ? op.outputWhenTrue
    : op.outputWhenFalse;

  const returnTypes = isValid
    ? switcher.content.returnsWhenTrue
    : switcher.content.returnsWhenFalse;

  const newEnvEntries: Record<Address, Param> =
    {};
  if (isObj(returnedValue)) {
    // Map each variable name to its register address
    for (const entry of outputs) {
      const { variableName, address } = entry;
      const virtualType =
        returnTypes[variableName];
      const varValue =
        returnedValue[variableName];
      if (
        virtualType &&
        variableName in returnedValue &&
        varValue !== undefined
      ) {
        newEnvEntries[address] = {
          type: virtualType,
          value: varValue,
        };
      }
    }
  }

  // Step 6: Continue execution with updated environment
  return isOk(opResult)
    ? execute({
        ...ctx,
        env: {
          ...env,
          ...newEnvEntries,
        },
        operationCount: ctx.operationCount + 1,
      })(opResult.content)
    : err(opResult.content);
};

/**
 * Executes process operation by calling processor function and storing results in registers.
 */
const execProcess = async ({
  op,
  ctx,
}: {
  op: Process;
  ctx: OperationContext;
}): PromisedResult<Medium, Error> => {
  const { foundry, alignment, env } = ctx;

  // Step 1: Find the processor function by opcode
  const processorResult = findProcessor(
    foundry,
    op.action,
  );
  if (!isOk(processorResult)) {
    return err(processorResult.content);
  }

  // Step 2: Load input parameters from registers using input NameTableEntry array
  // Map from address to variable name so processors can access by variable name
  const addrParams = pipe(
    op.input.map((entry) => entry.address),
    conclude(loadValueFromEnv(env)),
  );
  if (!isOk(addrParams)) {
    return err(
      new Error(
        addrParams.content
          .map((e) => e.message)
          .join("; "),
      ),
    );
  }
  // Build params keyed by variable name (not address) for processor fn
  const addressToVarName = Object.fromEntries(
    op.input.map((entry) => [
      entry.address,
      entry.variableName,
    ]),
  );
  const params: Record<string, Param> =
    Object.fromEntries(
      addrParams.content.map(([addr, param]) => [
        addressToVarName[addr],
        param,
      ]),
    );

  // Step 3: Execute the processor function
  const processResult = await proc(
    { alignment, params } satisfies Medium,
    tryCatch(processorResult.content.content.fn),
  );

  if (!isOk(processResult)) {
    return err(processResult.content);
  }

  const returnedValue =
    await processResult.content;

  // Step 4: Store returned values in registers using output NameTableEntry array
  const returnTypes =
    processorResult.content.content.returns;

  const newEnvEntries: Record<Address, Param> =
    {};
  if (isObj(returnedValue)) {
    // Map each variable name to its register address
    for (const entry of op.output) {
      const { variableName, address } = entry;
      const virtualType =
        returnTypes[variableName];
      const varValue =
        returnedValue[variableName];
      if (
        virtualType &&
        variableName in returnedValue &&
        varValue !== undefined
      ) {
        newEnvEntries[address] = {
          type: virtualType,
          value: varValue,
        };
      }
    }
  }

  // Step 5: Continue to next operation (either egress or another internal op)
  const nextCtx = {
    ...ctx,
    env: {
      ...env,
      ...newEnvEntries,
    },
    operationCount: ctx.operationCount + 1,
  };

  if (op.next === "egress") {
    return proc(
      alignment,
      findEgress,
      execute(nextCtx),
    );
  }

  return proc(
    alignment,
    findOperations(op.next),
    execute(nextCtx),
  );
};

/**
 * Executes egress operation by collecting final output from registers.
 */
const execEgress = async ({
  op,
  ctx,
}: {
  op: Egress;
  ctx: OperationContext;
}): PromisedResult<Medium, Error> => {
  const { env, alignment, foundry } = ctx;

  // Step 1: Load output values from registers specified in result mapping
  const input = pipe(
    op.result,
    Object.values,
    conclude(loadValueFromEnv(env)),
  );
  if (!isOk(input)) {
    return err(
      new Error(
        input.content
          .map((e) => e.message)
          .join("; "),
      ),
    );
  }

  const params: Record<Address, Param> =
    Object.fromEntries(input.content);

  // Step 2: Validate outputs against packer specifications
  const packers = pipe(
    foundry.apparatuses,
    filter(isPacker),
  );

  for (const packer of packers) {
    for (const [
      outputName,
      expectedType,
    ] of Object.entries(packer.content)) {
      // Check if this output name exists in the egress result mapping
      const variableAddr = op.result[outputName];
      if (
        variableAddr !== undefined &&
        typeof variableAddr === "string"
      ) {
        // Find the param at this address
        const param = params[variableAddr];
        if (param) {
          // Validate that the param type matches the expected type
          const actualType = param.type;
          const actualTypeStr =
            actualType.type?.content ?? "";
          const expectedTypeStr =
            expectedType.type?.content ?? "";

          if (actualTypeStr !== expectedTypeStr) {
            return err(
              new Error(
                `Type mismatch for output "${outputName}": expected ${expectedTypeStr}, got ${actualTypeStr}`,
              ),
            );
          }
        }
      }
    }
  }

  // Step 3: Construct final medium with alignment and collected params
  const medium: Medium = {
    alignment,
    params,
  };
  return ok(medium);
};
