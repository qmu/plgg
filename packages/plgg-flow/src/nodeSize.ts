export const grid = 16;
export const alignBox = (
  centre: number,
  size: number,
  step = grid,
) =>
  Math.round((centre - size / 2) / step) * step +
  size / 2;
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
        4 * grid,
        grid * Math.ceil((text + 24) / grid),
      ),
    height: node.height ?? 2 * grid,
  };
};

type PositionedCard = Card & {
  position: { x: number; y: number; z: number };
};
export const freePosition = (
  node: PositionedCard,
  occupied: readonly PositionedCard[],
) => {
  const size = nodeSize(node),
    { z } = node.position;
  const x = alignBox(node.position.x, size.width),
    y = alignBox(node.position.y, size.height);
  const boxes = occupied
    .filter((n) => n.position.z === z)
    .map((n) => ({
      ...nodeSize(n),
      ...n.position,
    }));
  let best:
    | { x: number; y: number; z: number }
    | undefined;
  let distance = Infinity;
  for (
    let radius = 0;
    (Math.max(0, radius - 0.5) * grid) ** 2 <=
    distance;
    radius++
  ) {
    for (let dx = -radius; dx <= radius; dx++)
      for (let dy = -radius; dy <= radius; dy++) {
        if (
          Math.max(Math.abs(dx), Math.abs(dy)) !==
          radius
        )
          continue;
        const p = {
          x: x + dx * grid,
          y: y + dy * grid,
          z,
        };
        const d =
          (p.x - node.position.x) ** 2 +
          (p.y - node.position.y) ** 2;
        if (
          d < distance &&
          boxes.every(
            (b) =>
              Math.abs(b.x - p.x) * 2 >=
                b.width + size.width ||
              Math.abs(b.y - p.y) * 2 >=
                b.height + size.height,
          )
        ) {
          best = p;
          distance = d;
        }
      }
  }
  return best ?? { x, y, z };
};
