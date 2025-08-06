# plgg

⚠️ **UNSTABLE** - This is experimental study work focused on functional programming concepts. Primarily intended for our own projects, though publicly available.

## Project Structure

This is a monorepo containing:

- **`src/plgg/`** - Main library package
- **`src/example/`** - Example usage project

## Installation

```bash
npm install plgg
```

## Quick Start

```typescript
import { chain, Str, Num, Obj, isOk } from 'plgg';

const validateUser = (input: unknown) => chain(
  input,
  Obj.cast,
  Obj.prop('name', Str.cast),
  Obj.prop('age', chain(Num.cast, Num.gt(0)))
);

const result = validateUser(userInput);
if (isOk(result)) {
  console.log('Valid user:', result.content);
}
```

## License

MIT License - see LICENSE file for details.
