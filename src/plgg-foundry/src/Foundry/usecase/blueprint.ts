import { Result, isErr } from "plgg";
import {
  Alignment,
  Foundry,
  Order,
  asAlignment,
  explainFoundry,
  explainOrder,
  extractOpcodes,
} from "plgg-foundry/index";
import { generateJson } from "plgg-foundry/Foundry/vendor/OpenAI";

export const blueprint =
  (foundry: Foundry) =>
  async (
    order: Order,
  ): Promise<Result<Alignment, Error>> => {
    // Extract available opcodes for enum constraints
    const processorOpcodes = extractOpcodes(
      foundry.processors,
    );
    const switcherOpcodes = extractOpcodes(
      foundry.switchers,
    );
    const allOpcodes = [
      ...processorOpcodes,
      ...switcherOpcodes,
    ];
    console.log(`## Available Foundry Functions

\`\`\`
${explainFoundry(foundry)}
\`\`\`

Compose the Alignment using only these available functions, following the JSON schema rules.`);
    const res = await generateJson({
      apiKey: foundry.apiKey.content,
      model: "gpt-5-nano-2025-08-07",
      instructions: `Generate an Alignment to fulfill the user request.

## Alignment

An Alignment is a sequence of operations that processes input data into output data, like a factory production line.

There are 4 operation types:
- 'ingress': Assigns input data to register addresses
- 'process': Loads data from a register, processes it with a function, and saves the result to a register
- 'switch': Evaluates data from a register and branches to different operations based on the result
- 'egress': Maps register data to output fields

## Foundry

The Foundry provides functions for 'process' and 'switch' operations:
- 'processors': Functions used in process operations
- 'switchers': Functions used in switch operations
- 'packers': Processor definitions with output key names

## Available Foundry Functions

\`\`\`
${explainFoundry(foundry)}
\`\`\`

Example:
\`\`\`json
{
  "operations": [
    { "type": "ingress", "next": "plan", "promptAddr": "r0" },
    { "type": "process", "opcode": "plan", "next": "gen-main", "loadAddr": "r0", "saveAddr": "r1" },
    { "type": "process", "opcode": "gen-main", "exit": true, "loadAddr": "r1", "saveAddr": "r2" },
    { "type": "egress", "result": {"mainImage": "r2"} }
  ]
}
\`\`\``,
      input: explainOrder(order),
      responseFormat: {
        name: "alignment_composition",
        description: `Analysis and composition of an Alignment to fulfill the user request.`,
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            userRequestAnalysis: {
              type: "string",
              maxLength: 600,
              description:
                "Analysis of the user request and strategy to fulfill it using available Foundry functions. Use the same language as the user request. Must be under 100 words.",
            },
            compositionRationale: {
              type: "string",
              maxLength: 400,
              description:
                "Rationale for the operation sequence based on the analysis. Use the same language as the user request. Must be under 60 words.",
            },
            userRequest: {
              type: "string",
              description:
                "Refined user request based on the analysis.",
            },
            operations: {
              type: "array",
              items: {
                anyOf: [
                  {
                    type: "object",
                    description:
                      "Ingress operation - Entry point that assigns input to registers. Must be first and appear exactly once.",
                    properties: {
                      type: {
                        type: "string",
                        const: "ingress",
                        description:
                          "Operation type.",
                      },
                      next: {
                        type: "string",
                        enum: allOpcodes,
                        description:
                          "Opcode of next operation to execute.",
                      },
                      promptAddr: {
                        type: "string",
                        description:
                          "Register (e.g., 'r0') storing user prompt. Referenced by subsequent loadAddr fields.",
                      },
                    },
                    required: [
                      "type",
                      "next",
                      "promptAddr",
                    ],
                    additionalProperties: false,
                  },
                  {
                    type: "object",
                    description:
                      "Process operation with next - Executes a Foundry processor and continues to next operation.",
                    properties: {
                      type: {
                        type: "string",
                        const: "process",
                        description:
                          "Operation type.",
                      },
                      opcode: {
                        type: "string",
                        enum: processorOpcodes,
                        description:
                          "Processor opcode from Available Foundry Functions.",
                      },
                      loadAddr: {
                        type: "string",
                        description:
                          "Register to load input from (e.g., 'r0'). Must be previously written.",
                      },
                      saveAddr: {
                        type: "string",
                        description:
                          "Register to save output to (e.g., 'r2'). Can be referenced by later operations.",
                      },
                      next: {
                        type: "string",
                        enum: allOpcodes,
                        description:
                          "Opcode of next operation to execute.",
                      },
                    },
                    required: [
                      "type",
                      "opcode",
                      "loadAddr",
                      "saveAddr",
                      "next",
                    ],
                    additionalProperties: false,
                  },
                  {
                    type: "object",
                    description:
                      "Process operation with exit - Executes a Foundry processor as terminal operation.",
                    properties: {
                      type: {
                        type: "string",
                        const: "process",
                        description:
                          "Operation type.",
                      },
                      opcode: {
                        type: "string",
                        enum: processorOpcodes,
                        description:
                          "Processor opcode from Available Foundry Functions.",
                      },
                      loadAddr: {
                        type: "string",
                        description:
                          "Register to load input from (e.g., 'r0'). Must be previously written.",
                      },
                      saveAddr: {
                        type: "string",
                        description:
                          "Register to save output to (e.g., 'r2'). Can be referenced by later operations.",
                      },
                      exit: {
                        type: "boolean",
                        const: true,
                        description:
                          "Marks this as terminal operation before egress.",
                      },
                    },
                    required: [
                      "type",
                      "opcode",
                      "loadAddr",
                      "saveAddr",
                      "exit",
                    ],
                    additionalProperties: false,
                  },
                  {
                    type: "object",
                    description:
                      "Switch operation - Evaluates register data and branches based on true/false result.",
                    properties: {
                      type: {
                        type: "string",
                        const: "switch",
                        description:
                          "Operation type.",
                      },
                      opcode: {
                        type: "string",
                        enum: switcherOpcodes,
                        description:
                          "Switcher opcode from Available Foundry Functions.",
                      },
                      loadAddr: {
                        type: "string",
                        description:
                          "Register to evaluate (e.g., 'r2'). Must be previously written.",
                      },
                      nextWhenTrue: {
                        type: "string",
                        enum: allOpcodes,
                        description:
                          "Opcode to execute when condition is true.",
                      },
                      nextWhenFalse: {
                        type: "string",
                        enum: allOpcodes,
                        description:
                          "Opcode to execute when condition is false.",
                      },
                      saveAddrTrue: {
                        type: "string",
                        description:
                          "Register to save data when true (e.g., 'r3').",
                      },
                      saveAddrFalse: {
                        type: "string",
                        description:
                          "Register to save data when false (e.g., 'r0'). Can match saveAddrTrue if needed.",
                      },
                    },
                    required: [
                      "type",
                      "opcode",
                      "loadAddr",
                      "nextWhenTrue",
                      "nextWhenFalse",
                      "saveAddrTrue",
                      "saveAddrFalse",
                    ],
                    additionalProperties: false,
                  },
                  {
                    type: "object",
                    description:
                      "Egress operation - Exit point that maps registers to output fields. Must appear at least once.",
                    properties: {
                      type: {
                        type: "string",
                        const: "egress",
                        description:
                          "Operation type.",
                      },
                      result: {
                        type: "object",
                        description:
                          "Maps output names to registers. Keys are output field names (e.g., 'mainImage'), values are registers (e.g., 'r2').",
                        properties: {},
                        additionalProperties: {
                          type: "string",
                        },
                        required: [],
                      },
                    },
                    required: ["type", "result"],
                    additionalProperties: false,
                  },
                ],
              },
              description: `Operation sequence rules:

Structure: Start with one 'ingress', end with 'egress'. Ingress first, egress last.

Registers: Use 'r0', 'r1', 'r2'... Start with 'r0' for ingress promptAddr. Increment sequentially.

Control Flow: 'next', 'nextWhenTrue', 'nextWhenFalse' reference opcodes from other operations. Can create loops. Terminal operations use 'exit: true'.

Data Flow: loadAddr references previously written register. Flow: ingress → process/switch → egress.`,
            },
          },
          required: [
            "userRequestAnalysis",
            "compositionRationale",
            "userRequest",
            "operations",
          ],
          additionalProperties: false,
        },
      },
    });
    if (isErr(res)) {
      return res;
    }

    console.log(res.content);

    return asAlignment(res.content);
  };
