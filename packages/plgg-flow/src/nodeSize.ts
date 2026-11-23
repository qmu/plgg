type Card = {
  label: string;
  width?: number;
  height?: number;
};
const fullWidth =
  /[\p{Script=Han}\p{Script=Hangul}\p{Script=Katakana}\p{Script=Hiragana}\u3000-\u30ff\uff01-\uff60\uffe0-\uffe6]/u;
export const nodeSize = (node: Card) => {
  let text = 0;
  if (node.width === undefined)
    for (const ch of node.label)
      text += fullWidth.test(ch) ? 13 : 7.5;
  return {
    width:
      node.width ??
      Math.max(
        64,
        8 * Math.ceil((text + 32) / 8),
      ),
    height: node.height ?? 36,
  };
};
