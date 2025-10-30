import {
  Result,
  newOk,
  newErr,
  isOk,
} from "plgg";
import {
  Medium,
  OperationContext,
  IngressOperation,
  SwitchOperation,
  ProcessOperation,
  EgressOperation,
  Env,
  Operation,
  isIngressOperation,
  isEgressOperation,
  isSwitchOperation,
  isProcessOperation,
  findInternalOp,
  findEgressOp,
  findSwitcher,
  findProcessor,
} from "autoplgg/index";

export const operate = async ({
  op,
  ctx,
}: {
  op: Operation;
  ctx: OperationContext;
}): Promise<Result<Medium, Error>> => {
  if (isIngressOperation(op)) {
    return operateIngress({ op, ctx });
  }
  if (isSwitchOperation(op)) {
    return operateSwitch({ op, ctx });
  }
  if (isProcessOperation(op)) {
    return operateProcess({ op, ctx });
  }
  if (isEgressOperation(op)) {
    return operateEgress({ op, ctx });
  }
  return newErr(
    new Error(
      `Unknown operation type for operation`,
    ),
  );
};

const operateIngress = async ({
  op,
  ctx,
}: {
  op: IngressOperation;
  ctx: OperationContext;
}): Promise<Result<Medium, Error>> => {
  const { alignment, env } = ctx;
  const opResult = findInternalOp(
    alignment,
    op.next,
  );
  return isOk(opResult)
    ? operate({
        op: opResult.content,
        ctx: {
          ...ctx,
          env,
        },
      })
    : newErr(opResult.content);
};

const operateSwitch = async ({
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

  const [isValid, value] =
    switcherResult.content.check(medium);

  const opResult = findInternalOp(
    alignment,
    isValid ? op.nextWhenTrue : op.nextWhenFalse,
  );
  const newEnv: Env = {
    ...env,
    [isValid
      ? op.saveAddrTrue
      : op.saveAddrFalse]: { value },
  };

  return isOk(opResult)
    ? operate({
        op: opResult.content,
        ctx: {
          ...ctx,
          env: newEnv,
        },
      })
    : newErr(opResult.content);
};

const operateProcess = async ({
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
  const value =
    await processorResult.content.process(medium);

  const newEnv = {
    ...env,
    [op.saveAddr]: { value },
  };

  if (op.exit) {
    const egressOpResult =
      findEgressOp(alignment);
    return isOk(egressOpResult)
      ? operate({
          op: egressOpResult.content,
          ctx: {
            ...ctx,
            env: newEnv,
          },
        })
      : newErr(egressOpResult.content);
  }

  if (!op.next) {
    return newErr(
      new Error(
        `No next opcode specified for operation "${op.opcode}"`,
      ),
    );
  }

  const nextOpResult = findInternalOp(
    alignment,
    op.next,
  );
  return isOk(nextOpResult)
    ? operate({
        op: nextOpResult.content,
        ctx: {
          ...ctx,
          env: newEnv,
        },
      })
    : newErr(nextOpResult.content);
};

const operateEgress = async ({
  op,
  ctx,
}: {
  op: EgressOperation;
  ctx: OperationContext;
}): Promise<Result<Medium, Error>> => {
  const medium: Medium = {
    value: "Egress reached",
  };
  op;
  ctx;
  return newOk(medium);
};
