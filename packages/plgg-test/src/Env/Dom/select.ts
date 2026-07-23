/**
 * A deliberately small CSS-selector engine — exactly the shapes plgg's specs
 * use: tag, `.class` (repeated), `[attr]` / `[attr=value]` (quotes optional),
 * compounds, and the descendant (whitespace) combinator. No `>`, `+`, `~`,
 * `:pseudo`, `#id`, `*`, or attribute operators beyond `=`. It walks the
 * element subtree in document order; anything outside this grammar is a
 * deliberate non-feature, not a silent mismatch.
 */

/** The structural element surface the matcher reads (node.ts satisfies it). */
export type SelectNode = Readonly<{
  tagName: string;
  getAttribute: (name: string) => string | null;
}>;

type AttrTest = Readonly<{
  name: string;
  value: string | undefined;
}>;

type Compound = Readonly<{
  tag: string | undefined;
  classes: ReadonlyArray<string>;
  attrs: ReadonlyArray<AttrTest>;
}>;

// Splits a compound like `li.todo[type=checkbox]` into its tag, classes, and
// attribute tests. A leading name is the tag; `.x` adds a class; `[…]` an attr.
const parseCompound = (
  source: string,
): Compound => {
  const tagMatch = /^[a-zA-Z][\w-]*/.exec(source);
  const tag =
    tagMatch === null ? undefined : tagMatch[0];
  const classes: Array<string> = [];
  const classRe = /\.([\w-]+)/g;
  let cm = classRe.exec(source);
  while (cm !== null) {
    const name = cm[1];
    if (name !== undefined) {
      classes.push(name);
    }
    cm = classRe.exec(source);
  }
  const attrs: Array<AttrTest> = [];
  const attrRe =
    /\[([\w-]+)(?:=("[^"]*"|'[^']*'|[^\]]*))?\]/g;
  let am = attrRe.exec(source);
  while (am !== null) {
    const name = am[1];
    if (name !== undefined) {
      attrs.push({
        name,
        value: unquote(am[2]),
      });
    }
    am = attrRe.exec(source);
  }
  return { tag, classes, attrs };
};

const unquote = (
  raw: string | undefined,
): string | undefined =>
  raw === undefined
    ? undefined
    : (raw.startsWith('"') &&
          raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
      ? raw.slice(1, -1)
      : raw;

// A selector is a whitespace-separated list of compounds (descendant combinator).
const parseSelector = (
  selector: string,
): ReadonlyArray<Compound> =>
  selector
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map(parseCompound);

const classesOf = (
  node: SelectNode,
): ReadonlyArray<string> =>
  (node.getAttribute("class") ?? "")
    .split(/\s+/)
    .filter((c) => c.length > 0);

const matchesCompound = (
  node: SelectNode,
  compound: Compound,
): boolean => {
  if (
    compound.tag !== undefined &&
    node.tagName.toLowerCase() !==
      compound.tag.toLowerCase()
  ) {
    return false;
  }
  const have = classesOf(node);
  if (
    !compound.classes.every((c) =>
      have.includes(c),
    )
  ) {
    return false;
  }
  return compound.attrs.every((test) =>
    test.value === undefined
      ? node.getAttribute(test.name) !== null
      : node.getAttribute(test.name) ===
        test.value,
  );
};

// Whether `chain` (root's descendants down to the candidate, inclusive)
// satisfies the compound list: the last compound matches the candidate, the
// earlier ones match ancestors in order (descendant combinator).
const matchesChain = (
  chain: ReadonlyArray<SelectNode>,
  compounds: ReadonlyArray<Compound>,
): boolean => {
  const last = compounds[compounds.length - 1];
  const candidate = chain[chain.length - 1];
  if (
    last === undefined ||
    candidate === undefined ||
    !matchesCompound(candidate, last)
  ) {
    return false;
  }
  let ci = compounds.length - 2;
  for (
    let i = chain.length - 2;
    i >= 0 && ci >= 0;
    i = i - 1
  ) {
    const node = chain[i];
    const compound = compounds[ci];
    if (
      node !== undefined &&
      compound !== undefined &&
      matchesCompound(node, compound)
    ) {
      ci = ci - 1;
    }
  }
  return ci < 0;
};

/**
 * Every descendant element of `root` matching `selector`, document order.
 * Generic over the concrete element type `T` (with `childrenOf` supplying its
 * element children) so a caller gets its own node type back, not a widened
 * `SelectNode` — no cast at the call site.
 */
export const queryAll = <T extends SelectNode>(
  root: T,
  selector: string,
  childrenOf: (node: T) => ReadonlyArray<T>,
): ReadonlyArray<T> => {
  const compounds = parseSelector(selector);
  if (compounds.length === 0) {
    return [];
  }
  const out: Array<T> = [];
  const walk = (
    node: T,
    chain: ReadonlyArray<T>,
  ): void =>
    childrenOf(node).forEach((child) => {
      const next = [...chain, child];
      if (matchesChain(next, compounds)) {
        out.push(child);
      }
      walk(child, next);
    });
  walk(root, []);
  return out;
};

/** The first descendant element matching `selector`, or `null`. */
export const queryOne = <T extends SelectNode>(
  root: T,
  selector: string,
  childrenOf: (node: T) => ReadonlyArray<T>,
): T | null =>
  queryAll(root, selector, childrenOf)[0] ?? null;
