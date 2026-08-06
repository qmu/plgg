#!/usr/bin/env node
// Launcher for the plgg-ir-thesis-proof proof command.
// Imports the bundled ESM entry that `plgg-bundle` emits
// to dist/prove.es.js and calls its runProve(), which
// prints `accept` / counterexample traces to stdout. The
// entry runs nothing on import, so the build never prints.
import { runProve } from "../dist/prove.es.js";

runProve();
