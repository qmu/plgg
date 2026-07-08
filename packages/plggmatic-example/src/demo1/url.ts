import {
  type SoftStr,
  type Option,
  some,
  none,
  matchOption,
  fromNullable,
} from "plgg";
import { type Url } from "plgg-view/client";
import { type SearchableSection } from "./store.ts";
import {
  singularOf,
  scheduled,
} from "./sections.ts";
import {
  type Model,
  type SearchForm,
  emptySearchForm,
} from "./model.ts";

export const searchString = (
  params: URLSearchParams,
): SoftStr => {
  const s = params.toString();
  return s === "" ? "" : `?${s}`;
};

export const searchableSectionOf = (
  value: SoftStr,
): Option<SearchableSection> => {
  switch (value) {
    case "clients":
      return some("clients");
    case "projects":
      return some("projects");
    default:
      return none();
  }
};

export const sectionOfUrl = (
  url: Url,
): Option<SearchableSection> =>
  matchOption<SoftStr, Option<SearchableSection>>(
    () => none(),
    searchableSectionOf,
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
      section: SearchableSection;
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
export const addSectionOf = (
  url: Url,
): Option<SearchableSection> =>
  matchOption<SoftStr, Option<SearchableSection>>(
    () => none(),
    (singular: SoftStr) => {
      switch (singular) {
        case "client":
          return some("clients");
        case "project":
          return some("projects");
        default:
          return none();
      }
    },
  )(
    fromNullable(
      new URLSearchParams(url.search).get("add"),
    ),
  );

export const isAddUrl = (
  section: SearchableSection,
  url: Url,
): boolean =>
  matchOption<SearchableSection, boolean>(
    () => false,
    (s: SearchableSection) => s === section,
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
        singularOf(layer.section),
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

export const resultHref = (
  url: Url,
  id: SoftStr,
): SoftStr => {
  const params = new URLSearchParams(url.search);
  params.delete("add");
  params.delete("q");
  params.set("p", id);
  return `${url.path}${searchString(params)}`;
};

export const hrefOf = (url: Url): SoftStr =>
  `${url.path}${url.search}`;
export const activeAdd = (
  section: SearchableSection,
  model: Model,
): boolean => {
  switch (section) {
    case "clients":
      return model.clientForm.open;
    case "projects":
      return model.projectForm.open;
  }
};

// The model's independent add/search/submitted flags
// collapse to the single app overlay the URL can hold, with
// add taking precedence over search.
export const appLayerOf = (
  model: Model,
  section: SearchableSection,
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

export const currentUrl = (model: Model): Url => {
  const base = scheduled.toUrl(model.scheduled);
  return matchOption<SearchableSection, Url>(
    () => printAppLayer(base, { kind: "menu" }),
    (section: SearchableSection) =>
      printAppLayer(
        base,
        appLayerOf(model, section),
      ),
  )(sectionOfUrl(base));
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
