import {
  type SoftStr,
  type Option,
  none,
  matchOption,
  fromNullable,
} from "plgg";
import { type Url } from "plgg-view/client";
import {
  type SectionId,
  defOf,
  sectionIdOf,
  sectionOfSingular,
} from "./catalog.ts";
import { scheduled } from "./sections.ts";
import {
  type Model,
  type SearchForm,
  type TrailStep,
  emptySearchForm,
} from "./model.ts";

export const searchString = (
  params: URLSearchParams,
): SoftStr => {
  const s = params.toString();
  return s === "" ? "" : `?${s}`;
};

export const sectionOfUrl = (
  url: Url,
): Option<SectionId> =>
  matchOption<SoftStr, Option<SectionId>>(
    () => none(),
    sectionIdOf,
  )(
    fromNullable(
      new URLSearchParams(url.search).get("c"),
    ),
  );
// === URL codec ===
// The scheduler owns `c` (section) and `p` (selection); the
// app owns an overlay of `add`/`search`/`submitted`/`kw`/
// `st` printed on top. Every raw param key is confined to
// this cluster — the rest of the app speaks in typed stages
// (`AppLayer`), never param strings.

// The app-owned overlay as a typed stage, layered on the
// scheduler's base URL. `menu` carries no app params (the
// list/detail/stub view); `add` opens a register form;
// `searchOpen`/`searchSubmitted` are the two search stages.
export type AppLayer =
  | Readonly<{ kind: "menu" }>
  | Readonly<{
      kind: "add";
      section: SectionId;
    }>
  | Readonly<{ kind: "searchOpen" }>
  | Readonly<{
      kind: "searchSubmitted";
      keyword: SoftStr;
      status: SoftStr;
    }>;

export const paramOr = (
  params: URLSearchParams,
  name: SoftStr,
  fallback: SoftStr,
): SoftStr =>
  matchOption<SoftStr, SoftStr>(
    () => fallback,
    (value: SoftStr) => value,
  )(fromNullable(params.get(name)));

// Which section, if any, an `add=<singular>` param names.
// The param takes the SINGULAR (`?c=clients&add=client`), so
// the lookup is over the catalog's `singular`, not its id.
export const addSectionOf = (
  url: Url,
): Option<SectionId> =>
  matchOption<SoftStr, Option<SectionId>>(
    () => none(),
    sectionOfSingular,
  )(
    fromNullable(
      new URLSearchParams(url.search).get("add"),
    ),
  );

export const isAddUrl = (
  section: SectionId,
  url: Url,
): boolean =>
  matchOption<SectionId, boolean>(
    () => false,
    (s: SectionId) => s === section,
  )(addSectionOf(url));

export const searchFormFromUrl = (
  url: Url,
): SearchForm => {
  const params = new URLSearchParams(url.search);
  return emptySearchForm(
    params.get("search") === "1",
    params.get("submitted") === "1",
    paramOr(params, "kw", ""),
    paramOr(params, "st", "Any"),
  );
};

// Print an app overlay onto a base URL, preserving the
// scheduler's `c`/`p` and their order; app params are
// re-issued in a fixed order so links round-trip byte for
// byte. Stripping first then setting matches how the old
// per-stage helpers layered params.
export const printAppLayer = (
  base: Url,
  layer: AppLayer,
): Url => {
  const params = new URLSearchParams(base.search);
  params.delete("add");
  params.delete("search");
  params.delete("submitted");
  params.delete("kw");
  params.delete("st");
  const finish = (): Url => ({
    path: base.path,
    search: searchString(params),
  });
  switch (layer.kind) {
    case "menu":
      return finish();
    case "add":
      params.set(
        "add",
        defOf(layer.section).singular,
      );
      return finish();
    case "searchOpen":
      params.set("search", "1");
      return finish();
    case "searchSubmitted":
      params.set("search", "1");
      params.set("submitted", "1");
      params.set("kw", layer.keyword);
      params.set("st", layer.status);
      return finish();
  }
};

