#!/usr/bin/env node
// Launcher for the plgg-ir-thesis-proof proof command.
// The built proof entry runs its report on import (its
// main() prints `accept` / counterexample traces to
// stdout), so this launcher just imports the bundled ESM
// entry that `plgg-bundle` emits to dist/prove.es.js.
import "../dist/prove.es.js";
