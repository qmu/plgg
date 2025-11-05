import {
  Alignment,
  Foundry,
  Order,
} from "plgg-foundry/index";

export const blueprint =
  (_foundry: Foundry) =>
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
