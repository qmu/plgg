# Find a package by task

Start with [plgg](/packages/plgg/) for the shared types and functions. Choose a package below by the task you want to perform.

## Views and HTTP

- [plgg-http](/packages/plgg-http/) — Build an HTTP response
- [plgg-server](/packages/plgg-server/) — Route a request to a handler
- [plgg-fetch](/packages/plgg-fetch/) — Read an HTTP response
- [plgg-router](/packages/plgg-router/) — Read parameters from a URL
- [plgg-view](/packages/plgg-view/) — Build a `view` from data
- [example](/packages/example/) — Run the to-do example

## Storage and authentication

- [plgg-sql](/packages/plgg-sql/) — Build a parameterized query
- [plgg-db-migration](/packages/plgg-db-migration/) — Apply schema changes
- [plgg-auth](/packages/plgg-auth/) — Integrate sign-in
- [plgg-cms](/packages/plgg-cms/) — Serve and manage content

## Languages and documents

- [plgg-parser](/packages/plgg-parser/) — Combine small parsers
- [plgg-md](/packages/plgg-md/) — Read a Markdown body and its headings
- [plgg-highlight](/packages/plgg-highlight/) — Highlight fenced code
- [plgg-ir-syntax](/packages/plgg-ir-syntax/) — Read and print S-expressions
- [plgg-ir-language](/packages/plgg-ir-language/) — Define the meaning of a dialect
- [plgg-ir-manifest](/packages/plgg-ir-manifest/) — Validate a domain manifest
- [plgg-ir-thesis](/packages/plgg-ir-thesis/) — Check an argumentation model
- [plgg-ir-thesis-proof](/packages/plgg-ir-thesis-proof/) — Read a counterexample
- [plgg-ir-diagram](/packages/plgg-ir-diagram/) — Check diagram references and types

## Models and tools

- [plgg-kit](/packages/plgg-kit/) — Request structured model output
- [plgg-token-metering](/packages/plgg-token-metering/) — Estimate token usage and cost
- [plgg-foundry](/packages/plgg-foundry/) — Plan a sequence of operations
- [plgg-mcp](/packages/plgg-mcp/) — Expose tools through MCP
- [plgg-cli](/packages/plgg-cli/) — Validate command-line arguments
- [plgg-bundle](/packages/plgg-bundle/) — Bundle a library
- [plgg-test](/packages/plgg-test/) — Run tests

## Graphics and related sites

- [plgg-board](/packages/plgg-board/) — Project coordinates onto a drawing
- [plgg-flow](/packages/plgg-flow/) — Draw an interactive diagram
- [plggmatic](/packages/plggmatic/) — Choose components for a `view`
- [plggpress](/packages/plggpress/) — Publish a Markdown site

For the hrns coding agent, see the [hrns guide](https://hrns.qmu.co.jp/en/).

## Workspace dependency map

Each row lists direct runtime dependencies declared by the package on the left. Build and test tools declared only for development are excluded.

| Package | Direct dependencies |
| --- | --- |
| [example](/packages/example/) | plgg, plgg-view, plgg-router, plgg-server |
| [guide](/packages/guide/) | plggpress |
| [plgg](/packages/plgg/) | — |
| [plgg-auth](/packages/plgg-auth/) | plgg, plgg-http, plgg-server, plgg-sql, plgg-db-migration |
| [plgg-board](/packages/plgg-board/) | plgg |
| [plgg-bundle](/packages/plgg-bundle/) | — |
| [plgg-cli](/packages/plgg-cli/) | plgg |
| [plgg-cms](/packages/plgg-cms/) | plgg, plgg-auth, plgg-db-migration, plgg-http, plgg-kit, plgg-mcp, plgg-md, plgg-server, plgg-sql, plgg-view, plggpress |
| [plgg-db-migration](/packages/plgg-db-migration/) | plgg, plgg-sql |
| [plgg-fetch](/packages/plgg-fetch/) | plgg, plgg-http |
| [plgg-flow](/packages/plgg-flow/) | plgg, plgg-board, plgg-view |
| [plgg-flow-example](/packages/plgg-flow-example/) | plgg, plgg-board, plgg-flow, plgg-view, plgg-ir-diagram |
| [plgg-foundry](/packages/plgg-foundry/) | plgg, plgg-kit |
| [plgg-highlight](/packages/plgg-highlight/) | plgg, plgg-md, plgg-parser, plgg-view |
| [plgg-http](/packages/plgg-http/) | plgg |
| [plgg-ir-diagram](/packages/plgg-ir-diagram/) | plgg, plgg-ir-syntax, plgg-ir-language, plgg-parser, plgg-view, plgg-flow, plgg-board, plggmatic |
| [plgg-ir-language](/packages/plgg-ir-language/) | plgg, plgg-ir-syntax |
| [plgg-ir-manifest](/packages/plgg-ir-manifest/) | plgg, plgg-ir-syntax, plgg-ir-language |
| [plgg-ir-syntax](/packages/plgg-ir-syntax/) | plgg, plgg-parser |
| [plgg-ir-thesis](/packages/plgg-ir-thesis/) | plgg, plgg-ir-syntax, plgg-ir-language |
| [plgg-ir-thesis-proof](/packages/plgg-ir-thesis-proof/) | plgg, plgg-ir-syntax, plgg-ir-language, plgg-ir-thesis |
| [plgg-kit](/packages/plgg-kit/) | plgg |
| [plgg-mcp](/packages/plgg-mcp/) | plgg |
| [plgg-md](/packages/plgg-md/) | plgg, plgg-parser, plgg-view |
| [plgg-parser](/packages/plgg-parser/) | plgg |
| [plgg-router](/packages/plgg-router/) | plgg |
| [plgg-server](/packages/plgg-server/) | plgg, plgg-http, plgg-view |
| [plgg-sql](/packages/plgg-sql/) | plgg |
| [plgg-test](/packages/plgg-test/) | plgg |
| [plgg-token-metering](/packages/plgg-token-metering/) | plgg |
| [plgg-view](/packages/plgg-view/) | plgg |
| [plggmatic](/packages/plggmatic/) | plgg, plgg-ir-language, plgg-ir-manifest, plgg-ir-syntax, plgg-view |
| [plggmatic-example](/packages/plggmatic-example/) | plgg, plgg-view, plggmatic |
| [plggpress](/packages/plggpress/) | plgg, plgg-kit, plggmatic, plgg-http, plgg-server, plgg-view, plgg-md, plgg-highlight, plgg-cli, plgg-bundle, plgg-ir-diagram |

See [package boundaries](/design/family/) for dependency direction and [Build a bookshelf](/tutorial/) for an end-to-end application.
