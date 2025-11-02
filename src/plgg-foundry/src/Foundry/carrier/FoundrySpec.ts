import {
  Str,
  Castable,
  Result,
  asStr,
  cast,
  forProp,
  asReadonlyArray,
  newOk,
  newErr,
  isErr,
} from "plgg";
import {
  Processor,
  Switcher,
  ProcessorArg,
  SwitcherArg,
  Alignment,
  OperationContext,
  Operation,
  Order,
  findIngressOp,
  findInternalOp,
  asProcessor,
  asSwitcher,
} from "plgg-foundry/index";

export type FoundrySpec = {
  description: Str;
  processors: ReadonlyArray<Processor>;
  switchers: ReadonlyArray<Switcher>;
};

export type FoundrySpecArg = {
  description: string;
  processors: ReadonlyArray<ProcessorArg>;
  switchers: ReadonlyArray<SwitcherArg>;
};

export const asFoundrySpec = (
  value: FoundrySpecArg,
) =>
  cast(
    value,
    forProp("description", asStr),
    forProp(
      "processors",
      asReadonlyArray(asProcessor),
    ),
    forProp(
      "switchers",
      asReadonlyArray(asSwitcher),
    ),
  );

/**
 * Castable instance for Foundry safe casting.
 */
export const foundrySpecCastable: Castable<
  FoundrySpec,
  FoundrySpecArg
> = {
  as: asFoundrySpec,
};

export const findSwitcher = (
  foundry: FoundrySpec,
  opcode: string,
): Result<Switcher, Error> => {
  const switcher = foundry.switchers.find(
    (s) => s.id.content === opcode,
  );
  if (!switcher) {
    return newErr(
      new Error(
        `No switcher found for opcode "${opcode}"`,
      ),
    );
  }
  return newOk(switcher);
};

export const findProcessor = (
  foundry: FoundrySpec,
  opcode: string,
): Result<Processor, Error> => {
  const processor = foundry.processors.find(
    (p) => p.opcode.content === opcode,
  );
  if (!processor) {
    return newErr(
      new Error(
        `No processor found for opcode "${opcode}"`,
      ),
    );
  }
  return newOk(processor);
};

export const blueprint =
  (_foundry: FoundrySpec) =>
  (order: Order): Alignment => {
    const examplAlignment: Alignment = {
      instruction: order.prompt.content,
      operations: [
        {
          type: "ingress",
          next: "plan",
          promptAddr: "r0",
        },
        {
          type: "process",
          opcode: "plan",
          next: "gen-main",
          loadAddr: "r0",
          saveAddr: "r1",
        },
        {
          type: "process",
          opcode: "gen-main",
          next: "check-validity",
          loadAddr: "r1",
          saveAddr: "r2",
        },
        {
          type: "switch",
          opcode: "check-validity",
          nextWhenTrue: "gen-spread",
          nextWhenFalse: "plan",
          loadAddr: "r2",
          saveAddrTrue: "r3",
          saveAddrFalse: "r0",
        },
        {
          type: "process",
          opcode: "gen-spread",
          exit: true,
          loadAddr: "r2",
          saveAddr: "r3",
        },
        {
          type: "egress",
          result: {
            mainImage: "r2",
            spreadImage: "r3",
          },
        },
      ],
    };

    return examplAlignment;
  };

export const assemble =
  (foundry: FoundrySpec) =>
  (
    alignment: Alignment,
  ): Result<
    { op: Operation; ctx: OperationContext },
    Error
  > => {
    const ingressOp = findIngressOp(alignment);
    if (isErr(ingressOp)) {
      return ingressOp;
    }
    const newEnv = {
      [ingressOp.content.promptAddr]: {
        value: alignment.instruction,
      },
    };
    const nextOp = findInternalOp(
      alignment,
      ingressOp.content.next,
    );
    if (isErr(nextOp)) {
      return nextOp;
    }
    return newOk({
      op: nextOp.content,
      ctx: {
        foundry,
        alignment,
        env: newEnv,
      },
    });
  };
