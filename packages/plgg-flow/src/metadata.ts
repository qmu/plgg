import { ok, err, type Result } from "plgg";
import type { Graph } from "./model";
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | JsonObject;
export type JsonObject = Readonly<{
  [key: string]: JsonValue;
}>;
/** Plain JSON values only. Depth is bounded before traversal or serialization. */
const valid = (
  v: unknown,
  depth: number,
): v is JsonValue => {
  if (depth > 64) return false;
  if (
    v === null ||
    typeof v === "string" ||
    typeof v === "boolean"
  )
    return true;
  if (typeof v === "number")
    return Number.isFinite(v);
  if (Array.isArray(v))
    return v.every((item) =>
      valid(item, depth + 1),
    );
  if (
    typeof v !== "object" ||
    (Object.getPrototypeOf(v) !==
      Object.prototype &&
      Object.getPrototypeOf(v) !== null)
  )
    return false;
  return Object.values(v).every((item) =>
    valid(item, depth + 1),
  );
};
export const isJsonObject = (
  v: unknown,
): v is JsonObject =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  valid(v, 0);

/** Match supplied object fields recursively. Arrays retain order and length. */
export const matchesData = (
  data: JsonValue | undefined,
  pattern: JsonValue,
): boolean => {
  if (
    pattern === null ||
    typeof pattern !== "object"
  )
    return data === pattern;
  if (Array.isArray(pattern))
    return (
      Array.isArray(data) &&
      pattern.length === data.length &&
      pattern.every((item, i) =>
        matchesData(data[i], item),
      )
    );
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  )
    return false;
  return Object.entries(pattern).every(
    ([key, value]) =>
      Object.prototype.hasOwnProperty.call(
        data,
        key,
      ) &&
      matchesData(Reflect.get(data, key), value),
  );
};

/** Validate required application fields per node type, using only declarative
 * JSON type names. Fields not mentioned in the rules remain unrestricted. */
export const auditNodeData = (
  graph: Graph,
  rules: unknown,
): Result<readonly string[], string> => {
  if (!isJsonObject(rules))
    return err(
      "型別の項目定義を JSON オブジェクトで指定してください",
    );
  const compiled = new Map<
    string,
    Map<string, string>
  >();
  const kinds = new Set([
    "string",
    "number",
    "boolean",
    "array",
    "object",
    "null",
  ]);
  for (const [type, fields] of Object.entries(
    rules,
  )) {
    if (!isJsonObject(fields))
      return err(type + " の項目定義が不正です");
    const required = new Map<string, string>();
    for (const [key, kind] of Object.entries(
      fields,
    )) {
      if (
        typeof kind !== "string" ||
        !kinds.has(kind)
      )
        return err(
          type +
            "." +
            key +
            " の型指定が不正です",
        );
      required.set(key, kind);
    }
    compiled.set(type, required);
  }
  const findings: string[] = [];
  for (const n of graph.nodes) {
    const fields = compiled.get(
      n.type ?? (n.group ? "group" : "default"),
    );
    if (!fields) continue;
    for (const [key, kind] of fields) {
      if (
        !n.data ||
        !Object.prototype.hasOwnProperty.call(
          n.data,
          key,
        )
      ) {
        findings.push(
          n.id + " · " + key + " がありません",
        );
        continue;
      }
      const value = n.data[key],
        actual =
          value === null
            ? "null"
            : Array.isArray(value)
              ? "array"
              : typeof value;
      if (actual !== kind)
        findings.push(
          n.id +
            " · " +
            key +
            " は " +
            actual +
            "（必要：" +
            kind +
            "）",
        );
    }
  }
  return ok(findings);
};

/** Align explicitly stored fields in selection order. A missing field is
 * represented by undefined, distinct from every JSON value. */
export const compareCardData = (
  graph: Graph,
  selection: readonly string[],
) => {
  const byId = new Map(
    graph.nodes.map((n) => [n.id, n]),
  );
  const cards = [...new Set(selection)].flatMap(
    (id) => {
      const n = byId.get(id);
      return n ? [n] : [];
    },
  );
  const keys = new Set(
    cards.flatMap((n) =>
      Object.keys(n.data ?? {}),
    ),
  );
  const rows = [...keys].sort().map((key) => {
    const values = cards.map((n) =>
      Object.prototype.hasOwnProperty.call(
        n.data ?? {},
        key,
      )
        ? n.data?.[key]
        : undefined,
    );
    const first = values[0];
    const same = values.every(
      (v) =>
        v === first ||
        (v !== undefined &&
          first !== undefined &&
          matchesData(v, first) &&
          matchesData(first, v)),
    );
    return { key, values, same };
  });
  return { ids: cards.map((n) => n.id), rows };
};
