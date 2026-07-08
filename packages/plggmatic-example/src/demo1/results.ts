import {
  type SoftStr,
  some,
  none,
  matchOption,
} from "plgg";
import {
  type Html,
  slot,
  span,
  a,
  href,
  ul,
  li,
  text,
  attr,
} from "plgg-view";
import { type Url } from "plgg-view/client";
import {
  formView,
  textInput,
  selectInput,
} from "plggmatic";
import {
  type SearchableSection,
  type Client,
  type Project,
  allClients,
  allProjects,
} from "./store.ts";
import {
  type Model,
  type Msg,
  type SearchForm,
} from "./model.ts";
import {
  currentUrl,
  sectionOfUrl,
  hasSelection,
  hrefOf,
  printAppLayer,
  dropSelection,
  resultHref,
  selectedId,
} from "./url.ts";
import { statusesOf } from "./sections.ts";
import {
  type AppColumn,
  addFormColumn,
} from "./columns.ts";

export const searchStatusOptions = (
  section: SearchableSection,
) => [
  { value: "Any", label: "Any" },
  ...statusesOf(section).map((status) => ({
    value: status,
    label: status,
  })),
];

export const searchConditionColumn = (
  model: Model,
): ReadonlyArray<AppColumn> => {
  const url = currentUrl(model);
  return matchOption<
    SearchableSection,
    ReadonlyArray<AppColumn>
  >(
    () => [],
    (section: SearchableSection) =>
      model.search.open && !hasSelection(url)
        ? [
            {
              key: `${section}-search-condition`,
              title: "Search Condition",
              close: some(
                hrefOf(
                  printAppLayer(url, {
                    kind: "menu",
                  }),
                ),
              ),
              body: [
                slot(
                  [
                    attr(
                      "class",
                      "bo-search-condition",
                    ),
                  ],
                  [
                    formView<Msg>({
                      fields: [
                        textInput<Msg>({
                          name: "keyword",
                          label: "Keyword",
                          value:
                            model.search
                              .keywordDraft,
                          placeholder:
                            some("Keyword"),
                          error: none(),
                          disabled: false,
                          onInput: (
                            value: SoftStr,
                          ) => ({
                            kind: "searchKeywordInput",
                            value,
                          }),
                        }),
                        selectInput<Msg>({
                          name: "status",
                          label: "Status",
                          value:
                            model.search
                              .statusDraft,
                          options:
                            searchStatusOptions(
                              section,
                            ),
                          error: none(),
                          disabled: false,
                          onChange: (
                            value: SoftStr,
                          ) => ({
                            kind: "searchStatusInput",
                            value,
                          }),
                        }),
                      ],
                      submitLabel: "Search",
                      submitting: false,
                      onSubmit: {
                        kind: "searchFormSubmit",
                      },
                    }),
                  ],
                ),
              ],
            },
          ]
        : [],
  )(sectionOfUrl(url));
};

export type SearchResult = Readonly<{
  id: SoftStr;
  label: SoftStr;
  status: SoftStr;
  secondary: SoftStr;
}>;

export const searchRows = (
  section: SearchableSection,
): ReadonlyArray<SearchResult> => {
  switch (section) {
    case "clients":
      return allClients().map(
        (client: Client) => ({
          id: client.id,
          label: client.name,
          status: client.status,
          secondary: `${client.status} · ${client.contact}`,
        }),
      );
    case "projects":
      return allProjects().map(
        (project: Project) => ({
          id: project.id,
          label: project.name,
          status: project.status,
          secondary: `${project.status} · ${project.client}`,
        }),
      );
  }
};

export const filteredResults = (
  section: SearchableSection,
  form: SearchForm,
): ReadonlyArray<SearchResult> => {
  const keyword = form.keyword
    .trim()
    .toLowerCase();
  return searchRows(section).filter(
    (row: SearchResult) =>
      (keyword === "" ||
        row.label
          .toLowerCase()
          .includes(keyword)) &&
      (form.status === "Any" ||
        row.status === form.status),
  );
};

export const resultsList = (
  rows: ReadonlyArray<SearchResult>,
  url: Url,
): Html<Msg> =>
  ul(
    [attr("class", "pm-list")],
    rows.map((row: SearchResult) =>
      li(
        [attr("class", "pm-list-item")],
        [
          a(
            [
              href(resultHref(url, row.id)),
              attr("class", "pm-row-link"),
              ...matchOption<
                SoftStr,
                ReadonlyArray<
                  ReturnType<typeof attr>
                >
              >(
                () => [],
                (id: SoftStr) =>
                  id === row.id
                    ? [
                        attr(
                          "aria-current",
                          "page",
                        ),
                      ]
                    : [],
              )(selectedId(url)),
            ],
            [
              span(
                [attr("class", "bo-result-name")],
                [text(row.label)],
              ),
              span(
                [attr("class", "bo-result-meta")],
                [text(row.secondary)],
              ),
            ],
          ),
        ],
      ),
    ),
  );

export const searchResultsColumn = (
  model: Model,
): ReadonlyArray<AppColumn> => {
  const url = currentUrl(model);
  return matchOption<
    SearchableSection,
    ReadonlyArray<AppColumn>
  >(
    () => [],
    (section: SearchableSection) =>
      model.search.open && model.search.submitted
        ? [
            {
              key: `${section}-search-results`,
              title: "Results",
              close: some(
                hrefOf(dropSelection(url)),
              ),
              body: [
                slot(
                  [attr("class", "bo-results")],
                  [
                    resultsList(
                      filteredResults(
                        section,
                        model.search,
                      ),
                      url,
                    ),
                  ],
                ),
              ],
            },
          ]
        : [],
  )(sectionOfUrl(url));
};

export const appColumns = (
  model: Model,
): ReadonlyArray<AppColumn> => [
  ...addFormColumn(model),
  ...searchConditionColumn(model),
  ...searchResultsColumn(model),
];
