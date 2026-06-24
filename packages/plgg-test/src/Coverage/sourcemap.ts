/**
 * Minimal source-map decoder: maps each GENERATED (output) line to the
 * set of ORIGINAL (source) lines it came from. Coverage needs this
 * because the TS transpile reflows code, so V8's hits (recorded
 * against output) must be attributed back to source lines.
 *
 * Only the `mappings` field + line numbers are needed; columns are
 * ignored (we work at line granularity). Implements the standard
 * base64-VLQ decoding of the Source Map v3 `mappings` string.
 */

const B64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const b64Index = (c: string): number =>
  B64.indexOf(c);

// Decodes the VLQ-encoded segments of a `mappings` string into, per
// generated line, the list of original line numbers referenced. The
// VLQ "source line" field (index 2) is RELATIVE; we accumulate it.
export const generatedToSource = (
  mappings: string,
): ReadonlyMap<number, ReadonlySet<number>> => {
  const lines = mappings.split(";");
  // Running state carried across segments per the spec (fields 1..4
  // are relative). We only track the source-line field.
  const state = { sourceLine: 0 };
  const out = new Map<number, Set<number>>();
  lines.forEach((line, genLine) => {
    if (line.length === 0) {
      return;
    }
    const set = new Set<number>();
    line.split(",").forEach((seg) => {
      if (seg.length === 0) {
        return;
      }
      const fields = decodeVlq(seg);
      // Field layout: [genCol, srcIdx, srcLine, srcCol, (nameIdx)].
      // A segment with only the generated column carries no source
      // mapping.
      if (fields.length >= 3) {
        state.sourceLine =
          state.sourceLine + (fields[2] ?? 0);
        set.add(state.sourceLine);
      }
    });
    if (set.size > 0) {
      out.set(genLine, set);
    }
  });
  return out;
};

const decodeVlq = (
  segment: string,
): ReadonlyArray<number> => {
  const values: Array<number> = [];
  let shift = 0;
  let acc = 0;
  for (const ch of segment) {
    const digit = b64Index(ch);
    if (digit === -1) {
      break;
    }
    const cont = (digit & 0b100000) !== 0;
    acc = acc + ((digit & 0b11111) << shift);
    if (cont) {
      shift = shift + 5;
    } else {
      const negative = (acc & 1) === 1;
      const value = acc >> 1;
      values.push(negative ? -value : value);
      acc = 0;
      shift = 0;
    }
  }
  return values;
};
