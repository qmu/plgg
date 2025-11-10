import {
  Result,
  proc,
  newOk,
  newErr,
  isOk,
  tryCatch,
} from "plgg";
import {
  Foundry,
  Alignment,
  Medium,
  IngressOperation,
  SwitchOperation,
  ProcessOperation,
  EgressOperation,
  Operation,
  OperationContext,
  Env,
  isIngressOperation,
  isEgressOperation,
  isSwitchOperation,
  isProcessOperation,
  findInternalOp,
  findEgressOp,
  findSwitcher,
  findProcessor,
  findIngressOp,
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
    ctx.alignment,
    findInternalOp(op.next),
    execute({
      ...ctx,
      env: {
        [op.promptAddr]: {
          value:
            ctx.alignment.userRequest.content,
        },
      },
      operationCount: ctx.operationCount + 1,
    }),
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

  const medium = env[op.loadAddr];
  if (!medium) {
    return newErr(
      new Error(
        `No value found at load address "${op.loadAddr}"`,
      ),
    );
  }

  const checkResult = tryCatch(
    (args: {
      medium: Medium;
      alignment: Alignment;
    }) => switcherResult.content.check(args),
  )({ medium, alignment });

  if (!isOk(checkResult)) {
    return newErr(checkResult.content);
  }

  const [isValid, value] = checkResult.content;

  const opResult = findInternalOp(
    isValid ? op.nextWhenTrue : op.nextWhenFalse,
  )(alignment);
  const newEnv: Env = {
    ...env,
    [isValid
      ? op.saveAddrTrue
      : op.saveAddrFalse]: { value },
  };
  return isOk(opResult)
    ? execute({
        ...ctx,
        env: newEnv,
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

  const medium = env[op.loadAddr];
  if (!medium) {
    return newErr(
      new Error(
        `No value found at load address "${op.loadAddr}"`,
      ),
    );
  }

  const processResult = await tryCatch(
    (args: { medium: Medium; alignment: Alignment }) =>
      processorResult.content.process(args),
  )({ medium, alignment });

  if (!isOk(processResult)) {
    return newErr(processResult.content);
  }

  const value = processResult.content;

  const newEnv = {
    ...env,
    [op.saveAddr]: { value },
  };

  if (op.next === "egress") {
    const egressOpResult =
      findEgressOp(alignment);
    return isOk(egressOpResult)
      ? execute({
          ...ctx,
          env: newEnv,
          operationCount: ctx.operationCount + 1,
        })(egressOpResult.content)
      : newErr(egressOpResult.content);
  }

  const nextOpResult = findInternalOp(op.next)(
    alignment,
  );
  return isOk(nextOpResult)
    ? execute({
        ...ctx,
        env: newEnv,
        operationCount: ctx.operationCount + 1,
      })(nextOpResult.content)
    : newErr(nextOpResult.content);
};

const execEgress = async ({
  op,
  ctx,
}: {
  op: EgressOperation;
  ctx: OperationContext;
}): Promise<Result<Medium, Error>> => {
  const { env } = ctx;
  const resultObj: Record<string, unknown> = {};

  // Resolve each address in the result mapping
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

    const medium = env[addr];
    if (!medium) {
      return newErr(
        new Error(
          `No value found at address "${addr}" for result key "${key}"`,
        ),
      );
    }

    resultObj[key] = medium.value;
  }

  const medium: Medium = {
    value: resultObj,
  };
  return newOk(medium);
};
