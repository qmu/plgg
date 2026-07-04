import { type SoftStr } from "plgg";
import {
  type Html,
  type Flow,
  type Phrasing,
  type Attribute,
  h1,
  h2,
  h3,
  h4,
  div,
  text,
} from "plgg-view";
import {
  type FontSize,
  style_,
  textColor,
  text as fontSize,
  weight,
  maxW,
} from "plggmatic/styleEntry";

/**
 * A heading level. A closed union so a level maps to a
 * real `h1`–`h4` element (and its font token) — an
 * invalid level cannot be requested.
 */
export type HeadingLevel = 1 | 2 | 3 | 4;

// Each level's semantic element builder. A closed switch
// (no `default`) keeps it exhaustive: a new level is a
// compile error until it has an element.
const levelEl = (
  level: HeadingLevel,
): (<Msg>(
  attributes: ReadonlyArray<Attribute<Msg>>,
  children: ReadonlyArray<Phrasing<Msg>>,
) => Html<Msg>) => {
  switch (level) {
    case 1:
      return h1;
    case 2:
      return h2;
    case 3:
      return h3;
    case 4:
      return h4;
  }
};

// Visual size follows the font-size token scale, largest
// at the top level. Exhaustive over the level union.
const LEVEL_SIZE: Record<HeadingLevel, FontSize> =
  {
    1: "2xl",
    2: "xl",
    3: "lg",
    4: "base",
  };

/**
 * The heading component. **Recorded rule**: the heading
 * `level` is a semantic prop that maps 1:1 to a real
 * `h1`–`h4` element, and the visual size is drawn from
 * the font-size token scale by that same level — so the
 * document outline and the type scale never drift apart
 * (no "looks like an h2 but is a div"). Themed `text`
 * ink.
 */
export const heading = (
  level: HeadingLevel,
  content: SoftStr,
): Html<never> =>
  levelEl(level)(
    [
      style_(
        fontSize(LEVEL_SIZE[level]),
        weight(600),
        textColor("text"),
      ),
    ],
    [text(content)],
  );

/**
 * The prose component. **Recorded rule**: prose is a
 * typographic container that establishes the reading
 * baseline once — themed body ink and a capped readable
 * measure (48rem, i.e. 192 spacing units) — for
 * arbitrary flow content; per-element prose rules (link
 * underline weight, code badges, list rhythm) are added
 * one at a time as real documents demand them, not
 * pre-built here (emergent design system).
 */
export const prose = <Msg>(
  body: ReadonlyArray<Flow<Msg>>,
): Html<Msg, "div"> =>
  div(
    [
      style_(
        textColor("text"),
        fontSize("base"),
        maxW(192),
      ),
    ],
    body,
  );
