# The plgg guide

plgg is a TypeScript library for validating input and composing small functions. In [your first program](/getting-started/), change one input to see how the same function reports success and failure.

If you’re building an application, start with the [package directory](/packages/). For example, open [HTTP responses](/packages/plgg-http/) and [server handlers](/packages/plgg-server/) side by side to see where a response is built and where it is sent.

## Why start with types?

For a book registration program, first define what qualifies as a title. Validate external input once and storage and rendering can use the resulting value without repeating that check. `Option` records absence. `Result` carries a failure reason to the caller that can act on it.

Keep data free of methods and write standalone functions. Taking configuration first and data last lets those functions compose with pipe. When types disagree, validate the input or supply a guard that narrows it. [Build a bookshelf](/tutorial/) follows one value from HTTP through SQLite to HTML.

## How the packages fit together

The package on the left uses the one on the right. plgg-server → plgg-http ← plgg-fetch allows both sides of a request to share response types. plgg-db-migration → plgg-sql → plgg is the storage path. Language processing follows plgg-ir-manifest → plgg-ir-language → plgg-ir-syntax → plgg-parser. See the [complete dependency map](/packages/) for the other branches.

[Design choices](/design/choices/) · [Choosing an approach](/design/alternatives/) · [Working through friction](/design/friction/) · [Package boundaries](/design/family/)
