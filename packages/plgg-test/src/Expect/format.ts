/**
 * Renders a value for assertion messages. Kept small and dependency
 * free; uses a depth guard so nested plgg `Box` values print without
 * runaway output.
 */
export const formatValue = (
  value: unknown,
): string => render(value, 0);

const MAX_DEPTH = 4;

const render = (
  value: unknown,
  depth: number,
): string =>
  value === null
    ? "null"
    : value === undefined
      ? "undefined"
      : typeof value === "string"
        ? JSON.stringify(value)
        : typeof value === "bigint"
          ? `${value.toString()}n`
          : typeof value === "function"
            ? `[Function ${value.name || "anonymous"}]`
            : typeof value !== "object"
              ? String(value)
              : depth >= MAX_DEPTH
                ? "[…]"
                : renderObject(value, depth);

const renderObject = (
  value: object,
  depth: number,
): string =>
  value instanceof Error
    ? `[${value.name}: ${value.message}]`
    : Array.isArray(value)
      ? `[${value
          .map((v) => render(v, depth + 1))
          .join(", ")}]`
      : `{ ${Object.entries(value)
          .map(
            ([k, v]) =>
              `${k}: ${render(v, depth + 1)}`,
          )
          .join(", ")} }`;
