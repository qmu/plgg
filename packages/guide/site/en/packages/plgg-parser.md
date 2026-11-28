# plgg-parser — Combine small parsers

Combines small rules that may consume only a prefix, leaving the suffix for the next rule. Require end of input at a whole-document boundary. plgg-ir-syntax builds its S-expression reader on this layer.

See [package boundaries](/design/family/) for dependency direction and [Build a bookshelf](/tutorial/) for an end-to-end application.