// Drop the scheduler's selection (`p`) so an app column
// opens fresh — a form/search is never a 4th column beside
// a selected detail.
export const dropSelection = (url: Url): Url => {
  const params = new URLSearchParams(url.search);
  params.delete("p");
  return {
    path: url.path,
    search: searchString(params),
  };
};

// === Collapsing the strip ===
// The columns stand in a fixed order, and each is MADE by
// the params named here — so a column's position in this
// list is also its position on screen.
//
// That gives the strip its one navigation rule: **a link
// collapses the strip back to its own column.** Clicking a
// column's header title makes that column the right-most
// one; opening Search from the section menu cannot leave a
// detail from the previous search standing three columns to
// the right. Both are the same operation — drop every param
// a column FURTHER RIGHT owns — which is what `collapseTo`
// is, and why no caller hand-picks param names.
//
// Adding a column means adding its stage here, in position.
// `Stage` is closed and `OWNED` is keyed by it, so a new
// stage cannot be added without saying what makes it; the
// ORDER, though, is this list — keep it left to right.
export type Stage =
  | "section"
  | "add"
  | "search"
  | "results"
  | "detail"
  | "trail";

const ORDER: ReadonlyArray<Stage> = [
  "section",
  "add",
  "search",
  "results",
  "detail",
  "trail",
];

const OWNED: Record<
  Stage,
  ReadonlyArray<SoftStr>
> = {
  section: ["c"],
  add: ["add"],
  search: ["search"],
  results: ["submitted", "kw", "st"],
  detail: ["p"],
  trail: ["trail"],
};

/**
 * The url with every column RIGHT of `stage` dropped —
 * `stage` itself, and everything left of it, survive
 * untouched.
 */
export const collapseTo = (
  url: Url,
  stage: Stage,
): Url => {
  const params = new URLSearchParams(url.search);
  ORDER.slice(ORDER.indexOf(stage) + 1).forEach(
    (right: Stage) =>
      OWNED[right].forEach((name: SoftStr) =>
        params.delete(name),
      ),
  );
  return {
    path: url.path,
    search: searchString(params),
  };
};

// Selecting a result opens ITS detail: collapse to the
// results column first, so the previous selection's detail
// and the whole trail it grew do not survive beside a
// record they no longer describe.
export const resultHref = (
  url: Url,
  id: SoftStr,
): SoftStr => {
  const params = new URLSearchParams(
    collapseTo(url, "results").search,
  );
  params.set("p", id);
  return `${url.path}${searchString(params)}`;
};

export const hrefOf = (url: Url): SoftStr =>
  `${url.path}${url.search}`;

export const activeAdd = (
  section: SectionId,
  model: Model,
): boolean => model.forms[section].open;

// The model's independent add/search/submitted flags
// collapse to the single app overlay the URL can hold, with
// add taking precedence over search.
export const appLayerOf = (
  model: Model,
  section: SectionId,
): AppLayer =>
  activeAdd(section, model)
    ? { kind: "add", section }
    : model.search.open
      ? model.search.submitted
        ? {
            kind: "searchSubmitted",
            keyword: model.search.keyword,
            status: model.search.status,
          }
        : { kind: "searchOpen" }
      : { kind: "menu" };

// Reflect the Model's recursion trail onto a URL's search.
const withTrailOnUrl = (
  url: Url,
  steps: ReadonlyArray<TrailStep>,
): Url => {
  const params = new URLSearchParams(url.search);
  if (steps.length === 0) params.delete("trail");
  else params.set("trail", printTrail(steps));
  return {
    path: url.path,
    search: searchString(params),
  };
};

export const currentUrl = (model: Model): Url => {
  const base = scheduled.toUrl(model.scheduled);
  const layered = matchOption<SectionId, Url>(
    () => printAppLayer(base, { kind: "menu" }),
    (section: SectionId) =>
      printAppLayer(
        base,
        appLayerOf(model, section),
      ),
  )(sectionOfUrl(base));
  return withTrailOnUrl(layered, model.trail);
};

export const hasSelection = (url: Url): boolean =>
  matchOption<SoftStr, boolean>(
    () => false,
    () => true,
  )(
    fromNullable(
      new URLSearchParams(url.search).get("p"),
    ),
  );

