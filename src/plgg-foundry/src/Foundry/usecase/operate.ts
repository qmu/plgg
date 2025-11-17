import {
  Result,
  Dict,
  proc,
  pipe,
  newOk,
  newErr,
  isOk,
  tryCatch,
  isSome,
  conclude,
  isObj,
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
  VariableName,
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
} from "plgg-foundry/index";

export const operate =
  (foundry: Foundry) =>
  (
    alignment: Alignment,
  ): Promise<Result<Medium, Error>> =>
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

const execute =
  (ctx: OperationContext) =>
  async (
    op: Operation,
  ): Promise<Result<Medium, Error>> => {
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

const execIngress = async ({
  op,
  ctx,
}: {
  op: IngressOperation;
  ctx: OperationContext;
}): Promise<Result<Medium, Error>> =>
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

const execSwitch = async ({
  op,
  ctx,
}: {
  op: SwitchOperation;
  ctx: OperationContext;
}): Promise<Result<Medium, Error>> => {
  const { foundry, alignment, env } = ctx;
  const switcherResult = findSwitcher(
    foundry,
    op.opcode,
  );
  if (!isOk(switcherResult)) {
    return newErr(switcherResult.content);
  }

  const input = pipe(
    op.inputAddresses,
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

  const params: Dict<Address, Param> =
    Object.fromEntries(input.content);

  const checkResult = await proc(
    {
      alignment,
      params,
    } satisfies Medium,
    tryCatch(switcherResult.content.check),
  );

  if (!isOk(checkResult)) {
    return newErr(checkResult.content);
  }

  const [isValid, value] =
    await checkResult.content;

  const opResult = findInternalOp(
    isValid ? op.nextWhenTrue : op.nextWhenFalse,
  )(alignment);

  // Save values to all addresses with return types
  const outputs: Record<VariableName, Address> =
    isValid
      ? op.outputAddressesTrue
      : op.outputAddressesFalse;

  // Get the return types from the switcher
  const switcher = switcherResult.content;
  const returnTypes = isValid
    ? switcher.returnsWhenTrue
    : switcher.returnsWhenFalse;

  // Create env entries for each output
  const newEnvEntries: Record<Address, Param> =
    {};
  if (isSome(returnTypes) && isObj(value)) {
    for (const [varName, addr] of Object.entries(
      outputs,
    )) {
      const virtualType =
        returnTypes.content[varName];
      const varValue = value[varName];
      if (
        virtualType &&
        varName in value &&
        varValue !== undefined
      ) {
        newEnvEntries[addr] = {
          type: virtualType,
          value: varValue,
        };
      }
    }
  }

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

const execProcess = async ({
  op,
  ctx,
}: {
  op: ProcessOperation;
  ctx: OperationContext;
}): Promise<Result<Medium, Error>> => {
  const { foundry, alignment, env } = ctx;
  const processorResult = findProcessor(
    foundry,
    op.opcode,
  );
  if (!isOk(processorResult)) {
    return newErr(processorResult.content);
  }

  // Load params from addresses - op.loadAddr is Dict<VariableName, Address>
  const input = pipe(
    op.loadAddr,
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

  const params: Dict<Address, Param> =
    Object.fromEntries(input.content);

  const processResult = await proc(
    { alignment, params } satisfies Medium,
    tryCatch(processorResult.content.process),
  );

  if (!isOk(processResult)) {
    return newErr(processResult.content);
  }

  const value = await processResult.content;

  // Get processor return types
  const processor = processorResult.content;
  const returnTypes = processor.returns;

  // Save values to addresses - op.saveAddr is Dict<VariableName, Address>
  const newEnvEntries: Record<Address, Param> =
    {};
  if (isSome(returnTypes) && isObj(value)) {
    for (const [varName, addr] of Object.entries(
      op.saveAddr,
    )) {
      const virtualType =
        returnTypes.content[varName];
      const varValue = value[varName];
      if (
        virtualType &&
        varName in value &&
        varValue !== undefined
      ) {
        newEnvEntries[addr] = {
          type: virtualType,
          value: varValue,
        };
      }
    }
  }

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

const execEgress = async ({
  op,
  ctx,
}: {
  op: EgressOperation;
  ctx: OperationContext;
}): Promise<Result<Medium, Error>> => {
  const { env, alignment } = ctx;

  // Resolve each address in the result mapping and collect params
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

  const params: Dict<Address, Param> =
    Object.fromEntries(input.content);

  const medium: Medium = {
    alignment,
    params,
  };
  return newOk(medium);
};
