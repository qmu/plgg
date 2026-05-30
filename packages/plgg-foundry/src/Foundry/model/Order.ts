import {
  Str,
  Obj,
  Bin,
  Vec,
  asStr,
  cast,
  forProp,
  asReadonlyArray,
  asBin,
} from "plgg";

/**
 * User request containing text and optional file attachments.
 */
export type Order = Obj<{
  text: Str;
  files: Vec<Bin>;
}>;

export type OrderSpec = Obj<{
  text: string;
  files?: Vec<Uint8Array>;
}>;

/**
 * Validates and casts an OrderSpec to Order with default empty files array.
 */
export const asOrder = ({
  text,
  files = [],
}: OrderSpec) =>
  cast(
    { text, files },
    forProp("text", asStr),
    forProp("files", asReadonlyArray(asBin)),
  );

/**
 * Generates human-readable description of order including file count.
 */
export const explainOrder = (
  order: Order,
): string => {
  const fileCount = order.files.length;
  const text = order.text.content;

  if (fileCount === 0) {
    return text;
  }

  const fileText =
    fileCount === 1
      ? "1 file"
      : `${fileCount} files`;
  return `${text}\n\n(${fileText} attached)`;
};
