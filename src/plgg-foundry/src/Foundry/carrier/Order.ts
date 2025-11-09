import {
  Str,
  Obj,
  Bin,
  asStr,
  cast,
  forProp,
  asReadonlyArray,
  asBin,
} from "plgg";

export type Order = Obj<{
  prompt: Str;
  files: ReadonlyArray<Bin>;
}>;

export type OrderSpec = {
  prompt: string;
  files?: ReadonlyArray<Uint8Array>;
};

export const asOrder = ({
  prompt,
  files = [],
}: OrderSpec) =>
  cast(
    { prompt, files },
    forProp("prompt", asStr),
    forProp("files", asReadonlyArray(asBin)),
  );

export const explainOrder = (order: Order): string => {
  const fileCount = order.files.length;
  const promptText = order.prompt.content;

  if (fileCount === 0) {
    return promptText;
  }

  const fileText =
    fileCount === 1 ? "1 file" : `${fileCount} files`;
  return `${promptText}\n\n(${fileText} attached)`;
};
