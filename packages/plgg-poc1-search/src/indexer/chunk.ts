/**
 * Markdown → heading-scoped chunks, the unit both search
 * arms rank. Mirrors the plgg-cms chunk model (a chunk is
 * a heading path plus its body text) but from scratch and
 * line-based: the corpus is trusted repo Markdown, so a
 * light parse that respects code fences is enough for the
 * PoC's measurement purposes — no markdown AST needed.
 */
import {
  type SoftStr,
  type Option,
  some,
  none,
  matchOption,
  pipe,
} from "plgg";

/** One heading-scoped slice of one source file. */
export type ChunkSeed = Readonly<{
  /** Repo-relative source, e.g. `concepts/option.md`. */
  file: SoftStr;
  /** Heading trail, e.g. `Option > Why not null`. */
  headingPath: SoftStr;
  text: SoftStr;
}>;

type Heading = readonly [number, SoftStr];

type Fold = Readonly<{
  /** Open heading trail as `[level, title]` pairs. */
  stack: ReadonlyArray<Heading>;
  /** Body lines accumulated under the current trail. */
  lines: ReadonlyArray<SoftStr>;
  /** Inside a ``` fence (headings there are code). */
  inFence: boolean;
  out: ReadonlyArray<ChunkSeed>;
}>;

const headingOf = (
  line: SoftStr,
): Option<Heading> => {
  const m = line.match(/^(#{1,6})\s+(.*)$/);
  if (
    m &&
    m[1] !== undefined &&
    m[2] !== undefined
  ) {
    const heading: Heading = [
      m[1].length,
      m[2].trim(),
    ];
    return some(heading);
  }
  return none();
};

const pathOf = (
  file: SoftStr,
  stack: ReadonlyArray<Heading>,
): SoftStr =>
  [
    file,
    ...stack.map(([, title]) => title),
  ].join(" > ");

const flush = (
  file: SoftStr,
  state: Fold,
): ReadonlyArray<ChunkSeed> => {
  const text = state.lines.join("\n").trim();
  return text === ""
    ? state.out
    : [
        ...state.out,
        {
          file,
          headingPath: pathOf(file, state.stack),
          text,
        },
      ];
};

/** Fold one line into the running state. */
const step =
  (file: SoftStr) =>
  (state: Fold, line: SoftStr): Fold =>
    /^\s*```/.test(line)
      ? {
          ...state,
          inFence: !state.inFence,
          lines: [...state.lines, line],
        }
      : pipe(
          state.inFence
            ? none()
            : headingOf(line),
          matchOption(
            (): Fold => ({
              ...state,
              lines: [...state.lines, line],
            }),
            ([level, title]: Heading): Fold => ({
              stack: [
                ...state.stack.filter(
                  ([l]) => l < level,
                ),
                [level, title],
              ],
              lines: [],
              inFence: false,
              out: flush(file, state),
            }),
          ),
        );

/**
 * Split one Markdown document into heading-scoped chunks.
 * A heading closes the running chunk and extends/replaces
 * the trail at its level; fenced code lines are always
 * body. Blank sections produce no chunk.
 */
export const chunkMarkdown = (
  file: SoftStr,
  content: SoftStr,
): ReadonlyArray<ChunkSeed> =>
  flush(
    file,
    content.split("\n").reduce<Fold>(step(file), {
      stack: [],
      lines: [],
      inFence: false,
      out: [],
    }),
  );
