import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  externalVar,
  externalKey,
  externalEntry,
} from "plgg-bundle/domain/usecase/externalsTable";
import { emitEsmBundle } from "plgg-bundle/domain/usecase/emitBundle";
import { type Graph } from "plgg-bundle/domain/usecase/collectModules";

// The contract's exact shape, pinned. If the emitted
// table shape ever changes, these literals must change
// with it in the same edit — the point of the contract is
// that the shape lives here and nowhere else, so a drift
// that would silently break flatten-time key rewriting
// fails THIS test instead of a downstream app bundle.
test("externalVar/externalKey/externalEntry pin the emitted shape", () =>
  all([
    check(externalVar(0), toBe("__ext0")),
    check(externalVar(3), toBe("__ext3")),
    check(externalKey("plgg"), toBe('"plgg": __ext')),
    check(
      externalEntry("plgg", 0),
      toBe('"plgg": __ext0'),
    ),
    check(
      externalEntry("node:fs", 2),
      toBe('"node:fs": __ext2'),
    ),
  ]));

// The rewrite unit (externalKey) must be a prefix of the
// full entry, so splitting on it inside collectModules'
// replaceExternalKey lands exactly on a table entry.
test("externalKey is the prefix externalEntry begins with", () =>
  all([
    check(
      externalEntry("plgg", 5).startsWith(
        externalKey("plgg"),
      ),
      toBe(true),
    ),
    check(
      externalEntry("plgg", 5).slice(
        externalKey("plgg").length,
      ),
      toBe("5"),
    ),
  ]));

// A graph whose entry keeps one external require, so the
// emitter writes a real `__externals` table.
const externalGraph: Graph = {
  entryId: "index.ts",
  modules: [
    {
      id: "index.ts",
      code: 'exports.read = require("plgg").read;',
      externals: ["plgg"],
    },
  ],
};

// The emitter and the rewrite agree: what emitEsmBundle
// writes for an external contains the exact key binding
// the flatten-time rewrite searches for. If the table
// shape drifted away from externalKey, this catches it —
// the rewrite would then miss and fall into the runtime
// dynamic-import fallback.
test("emit output contains the rewrite's key binding", () =>
  all([
    check(
      emitEsmBundle(externalGraph, [
        "read",
      ]).includes(externalKey("plgg")),
      toBe(true),
    ),
    check(
      emitEsmBundle(externalGraph, [
        "read",
      ]).includes(externalEntry("plgg", 0)),
      toBe(true),
    ),
  ]));
