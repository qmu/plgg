# plgg-foundry

⚠️ **UNSTABLE** - This is experimental study work focused on functional programming concepts. Primarily intended for our own projects, though publicly available. Part of the [plgg monorepo](../../README.md).

**plgg-foundry** is an AI-powered workflow orchestration library that dynamically composes and executes operations based on user requests. It uses LLM structured outputs to generate execution plans (called "Alignments") from a set of available operations you define (called a "Foundry").

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Complete Example](#complete-example)
- [API Reference](#api-reference)
- [Advanced Usage](#advanced-usage)
- [How It Works](#how-it-works)
- [License](#license)

## Installation

```bash
npm install plgg-foundry plgg
```

You'll also need an OpenAI API key with access to structured outputs.

## Quick Start

```typescript
import { runFoundry, makeFoundry, makeProcessor, makePacker } from "plgg-foundry";
import { openai } from "plgg-kit";
import { isOk } from "plgg";

// 1. Define your foundry. The LLM `provider` comes from plgg-kit; omit it to
//    use the default (`openai("gpt-5.1")`). A provider's apiKey falls back to
//    the environment when not given.
const foundry = makeFoundry({
  description: "A text processing foundry",
  provider: openai("gpt-4o"),
  apparatuses: [
    makeProcessor({
      name: "analyze-sentiment",
      description: "Analyzes the sentiment of text",
      arguments: { text: { type: "string" } },
      returns: { sentiment: { type: "string" } },
      fn: async (medium) => {
        const text = medium.params["text"]?.value;
        // Your processing logic here
        return { sentiment: "positive" };
      }
    }),
    makePacker({
      result: { type: "string" }
    })
  ]
});

// 2. Run the workflow — pass a prompt string (or an OrderSpec `{ text, files? }`).
const result = await runFoundry(foundry)(
  "Analyze the sentiment of 'I love this!'"
);

// Results are values: fold with isOk/matchResult, not a `.isOk()` method.
if (isOk(result)) {
  console.log(result.content.params);
}
```

## Core Concepts

### Foundry

A **Foundry** is your "factory specification" - it defines what operations are available for the AI to compose into workflows. It consists of:

- **Apparatuses**: A unified array containing all operations
  - **Processors**: Functions that transform data (e.g., "generate-image", "analyze-text")
  - **Switchers**: Functions that validate or branch based on conditions (e.g., "check-validity")
  - **Packers**: Named outputs that declare what results you expect

Think of a Foundry as a collection of tools that the AI can use to accomplish tasks.

### Order

An **Order** is a user request containing:

- **prompt**: A natural language description of what you want to accomplish
- **files** (optional): Array of binary files (images, documents, etc.) to process

### Alignment

An **Alignment** is an AI-generated execution plan - a sequence of operations that processes input to output. The AI creates this automatically based on your Order and Foundry capabilities.

### Medium

A **Medium** is the execution environment passed to your processor and switcher functions. It contains:

- **alignment**: The current alignment being executed
- **params**: A dictionary of typed values stored in registers (e.g., `{ "r0": { type: {...}, value: "hello" } }`)

## Complete Example

Here's a complete example of a character design foundry with validation loops:

```typescript
import {
  runFoundry,
  makeFoundry,
  makeProcessor,
  makeSwitcher,
  makePacker
} from "plgg-foundry";
import { openai } from "plgg-kit";
import { matchResult } from "plgg";

const foundry = makeFoundry({
  description: "Character design foundry that generates and validates character images",
  provider: openai("gpt-5.1"), // from plgg-kit; this is also the default

  apparatuses: [
    makeProcessor({
      name: "plan",
      description: "Plans the character design based on the prompt",
      arguments: { prompt: { type: "string" } },
      returns: { plan: { type: "string" } },
      fn: async (medium) => {
        const prompt = medium.params["prompt"]?.value;
        // Call your LLM or planning logic
        return {
          plan: `Character design plan for: ${prompt}`
        };
      }
    }),
    makeProcessor({
      name: "gen-main",
      description: "Generates the main character image",
      arguments: { description: { type: "string" } },
      returns: { image: { type: "image[]" } },
      fn: async (medium) => {
        const description = medium.params["description"]?.value;
        // Call your image generation API
        const imageData = await generateImage(description);
        return { image: [imageData] };
      }
    }),
    makeProcessor({
      name: "gen-spread",
      description: "Generates spread images (variations) for the character",
      arguments: { mainImage: { type: "image[]" } },
      returns: { spreadImages: { type: "image[]" } },
      fn: async (medium) => {
        const mainImage = medium.params["mainImage"]?.value;
        // Generate variations
        const variations = await generateVariations(mainImage);
        return { spreadImages: variations };
      }
    }),
    makeSwitcher({
      name: "check-validity",
      description: "Validates generated images for inappropriate content. If invalid, loops back to planning.",
      arguments: { images: { type: "image[]" } },
      returnsWhenTrue: { validImages: { type: "image[]" } },
      returnsWhenFalse: { feedback: { type: "string" } },
      fn: async (medium) => {
        const images = medium.params["images"]?.value;

        if (!Array.isArray(images) || !images.every(img => img instanceof Uint8Array)) {
          throw new Error("Invalid images for validation");
        }

        // Call your content moderation API
        const isValid = await moderateContent(images);

        return [
          isValid,
          isValid
            ? { validImages: images }
            : { feedback: "Content policy violation detected. Please revise." }
        ];
      }
    }),
    makePacker({
      mainImage: { type: "image[]" },
      spreadImages: { type: "image[]" },
      designPlan: { type: "string" }
    })
  ]
});

// Execute the workflow — a prompt string, or an OrderSpec `{ text, files? }`.
const result = await runFoundry(foundry)(
  "A brave knight with silver armor and a glowing sword"
);

// Errors are values — fold the Result with matchResult (or isOk/isErr).
matchResult(
  (e) => console.error("Workflow failed:", e),
  (medium) => {
    // Access outputs by their register addresses; the AI determines which
    // registers hold which outputs.
    console.log("Workflow completed:", medium.params);
  },
)(result);
```

### Expected Workflow

The AI might generate an alignment like this:

```
1. ingress → Store prompt in register r0
2. plan (r0) → Generate design plan in r1
3. gen-main (r1) → Generate image in r2
4. check-validity (r2) → Validate image
   - If valid: Continue with r2
   - If invalid: Loop back to step 2 with feedback in r3
5. gen-spread (r2) → Generate variations in r3
6. egress → Output final results
```

## API Reference

### `runFoundry(foundry)(input)`

Main entry point that orchestrates the complete workflow. Curried: it takes the
foundry first, then the request.

**Parameters:**

- `foundry: Foundry` - the value returned by `makeFoundry`
- `input: string | OrderSpec` - a prompt string, or an `OrderSpec`
  (`{ text, files? }`)

**Returns:** `Promise<Result<Medium, PlggError>>` — errors are **values** on the
Result channel (no exceptions); fold with `matchResult`/`isOk`.

- On success: `Medium` containing the final execution state with output parameters
- On failure: a `PlggError` describing what went wrong

**Example:**

```typescript
import { matchResult } from "plgg";

const result = await runFoundry(foundry)("Generate a character image");

matchResult(
  (e) => console.error(e),
  (medium) => {
    // Access outputs from medium.params
  },
)(result);
```

### Foundry spec (`makeFoundry`)

```typescript
const foundry = makeFoundry({
  description: string;                         // What this foundry does
  apparatuses: ReadonlyArray<Apparatus>;       // All operations (processors, switchers, packers)
  provider?: Provider;                         // plgg-kit provider; default openai("gpt-5.1")
  maxOperationLimit?: number;                  // Max operations (default: 10)
});
```

The LLM `provider` is a plgg-kit value (`openai(...)`, `anthropic(...)`, or
`google(...)`), so switching vendors is a one-line change.

### ProcessorSpec

Processors transform data and return outputs. Created using `makeProcessor`:

```typescript
makeProcessor({
  name: string;                    // Opcode identifier (kebab-case)
  description: string;             // What this processor does (shown to AI)
  arguments?: {                    // Input parameters (optional)
    [varName: string]: VirtualTypeSpec;
  };
  returns: {                       // Output parameters (required)
    [varName: string]: VirtualTypeSpec;
  };
  fn: (medium: Medium) =>
    Promise<{ [varName: string]: any }> | { [varName: string]: any };
})
```

**Example:**

```typescript
makeProcessor({
  name: "summarize-text",
  description: "Summarizes long text into a brief summary",
  arguments: { text: { type: "string" } },
  returns: { summary: { type: "string" } },
  fn: async (medium) => {
    const text = medium.params["text"]?.value;
    const summary = await callLLM(text);
    return { summary };
  }
})
```

### SwitcherSpec

Switchers evaluate conditions and can branch execution flow. Created using `makeSwitcher`:

```typescript
makeSwitcher({
  name: string;
  description: string;
  arguments?: {                    // Input parameters (optional)
    [varName: string]: VirtualTypeSpec;
  };
  returnsWhenTrue: {              // Outputs when condition is true
    [varName: string]: VirtualTypeSpec;
  };
  returnsWhenFalse: {             // Outputs when condition is false
    [varName: string]: VirtualTypeSpec;
  };
  fn: (medium: Medium) =>
    Promise<[boolean, { [varName: string]: any }]> |
    [boolean, { [varName: string]: any }];
})
```

**Example:**

```typescript
makeSwitcher({
  name: "is-spam",
  description: "Checks if text is spam. If spam, filter it out.",
  arguments: { text: { type: "string" } },
  returnsWhenTrue: { reason: { type: "string" } },
  returnsWhenFalse: { cleanText: { type: "string" } },
  fn: async (medium) => {
    const text = medium.params["text"]?.value;
    const isSpam = await detectSpam(text);

    return [
      isSpam,
      isSpam
        ? { reason: "Spam detected" }
        : { cleanText: text }
    ];
  }
})
```

### PackerSpec

Packers define the expected output fields and their types for egress operations. Created using `makePacker`:

```typescript
makePacker({
  [outputName: string]: VirtualTypeSpec;
})
```

**Example:**

```typescript
makePacker({
  finalReport: { type: "string" },
  summary: { type: "string" }
})
```

### OrderSpec

```typescript
type OrderSpec = {
  text: string;                    // Natural language request
  files?: Uint8Array[];           // Optional binary files
}
```

### VirtualTypeSpec

Type descriptors for function parameters:

```typescript
type VirtualTypeSpec = {
  type: string;           // Type name: "string", "image[]", "number", etc.
  optional?: boolean;     // Whether parameter is optional (default: true)
  description?: string;   // Human-readable description
}
```

**Common Types:**

- `"string"` - Text data
- `"number"` - Numeric data
- `"image[]"` - Array of binary images (Uint8Array[])
- `"boolean"` - True/false values
- Custom types are allowed (shown to AI as-is)

### Medium

The execution environment passed to your functions:

```typescript
type Medium = {
  alignment: Alignment;                          // Current alignment
  params: { [address: string]: Param };         // Register values
}

type Param = {
  type: VirtualType;  // Type descriptor
  value: any;         // Actual value
}
```

**Accessing Parameters:**

```typescript
fn: async (medium) => {
  // Access by parameter name (matches your arguments spec)
  const text = medium.params["text"]?.value;
  const count = medium.params["count"]?.value;

  // Type checking
  if (typeof text !== "string") {
    throw new Error("Expected string");
  }

  return { result: processText(text) };
}
```

## Advanced Usage

### Validation Loops

Switchers enable validation loops where the AI can retry operations:

```typescript
makeSwitcher({
  name: "check-quality",
  description: "Validates output quality. If poor quality, loops back to regenerate.",
  arguments: { output: { type: "string" } },
  returnsWhenTrue: { validOutput: { type: "string" } },
  returnsWhenFalse: { feedback: { type: "string" } },
  fn: async (medium) => {
    const output = medium.params["output"]?.value;
    const score = await evaluateQuality(output);

    return [
      score > 0.8,
      score > 0.8
        ? { validOutput: output }
        : { feedback: `Quality too low (${score}). Regenerate with more detail.` }
    ];
  }
})
```

The AI can compose an alignment that loops back to earlier operations when validation fails.

### Multiple Input Files

```typescript
const result = await runFoundry(foundry)({
  text: "Combine these images into a collage",
  files: [
    await readFile("image1.png"),
    await readFile("image2.png"),
    await readFile("image3.png")
  ]
});
```

### Custom Operation Limit

Control how many operations can execute (prevents infinite loops):

```typescript
const foundry = makeFoundry({
  description: "...",
  maxOperationLimit: 20,  // Allow up to 20 operations
  apparatuses: [...]
});
```

### Type Safety

Use standard TypeScript type guards for robust parameter validation:

```typescript
makeProcessor({
  name: "process-data",
  description: "Processes various data types",
  returns: { result: { type: "string" } },
  fn: async (medium) => {
    const value = medium.params["data"]?.value;

    if (typeof value === "string") {
      return { result: value.toUpperCase() };
    }

    if (Array.isArray(value) && value.every(v => v instanceof Uint8Array)) {
      return { result: processImages(value) };
    }

    throw new Error("Unexpected parameter type");
  }
})
```

### Error Handling

All operations should throw errors on failure:

```typescript
fn: async (medium) => {
  const text = medium.params["text"]?.value;

  if (typeof text !== "string") {
    throw new Error("Invalid parameter: expected string");
  }

  const result = await externalAPI(text);

  if (!result.success) {
    throw new Error(`API failed: ${result.error}`);
  }

  return { output: result.data };
}
```

Errors will propagate and cause the workflow to fail with a descriptive error message.

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  1. User provides FoundrySpec + OrderSpec               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  2. Validation: Cast specs to validated types           │
│     - Validate foundry structure                        │
│     - Validate order structure                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  3. Blueprint: AI generates Alignment                   │
│     - Sends foundry capabilities to LLM                 │
│     - AI composes operation sequence                    │
│     - Returns validated Alignment                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  4. Operate: Execute Alignment                          │
│     - Register machine with address-based storage       │
│     - Sequential operation execution                    │
│     - Support for loops and branching                   │
│     - Returns final Medium with outputs                 │
└─────────────────────────────────────────────────────────┘
```

### Operation Types

An Alignment consists of four operation types:

1. **IngressOperation**: Entry point - stores user input in registers
2. **ProcessOperation**: Calls a processor to transform data
3. **SwitchOperation**: Calls a switcher to validate/branch
4. **EgressOperation**: Exit point - collects final outputs

### Register Machine Model

Data flows through numbered registers (r0, r1, r2, ...):

```typescript
// Example execution trace:
// ingress: prompt → r0
// process "plan": r0 → r1 (plan)
// process "generate": r1 → r2 (image)
// switch "check": r2 → r2 (if valid) or r3 (feedback)
// egress: { image: r2, plan: r1 }
```

This enables complex workflows with loops, branches, and multiple data paths.

### AI-Driven Composition

The AI (LLM) receives:

1. Your foundry description and available operations
2. The user's order prompt
3. JSON schema defining valid alignment structure

It generates an Alignment that:

- Sequences operations logically
- Maps inputs/outputs through registers
- Handles validation loops
- Ensures type compatibility

You don't write the workflow - the AI composes it dynamically based on the user's request.

## Best Practices

### 1. Write Clear Descriptions

The AI uses descriptions to understand what operations do:

```typescript
// ✅ Good - Clear and specific
makeSwitcher({
  name: "check-validity",
  description: "Validates images for inappropriate content using content moderation API. If invalid, return feedback for regeneration.",
  // ...
})

// ❌ Bad - Vague
makeSwitcher({
  name: "check",
  description: "Checks stuff",
  // ...
})
```

### 2. Use Meaningful Names

Use kebab-case for operation names:

```typescript
// ✅ Good
"generate-character-image"
"validate-content"
"analyze-sentiment"

// ❌ Bad
"proc1"
"x"
"doStuff"
```

### 3. Validate Parameters

Always validate parameters in your functions:

```typescript
fn: async (medium) => {
  const value = medium.params["text"]?.value;

  if (typeof value !== "string") {
    throw new Error("Expected string parameter 'text'");
  }

  // ... safe to use value as string
}
```

### 4. Handle Async Operations

All processor and switcher functions can be async:

```typescript
fn: async (medium) => {
  const prompt = medium.params["prompt"]?.value;
  const result = await callExternalAPI(prompt);
  return { output: result };
}
```

### 5. Design for Loops

When using switchers for validation, provide clear feedback:

```typescript
returnsWhenFalse: { feedback: { type: "string" } },
fn: async (medium) => {
  // ...
  return [
    false,
    {
      feedback: "Image contains inappropriate content. Please regenerate with family-friendly themes."
    }
  ];
}
```

The AI can use this feedback to adjust subsequent operations.

## Limitations

- **Experimental**: This library is in early development and APIs may change
- **LLM Dependency**: Requires LLM API access for blueprint generation
- **Cost**: Each workflow execution calls the LLM API (monitor your usage)
- **Operation Limit**: Default limit of 10 operations prevents infinite loops but may constrain complex workflows
- **Type System**: Limited to the VirtualType system (string, number, image[], etc.)

## Troubleshooting

### "No processor found for opcode X"

The AI generated an alignment referencing a processor you didn't define. Ensure your processor names match exactly (kebab-case).

### "Operation limit exceeded"

Your workflow hit the operation limit (default: 10). Either:
- Increase `maxOperationLimit` in your foundry spec
- Simplify your workflow to require fewer operations

### "Invalid medium value"

Your processor received unexpected parameter types. Add validation:

```typescript
fn: async (medium) => {
  const value = medium.params["text"]?.value;

  if (typeof value !== "string") {
    throw new Error(`Expected string, got ${typeof value}`);
  }

  // ... process
}
```

### AI generates incorrect alignments

- Improve operation descriptions to be more specific
- Ensure your foundry description clearly explains its purpose
- Check that processor/switcher argument/return types are accurate

## License

MIT License - see LICENSE file for details.
