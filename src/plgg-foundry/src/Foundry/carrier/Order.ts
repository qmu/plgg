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
 * User request containing prompt and optional file attachments.
 */
export type Order = Obj<{
  prompt: Str;
  files: Vec<Bin>;
}>;

export type OrderSpec = Obj<{
  prompt: string;
  files?: Vec<Uint8Array>;
}>;

/**
 * Validates and casts an OrderSpec to Order with default empty files array.
 */
export const asOrder = ({
  prompt,
  files = [],
}: OrderSpec) =>
  cast(
    { prompt, files },
    forProp("prompt", asStr),
    forProp("files", asReadonlyArray(asBin)),
  );

/**
 * Generates human-readable description of order including file count.
 */
export const explainOrder = (
  order: Order,
): string => {
  const fileCount = order.files.length;
  const promptText = order.prompt.content;

  if (fileCount === 0) {
    return promptText;
  }

  const fileText =
    fileCount === 1
      ? "1 file"
      : `${fileCount} files`;
  return `${promptText}\n\n(${fileText} attached)`;
};
