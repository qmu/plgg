import { Result, isErr } from "plgg";
import {
  Alignment,
  Foundry,
  Order,
  asAlignment,
  explainFoundry,
  explainOrder,
  extractOpcodes,
  isProcessor,
  isSwitcher,
} from "plgg-foundry/index";
import { generateJson } from "plgg-foundry/Foundry/vendor/OpenAI";

/**
 * Generates an alignment from user order using AI model based on available foundry functions.
 */
export const blueprint =
  (foundry: Foundry) =>
  async (
    order: Order,
  ): Promise<Result<Alignment, Error>> => {
    // Extract available opcodes for enum constraints
    const processorOpcodes = extractOpcodes(
      foundry.apparatuses,
      isProcessor,
    );
    const switcherOpcodes = extractOpcodes(
      foundry.apparatuses,
      isSwitcher,
    );
    const allOpcodes = [
      ...processorOpcodes,
      ...switcherOpcodes,
      "egress",
    ];
    const res = await generateJson({
      apiKey: foundry.apiKey.content,
      model: "gpt-5-nano-2025-08-07",
      instructions: `Generate an Alignment to fulfill the user request.

## Alignment

An Alignment is a sequence of operations that processes input data into output data, like a factory production line.

There are 4 operation types:
- 'ingress': Assigns input data (prompt and files) to register addresses
- 'process': Loads data from registers using a name table, processes it with a function, and saves the result to registers using a name table
- 'switch': Evaluates data from registers using a name table and branches to different operations based on the result, saving outputs using name tables
- 'egress': Maps register data to output fields

## Foundry

The Foundry provides apparatuses for 'process' and 'switch' operations:
- 'processors': Apparatuses that execute processing functions in process operations
- 'switchers': Apparatuses that evaluate conditions in switch operations
- 'packers': Apparatuses that define processor output specifications

## Available Foundry Apparatuses

\`\`\`
${explainFoundry(foundry)}
\`\`\`

## Switch Operation Semantics

Switchers evaluate data and return [boolean, Dict<VariableName, Datum>]. The boolean determines the branch:
- nextWhenTrue: Executes when condition is TRUE (success/valid/yes)
- nextWhenFalse: Executes when condition is FALSE (failure/invalid/no)

For validation switchers: TRUE means valid → proceed forward. FALSE means invalid → retry or handle error.

## NameTable Semantics

NameTables map variable names to register addresses:
- 'input': Maps function argument names to register addresses (where to read from)
- 'output': Maps function return value names to register addresses (where to write to)
- 'outputWhenTrue'/'outputWhenFalse': Maps switcher return value names to register addresses based on condition

## Reachability Rule

Every process/switch operation MUST be reachable via control flow (next, nextWhenTrue, nextWhenFalse). Do NOT create orphan operations that are never referenced.

Example without validation:
\`\`\`json
{
  "operations": [
    { "type": "ingress", "next": "plan", "promptAddr": "r0" },
    { "type": "process", "opcode": "plan", "input": {"prompt": "r0"}, "output": {"plan": "r1"}, "next": "gen-main" },
    { "type": "process", "opcode": "gen-main", "input": {"description": "r1"}, "output": {"image": "r2"}, "next": "egress" },
    { "type": "egress", "result": {"mainImage": "r2"} }
  ]
}
\`\`\`

Example with validation (validation passes → continue, validation fails → retry):
\`\`\`json
{
  "operations": [
    { "type": "ingress", "next": "plan", "promptAddr": "r0" },
    { "type": "process", "opcode": "plan", "input": {"prompt": "r0"}, "output": {"plan": "r1"}, "next": "gen-main" },
    { "type": "process", "opcode": "gen-main", "input": {"description": "r1"}, "output": {"image": "r2"}, "next": "check-validity" },
    { "type": "switch", "opcode": "check-validity", "input": {"images": "r2"}, "nextWhenTrue": "egress", "nextWhenFalse": "plan", "outputWhenTrue": {"validImages": "r2"}, "outputWhenFalse": {"feedback": "r3"} },
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
                          "Register (e.g., 'r0') storing user prompt. Referenced by subsequent input name tables.",
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
                      "Process operation - Executes a Foundry processor and continues to next operation.",
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
                      input: {
                        type: "object",
                        description:
                          "NameTable mapping processor argument names to register addresses (e.g., {'prompt': 'r0', 'description': 'r1'}). All registers must be previously written. Keys must match processor's argument names.",
                        properties: {},
                        additionalProperties: {
                          type: "string",
                        },
                        required: [],
                      },
                      output: {
                        type: "object",
                        description:
                          "NameTable mapping processor return value names to register addresses (e.g., {'plan': 'r2', 'result': 'r3'}). These registers can be referenced by later operations. Keys must match processor's return value names.",
                        properties: {},
                        additionalProperties: {
                          type: "string",
                        },
                        required: [],
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
                      "input",
                      "output",
                      "next",
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
                      input: {
                        type: "object",
                        description:
                          "NameTable mapping switcher argument names to register addresses (e.g., {'images': 'r2', 'data': 'r3'}). All registers must be previously written. Keys must match switcher's argument names.",
                        properties: {},
                        additionalProperties: {
                          type: "string",
                        },
                        required: [],
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
                      outputWhenTrue: {
                        type: "object",
                        description:
                          "NameTable mapping switcher return value names to register addresses when true (e.g., {'validImages': 'r4', 'result': 'r5'}). Keys must match switcher's returnsWhenTrue field names.",
                        properties: {},
                        additionalProperties: {
                          type: "string",
                        },
                        required: [],
                      },
                      outputWhenFalse: {
                        type: "object",
                        description:
                          "NameTable mapping switcher return value names to register addresses when false (e.g., {'feedback': 'r6', 'error': 'r7'}). Keys must match switcher's returnsWhenFalse field names.",
                        properties: {},
                        additionalProperties: {
                          type: "string",
                        },
                        required: [],
                      },
                    },
                    required: [
                      "type",
                      "opcode",
                      "input",
                      "nextWhenTrue",
                      "nextWhenFalse",
                      "outputWhenTrue",
                      "outputWhenFalse",
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

Registers: Use 'r0', 'r1', 'r2'... Start with 'r0' for ingress promptAddr. Increment sequentially for file addresses and operation outputs.

Control Flow: 'next', 'nextWhenTrue', 'nextWhenFalse' reference opcodes from other operations. Can create loops. To terminate, use 'next: "egress"' to jump to egress operation.

Data Flow: NameTables map variable names to register addresses. Input NameTables reference previously written registers. Output NameTables specify where to write results. Flow: ingress → process/switch (using input/output NameTables) → egress.`,
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
    return asAlignment(res.content);
  };
