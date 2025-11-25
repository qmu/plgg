# plgg-kit

Vendor dependencies for plgg projects - LLM provider abstractions and utilities.

**plgg-kit** provides a unified interface for interacting with multiple LLM providers (OpenAI, Anthropic, Google) with structured output support.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Supported Providers](#supported-providers)
- [License](#license)

## Installation

```bash
npm install plgg-kit plgg
```

You'll need API keys for the LLM provider(s) you want to use.

## Quick Start

```typescript
import { generateObject, openai, anthropic, google } from 'plgg-kit';
import { Result } from 'plgg';

// Create a provider configuration
const provider = openai({
  modelName: 'gpt-4-turbo',
  apiKey: process.env.OPENAI_API_KEY
});

// Define your desired output schema
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
    email: { type: 'string' }
  },
  required: ['name', 'age', 'email']
};

// Generate structured output from LLM
const result = await generateObject({
  provider,
  userPrompt: 'Extract user information from: John Doe, 30 years old, john@example.com',
  schema
});

if (result.isOk()) {
  console.log('Generated object:', result.content);
} else {
  console.error('Error:', result.content.message);
}
```

## API Reference

### `generateObject(params)`

Generate structured output from an LLM.

**Parameters:**

```typescript
{
  provider: Provider;           // LLM provider configuration
  userPrompt: string;          // Natural language request
  systemPrompt?: string;       // System context (optional)
  schema: Datum;               // Output schema descriptor
}
```

**Returns:** `PromisedResult<unknown, Error>`

- On success: The generated object matching the schema
- On failure: Error describing what went wrong

**Example:**

```typescript
const result = await generateObject({
  provider: openai({
    modelName: 'gpt-4-turbo',
    apiKey: process.env.OPENAI_API_KEY
  }),
  systemPrompt: 'You are a helpful assistant that extracts structured data.',
  userPrompt: 'Extract the person\'s name and email',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' }
    }
  }
});
```

## Supported Providers

### OpenAI

```typescript
import { openai } from 'plgg-kit';

const provider = openai({
  modelName: 'gpt-4-turbo',  // or other OpenAI models
  apiKey: process.env.OPENAI_API_KEY
});
```

Requires OpenAI API key with access to models supporting structured outputs (gpt-4-turbo or newer).

### Anthropic

```typescript
import { anthropic } from 'plgg-kit';

const provider = anthropic({
  modelName: 'claude-3-5-sonnet-20241022',  // or other Claude models
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

Requires Anthropic API key.

### Google

```typescript
import { google } from 'plgg-kit';

const provider = google({
  modelName: 'gemini-2.0-flash',  // or other Gemini models
  apiKey: process.env.GOOGLE_API_KEY
});
```

Requires Google API key for Gemini models.

### Type Guards

Check provider types with type guards:

```typescript
import { asOpenAI, asAnthropic, asGoogle } from 'plgg-kit';
import { cast, isOk } from 'plgg';

const validateProvider = (provider: unknown) => {
  const openaiResult = cast(provider, asOpenAI);
  if (openaiResult.isOk()) {
    console.log('Valid OpenAI provider');
    return true;
  }
  return false;
};
```

## Best Practices

### 1. Environment Variable Management

Store API keys securely:

```typescript
import dotenv from 'dotenv';
dotenv.config();

const provider = openai({
  modelName: 'gpt-4-turbo',
  apiKey: process.env.OPENAI_API_KEY // or throw error if not set
});
```

### 2. Schema Definition

Define clear, unambiguous schemas:

```typescript
// Good - clear types and descriptions
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number', minimum: 0 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

// Avoid vague schemas
// { type: 'object', properties: { data: { type: 'string' } } }
```

### 3. Error Handling

Always handle both success and failure cases:

```typescript
const result = await generateObject({
  provider,
  userPrompt: 'Extract data',
  schema
});

if (result.isOk()) {
  const data = result.content;
  // Process successfully generated object
} else {
  const error = result.content;
  console.error('Failed to generate object:', error.message);
  // Handle error appropriately
}
```

### 4. Provider Selection

Choose providers based on your needs:

- **OpenAI**: Latest capabilities, best for complex reasoning
- **Anthropic**: Strong for safety and instruction following
- **Google**: Cost-effective, good for standard use cases

## License

MIT License - see LICENSE file for details.
