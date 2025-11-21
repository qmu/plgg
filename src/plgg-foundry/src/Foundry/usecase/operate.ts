import {
  Result,
  PromisedResult,
  proc,
  pipe,
  newOk,
  newErr,
  isOk,
  tryCatch,
  conclude,
  isObj,
  filter,
} from "plgg";
import {
  Foundry,
  Alignment,
  Medium,
  Param,
  IngressOperation,
  SwitchOperation,
  ProcessOperation,
  EgressOperation,
  Operation,
  OperationContext,
  Env,
  Address,
  isIngressOperation,
  isEgressOperation,
  isSwitchOperation,
  isProcessOperation,
  findInternalOp,
  findEgressOp,
  findSwitcher,
  findProcessor,
  findIngressOp,
  asVirtualType,
  isPacker,
} from "plgg-foundry/index";

/**
 * Executes an alignment by processing operations sequentially starting from ingress.
 */
export const operate =
  (foundry: Foundry) =>
  (
    alignment: Alignment,
  ): PromisedResult<Medium, Error> =>
    proc(
      alignment,
      findIngressOp,
      execute({
        foundry,
        alignment,
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
    op: Operation,
  ): PromisedResult<Medium, Error> => {
    if (
      ctx.operationCount >=
      ctx.foundry.maxOperationLimit
    ) {
      return newErr(
        new Error("Operation limit exceeded"),
      );
    }

    if (isIngressOperation(op)) {
      return execIngress({ op, ctx });
    }
    if (isSwitchOperation(op)) {
      return execSwitch({ op, ctx });
    }
    if (isProcessOperation(op)) {
      return execProcess({ op, ctx });
    }
    if (isEgressOperation(op)) {
      return execEgress({ op, ctx });
    }
    return newErr(
      new Error(
        `Unknown operation type for operation`,
      ),
    );
  };

/**
 * Executes ingress operation by storing user request in register and proceeding to next operation.
 */
const execIngress = async ({
  op,
  ctx,
}: {
  op: IngressOperation;
  ctx: OperationContext;
}): PromisedResult<Medium, Error> =>
  proc(
    {
      name: op.promptAddr,
      type: "string",
    },
    asVirtualType,
    (argument) =>
      proc(
        ctx.alignment,
        findInternalOp(op.next),
        execute({
          ...ctx,
          env: {
            ...ctx.env,
            [op.promptAddr]: {
              type: argument,
              value:
                ctx.alignment.userRequest.content,
            },
          },
          operationCount: ctx.operationCount + 1,
        }),
      ),
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
      ? newOk([addr, env[addr]])
      : newErr(
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
  op: SwitchOperation;
  ctx: OperationContext;
}): PromisedResult<Medium, Error> => {
  const { foundry, alignment, env } = ctx;

  // Step 1: Find the switcher function by opcode
  const switcherResult = findSwitcher(
    foundry,
    op.opcode,
  );
  if (!isOk(switcherResult)) {
    return newErr(switcherResult.content);
  }
  const switcher = switcherResult.content;

  // Step 2: Load input parameters from registers using input NameTable
  const addrParams = pipe(
    op.input,
    Object.values,
    conclude(loadValueFromEnv(env)),
  );
  if (!isOk(addrParams)) {
    return newErr(
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
    tryCatch(switcher.check),
  );

  if (!isOk(checkResult)) {
    return newErr(checkResult.content);
  }

  const [isValid, returnedValue] =
    await checkResult.content;

  // Step 4: Determine next operation based on condition result
  const opResult = findInternalOp(
    isValid ? op.nextWhenTrue : op.nextWhenFalse,
  )(alignment);

  // Step 5: Store returned values in registers using appropriate output NameTable
  const outputs = isValid
    ? op.outputWhenTrue
    : op.outputWhenFalse;

  const returnTypes = isValid
    ? switcher.returnsWhenTrue
    : switcher.returnsWhenFalse;

  const newEnvEntries: Record<Address, Param> =
    {};
  if (isObj(returnedValue)) {
    // Map each variable name to its register address
    for (const [varName, addr] of Object.entries(
      outputs,
    )) {
      const virtualType = returnTypes[varName];
      const varValue = returnedValue[varName];
      if (
        virtualType &&
        varName in returnedValue &&
        varValue !== undefined
      ) {
        newEnvEntries[addr] = {
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
    : newErr(opResult.content);
};

/**
 * Executes process operation by calling processor function and storing results in registers.
 */
const execProcess = async ({
  op,
  ctx,
}: {
  op: ProcessOperation;
  ctx: OperationContext;
}): PromisedResult<Medium, Error> => {
  const { foundry, alignment, env } = ctx;

  // Step 1: Find the processor function by opcode
  const processorResult = findProcessor(
    foundry,
    op.opcode,
  );
  if (!isOk(processorResult)) {
    return newErr(processorResult.content);
  }

  // Step 2: Load input parameters from registers using input NameTable
  const addrParams = pipe(
    op.input,
    Object.values,
    conclude(loadValueFromEnv(env)),
  );
  if (!isOk(addrParams)) {
    return newErr(
      new Error(
        addrParams.content
          .map((e) => e.message)
          .join("; "),
      ),
    );
  }
  const params: Record<Address, Param> =
    Object.fromEntries(addrParams.content);

  // Step 3: Execute the processor function
  const processResult = await proc(
    { alignment, params } satisfies Medium,
    tryCatch(processorResult.content.process),
  );

  if (!isOk(processResult)) {
    return newErr(processResult.content);
  }

  const returnedValue =
    await processResult.content;

  // Step 4: Store returned values in registers using output NameTable
  const returnTypes =
    processorResult.content.returns;

  const newEnvEntries: Record<Address, Param> =
    {};
  if (isObj(returnedValue)) {
    // Map each variable name to its register address
    for (const [varName, addr] of Object.entries(
      op.output,
    )) {
      const virtualType = returnTypes[varName];
      const varValue = returnedValue[varName];
      if (
        virtualType &&
        varName in returnedValue &&
        varValue !== undefined
      ) {
        newEnvEntries[addr] = {
          type: virtualType,
          value: varValue,
        };
      }
    }
  }

  // Step 5: Continue to next operation (either egress or another internal op)
  return proc(
    alignment,
    op.next === "egress"
      ? findEgressOp
      : findInternalOp(op.next),
    execute({
      ...ctx,
      env: {
        ...env,
        ...newEnvEntries,
      },
      operationCount: ctx.operationCount + 1,
    }),
  );
};

/**
 * Executes egress operation by collecting final output from registers.
 */
const execEgress = async ({
  op,
  ctx,
}: {
  op: EgressOperation;
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
    return newErr(
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
    ] of Object.entries(packer)) {
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
            return newErr(
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
  return newOk(medium);
};
