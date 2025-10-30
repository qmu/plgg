import {
  Result,
  newOk,
  newErr,
  isOk,
} from "plgg";
import {
  Foundry,
  Medium,
  OperationContext,
  Alignment,
  IngressOperation,
  SwitchOperation,
  ProcessOperation,
  EgressOperation,
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
  foundry,
  alignment,
  medium,
  operation: op,
  env,
}: OperationContext): Promise<
  Result<Medium, Error>
> => {
  if (isIngressOperation(op)) {
    return operateIngress(
      foundry,
      alignment,
      medium,
      op,
      env,
    );
  }
  if (isSwitchOperation(op)) {
    return operateSwitch(
      foundry,
      alignment,
      medium,
      op,
      env,
    );
  }
  if (isProcessOperation(op)) {
    return operateProcess(
      foundry,
      alignment,
      medium,
      op,
      env,
    );
  }
  if (isEgressOperation(op)) {
    return operateEgress(
      foundry,
      alignment,
      medium,
      op,
      env,
    );
  }
  return newErr(
    new Error(
      `Unknown operation type for operation`,
    ),
  );
};

const operateIngress = async (
  foundry: Foundry,
  alignment: Alignment,
  medium: Medium,
  op: IngressOperation,
  env: Record<string, unknown>,
): Promise<Result<Medium, Error>> => {
  const opResult = findInternalOp(
    alignment,
    op.next,
  );
  return isOk(opResult)
    ? operate({
        foundry,
        alignment,
        operation: opResult.content,
        medium,
        env,
      })
    : newErr(opResult.content);
};

const operateSwitch = async (
  foundry: Foundry,
  alignment: Alignment,
  medium: Medium,
  op: SwitchOperation,
  env: Record<string, unknown>,
): Promise<Result<Medium, Error>> => {
  const switcherResult = findSwitcher(
    foundry,
    op.opcode,
  );
  if (!isOk(switcherResult)) {
    return newErr(switcherResult.content);
  }

  const [isValid, value] =
    switcherResult.content.check(medium);

  const opResult = findInternalOp(
    alignment,
    isValid ? op.nextWhenTrue : op.nextWhenFalse,
  );

  return isOk(opResult)
    ? operate({
        foundry,
        alignment,
        operation: opResult.content,
        medium: {
          ...medium,
          value: value,
        },
        env,
      })
    : newErr(opResult.content);
};

const operateProcess = async (
  foundry: Foundry,
  alignment: Alignment,
  medium: Medium,
  op: ProcessOperation,
  env: Record<string, unknown>,
): Promise<Result<Medium, Error>> => {
  const processorResult = findProcessor(
    foundry,
    op.opcode,
  );
  if (!isOk(processorResult)) {
    return newErr(processorResult.content);
  }
  const value =
    await processorResult.content.process(medium);

  if (op.exit) {
    const egressOpResult =
      findEgressOp(alignment);
    return isOk(egressOpResult)
      ? operate({
          foundry,
          alignment,
          medium: {
            value,
          },
          operation: egressOpResult.content,
          env,
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
        foundry,
        alignment,
        operation: nextOpResult.content,
        medium: {
          value,
        },
        env,
      })
    : newErr(nextOpResult.content);
};

const operateEgress = async (
  _foundry: Foundry,
  _alignment: Alignment,
  medium: Medium,
  _op: EgressOperation,
  _env: Record<string, unknown>,
): Promise<Result<Medium, Error>> => {
  return newOk(medium);
};