export const selectedId = (
  url: Url,
): Option<SoftStr> =>
  fromNullable(
    new URLSearchParams(url.search).get("p"),
  );

// === The recursion trail ===
// A URL-carried STACK of cross-reference hops appended after
// the base view: `trail=<step>.<step>.…`, where a step NAMES
// the section it is about:
//
//   d_<section>_<id>           a record's detail
//   l_<section>_<field>_<id>   the records of <section> whose
//                              <field> names record <id>
//
// The hops used to be three hard-coded letters — `l` (a
// client's projects), `p` (a project detail), `c` (a client
// detail) — which is a vocabulary that only two sections can
// have, and `stepColumn` switched on them to pick a renderer.
// A step now carries its section, so one renderer serves all
// of them and a seventh section costs no new letter.
//
// `_` separates a step's parts and `.` separates steps:
// neither is produced by `slugId` (which maps every non-
// alphanumeric to `-`), and both survive
// `URLSearchParams.toString()` unescaped, so the trail stays
// readable in the address bar.
// ({@link TrailStep} lives in `model.ts`.)

const printStep = (step: TrailStep): SoftStr => {
  switch (step.kind) {
    case "detail":
      return `d_${step.section}_${step.id}`;
    case "refList":
      return `l_${step.section}_${step.field}_${step.id}`;
  }
};

const parseStep = (
  seg: SoftStr,
): ReadonlyArray<TrailStep> => {
  const parts = seg.split("_");
  const tag = parts[0];
  const rawSection = parts[1];
  if (rawSection === undefined) return [];
  return matchOption<
    SectionId,
    ReadonlyArray<TrailStep>
  >(
    () => [],
    (section: SectionId) => {
      const detailId = parts[2];
      const field = parts[2];
      const listId = parts[3];
      if (
        tag === "d" &&
        parts.length === 3 &&
        detailId !== undefined &&
        detailId !== ""
      ) {
        return [
          {
            kind: "detail",
            section,
            id: detailId,
          },
        ];
      }
      if (
        tag === "l" &&
        parts.length === 4 &&
        field !== undefined &&
        field !== "" &&
        listId !== undefined &&
        listId !== ""
      ) {
        return [
          {
            kind: "refList",
            section,
            field,
            id: listId,
          },
        ];
      }
      return [];
    },
  )(sectionIdOf(rawSection));
};

export const trailOf = (
  url: Url,
): ReadonlyArray<TrailStep> => {
  const raw = new URLSearchParams(url.search).get(
    "trail",
  );
  return raw === null || raw === ""
    ? []
    : raw.split(".").flatMap(parseStep);
};

const printTrail = (
  steps: ReadonlyArray<TrailStep>,
): SoftStr => steps.map(printStep).join(".");

// An href with the trail replaced — PRESERVING every other
// column of the current view (the search condition, the
// results, the selection): a recursion hop must grow the
// stack to the right, never drop the columns that led here.
const withTrail = (
  url: Url,
  steps: ReadonlyArray<TrailStep>,
): SoftStr => hrefOf(withTrailOnUrl(url, steps));

// Append one hop to the trail (grows the stack).
export const appendTrail = (
  url: Url,
  step: TrailStep,
): SoftStr =>
  withTrail(url, [...trailOf(url), step]);

/**
 * The url as a column at `depth` hops sees it: the trail cut
 * back to that column. `depth` is how many hops stand at or
 * left of it — 0 is the root detail (no hops), a trail step
 * at index `i` is `i + 1`.
 *
 * This is the whole of a trail column's navigation. Its
 * header title links here (collapse to me), and every hop it
 * offers appends onto here — so drilling from a column part
 * way down the trail REPLACES the hops after it instead of
 * appending past them, and the strip can never hold a column
 * that the one to its left no longer leads to.
 */
export const trailAt = (
  url: Url,
  depth: number,
): Url =>
  withTrailOnUrl(
    url,
    trailOf(url).slice(0, depth),
  );
