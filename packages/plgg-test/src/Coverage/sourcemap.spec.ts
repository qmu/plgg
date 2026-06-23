import { test, expect } from "plgg-test/index";
import { generatedToSource } from "plgg-test/Coverage/sourcemap";
import { transpile } from "plgg-test/Resolve/hook";

// Round-trips a real source map produced by the transpiler: each
// generated line should map back to a plausible original line, and the
// set of referenced source lines should cover the code lines.
const extractMappings = (
  output: string,
): string => {
  const marker =
    "sourceMappingURL=data:application/json;base64,";
  const at = output.lastIndexOf(marker);
  const b64 = output
    .slice(at + marker.length)
    .trim();
  const json = JSON.parse(
    Buffer.from(b64, "base64").toString("utf8"),
  );
  return json.mappings;
};

test("decodes empty mappings to empty", () => {
  expect(generatedToSource("").size).toBe(0);
});

test("maps generated lines back to source lines", () => {
  const source = [
    "export const a = (",
    "  n: number,",
    "): number => n + 1;",
    "export const b = 2;",
    "",
  ].join("\n");
  const out = transpile(source, "mod.ts");
  const map = generatedToSource(
    extractMappings(out),
  );
  // Some generated line maps to source line 0 (the first statement).
  const allSource = new Set<number>();
  map.forEach((set) =>
    set.forEach((s) => allSource.add(s)),
  );
  expect(allSource.has(0)).toBe(true);
  // The const `b` on source line 3 is referenced too.
  expect(allSource.has(3)).toBe(true);
});

test("relative source-line deltas accumulate", () => {
  // Two segments on one generated line, second jumping forward by a
  // positive delta. VLQ: field order is [genCol, srcIdx, srcLine,
  // srcCol]. "AAAA" => all zero; "AACA" => srcLine +1.
  const map = generatedToSource("AAAA,AACA");
  const lines = map.get(0);
  expect(lines?.has(0)).toBe(true);
  expect(lines?.has(1)).toBe(true);
});

test("empty lines and short segments are skipped", () => {
  // ";" => empty generated line (skipped). "A" => 1-field segment (no
  // source mapping). The trailing real segment still maps.
  const map = generatedToSource(";A,AAAA");
  expect(map.has(0)).toBe(false);
  expect(map.get(1)?.has(0)).toBe(true);
});

test("negative source-line delta decodes", () => {
  // "AACA" => srcLine +1; next line "AADA" => srcLine -1 back to 0,
  // exercising the VLQ sign branch.
  const map = generatedToSource("AACA;AADA");
  expect(map.get(0)?.has(1)).toBe(true);
  expect(map.get(1)?.has(0)).toBe(true);
});
