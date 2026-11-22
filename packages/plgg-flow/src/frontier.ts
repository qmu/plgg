type Ranked = Readonly<{ priority: number }>;
export const push = <T extends Ranked>(
  heap: T[],
  item: T,
) => {
  let i = heap.length;
  heap.push(item);
  while (i > 0) {
    const j = Math.floor((i - 1) / 2),
      p = heap[j];
    if (!p || p.priority <= item.priority) break;
    heap[i] = p;
    i = j;
  }
  heap[i] = item;
};
export const pop = <T extends Ranked>(
  heap: T[],
) => {
  const first = heap[0],
    last = heap.pop();
  if (!last || !heap.length) return first;
  let i = 0;
  while (i * 2 + 1 < heap.length) {
    let j = i * 2 + 1;
    const right = heap[j + 1];
    if (
      right &&
      right.priority <
        (heap[j]?.priority ?? Infinity)
    )
      j++;
    const next = heap[j];
    if (!next || next.priority >= last.priority)
      break;
    heap[i] = next;
    i = j;
  }
  heap[i] = last;
  return first;
};
