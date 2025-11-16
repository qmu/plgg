import {
  Result,
  proc,
  newOk,
  newErr,
  isOk,
  tryCatch,
  isSome,
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
        env: [],
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
          env: [
            ...ctx.env,
            {
              argument,
              value:
                ctx.alignment.userRequest.content,
            },
          ],
          operationCount: ctx.operationCount + 1,
        }),
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

  // Load params from all addresses
  const loadedParams: Param[] = [];
  for (const addr of op.loadAddr) {
    const paramsAtAddr = env.filter(
      (param) =>
        param.argument.name.content === addr,
    );
    if (paramsAtAddr.length === 0) {
      return newErr(
        new Error(
          `No value found at load address "${addr}"`,
        ),
      );
    }
    loadedParams.push(...paramsAtAddr);
  }

  // Match loaded params with switcher's argument types
  const switcherArguments = isSome(
    switcherResult.content.arguments,
  )
    ? switcherResult.content.arguments.content
    : [];

  const params: Param[] =
    switcherArguments.length > 0
      ? loadedParams
          .slice(0, switcherArguments.length)
          .map((param, index) => ({
            argument:
              switcherArguments[index] ||
              param.argument,
            value: param.value,
          }))
      : loadedParams;

  const medium: Medium = { params };

  const checkResult = await proc(
    {
      medium,
      alignment,
    },
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
  const saveAddrs = isValid
    ? op.saveAddrTrue
    : op.saveAddrFalse;
  return isOk(opResult)
    ? proc(
        { name: saveAddrs[0], type: "unknown" },
        asVirtualType,
        (argument) =>
          execute({
            ...ctx,
            env: [...env, { argument, value }],
            operationCount: ctx.operationCount + 1,
          })(opResult.content),
      )
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

  // Load params from all addresses
  const loadedParams: Param[] = [];
  for (const addr of op.loadAddr) {
    const paramsAtAddr = env.filter(
      (param) =>
        param.argument.name.content === addr,
    );
    if (paramsAtAddr.length === 0) {
      return newErr(
        new Error(
          `No value found at load address "${addr}"`,
        ),
      );
    }
    loadedParams.push(...paramsAtAddr);
  }

  // Match loaded params with processor's argument types
  const processorArguments = isSome(
    processorResult.content.arguments,
  )
    ? processorResult.content.arguments.content
    : [];

  const params: Param[] =
    processorArguments.length > 0
      ? loadedParams
          .slice(0, processorArguments.length)
          .map((param, index) => ({
            argument:
              processorArguments[index] ||
              param.argument,
            value: param.value,
          }))
      : loadedParams;

  const medium: Medium = { params };

  const processResult = await proc(
    { medium, alignment },
    tryCatch(processorResult.content.process),
  );

  if (!isOk(processResult)) {
    return newErr(processResult.content);
  }

  const value = await processResult.content;

  return proc(
    { name: op.saveAddr[0], type: "unknown" },
    asVirtualType,
    (argument) =>
      proc(
        alignment,
        op.next === "egress"
          ? findEgressOp
          : findInternalOp(op.next),
        execute({
          ...ctx,
          env: [...env, { argument, value }],
          operationCount: ctx.operationCount + 1,
        }),
      ),
  );
};

const execEgress = async ({
  op,
  ctx,
}: {
  op: EgressOperation;
  ctx: OperationContext;
}): Promise<Result<Medium, Error>> => {
  const { env } = ctx;
  const resultParams: Param[] = [];

  // Resolve each address in the result mapping and collect params
  for (const [key, addr] of Object.entries(
    op.result,
  )) {
    if (typeof addr !== "string") {
      return newErr(
        new Error(
          `Invalid address type for key "${key}": expected string, got ${typeof addr}`,
        ),
      );
    }

    const paramsAtAddr = env.filter(
      (param) =>
        param.argument.name.content === addr,
    );
    if (paramsAtAddr.length === 0) {
      return newErr(
        new Error(
          `No value found at address "${addr}" for result key "${key}"`,
        ),
      );
    }

    // Collect all params from this address, updating the argument name to match the key
    for (const param of paramsAtAddr) {
      const updatedArgResult = asVirtualType({
        name: key,
        type: param.argument.type.content,
        optional: isSome(param.argument.optional)
          ? param.argument.optional.content
          : undefined,
      });
      if (!isOk(updatedArgResult)) {
        return newErr(
          new Error(
            `Failed to create VirtualType for egress key "${key}"`,
          ),
        );
      }
      resultParams.push({
        argument: updatedArgResult.content,
        value: param.value,
      });
    }
  }

  const medium: Medium = {
    params: resultParams,
  };
  return newOk(medium);
};
