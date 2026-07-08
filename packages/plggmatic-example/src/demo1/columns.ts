import {
  type SoftStr,
  type Option,
  some,
  matchOption,
} from "plgg";
import {
  type Html,
  type Flow,
  slot,
  a,
  href,
  ul,
  li,
  text,
  attr,
} from "plgg-view";
import {
  textInput,
  textArea,
  selectInput,
  formView,
  errorFor,
} from "plggmatic";
import { type SearchableSection } from "./records.ts";
import {
  type SectionField,
  fieldsOf,
} from "./fields.ts";
import {
  type Model,
  type Msg,
  type SectionForm,
} from "./model.ts";
import {
  currentUrl,
  sectionOfUrl,
  activeAdd,
  printAppLayer,
  dropSelection,
  hrefOf,
} from "./url.ts";
import {
  singularOf,
  titleOfSection,
  scheduled,
} from "./sections.ts";
import { draftOf, formOf } from "./logic.ts";

export type AppColumn = Readonly<{
  key: SoftStr;
  title: SoftStr;
  close: Option<SoftStr>;
  body: ReadonlyArray<Html<Msg>>;
}>;
export const menuItem = (
  label: SoftStr,
  to: SoftStr,
  active: boolean,
): Html<Msg, "li"> =>
  li(
    [],
    [
      a(
        [
          href(to),
          ...(active
            ? [attr("aria-current", "page")]
            : []),
        ],
        [text(label)],
      ),
    ],
  );

export const sectionSubMenu = (
  model: Model,
): ReadonlyArray<AppColumn> => {
  const url = currentUrl(model);
  return matchOption<
    SearchableSection,
    ReadonlyArray<AppColumn>
  >(
    () => [],
    (section: SearchableSection) => {
      const title = titleOfSection(section);
      return [
        {
          key: `${section}-submenu`,
          title: `${title} Menu`,
          close: some(
            hrefOf({
              path: url.path,
              search: "",
            }),
          ),
          body: [
            slot(
              [attr("class", "pm-menu-body")],
              [
                ul(
                  [],
                  [
                    menuItem(
                      `Add ${title}`,
                      hrefOf(
                        printAppLayer(
                          dropSelection(url),
                          {
                            kind: "add",
                            section,
                          },
                        ),
                      ),
                      activeAdd(section, model),
                    ),
                    menuItem(
                      `Search ${title}`,
                      hrefOf(
                        printAppLayer(
                          dropSelection(url),
                          { kind: "searchOpen" },
                        ),
                      ),
                      model.search.open,
                    ),
                  ],
                ),
              ],
            ),
          ],
        },
      ];
    },
  )(sectionOfUrl(url));
};

export const fieldInput = (
  field: SectionField,
  form: SectionForm,
): Flow<Msg> => {
  const value = draftOf(form)(field.name);
  const error = errorFor(form.errors, field.name);
  switch (field.kind) {
    case "text":
      return textInput<Msg>({
        name: field.name,
        label: field.label,
        value,
        placeholder: some(field.placeholder),
        error,
        disabled: false,
        onInput: (v: SoftStr) => ({
          kind: field.input,
          value: v,
        }),
      });
    case "textarea":
      return textArea<Msg>({
        name: field.name,
        label: field.label,
        value,
        placeholder: some(field.placeholder),
        error,
        disabled: false,
        onInput: (v: SoftStr) => ({
          kind: field.input,
          value: v,
        }),
      });
    case "select":
      return selectInput<Msg>({
        name: field.name,
        label: field.label,
        value,
        options: field.options.map(
          (o: SoftStr) => ({
            value: o,
            label: o,
          }),
        ),
        error,
        disabled: false,
        onChange: (v: SoftStr) => ({
          kind: field.input,
          value: v,
        }),
      });
  }
};

export const formFields = (
  section: SearchableSection,
  model: Model,
): ReadonlyArray<Flow<Msg>> =>
  fieldsOf(section).map((field: SectionField) =>
    fieldInput(field, formOf(section, model)),
  );

export const formSubmit = (
  section: SearchableSection,
): Msg => {
  switch (section) {
    case "clients":
      return { kind: "clientFormSubmit" };
    case "projects":
      return { kind: "projectFormSubmit" };
  }
};

export const addFormColumn = (
  model: Model,
): ReadonlyArray<AppColumn> => {
  const url = currentUrl(model);
  return matchOption<
    SearchableSection,
    ReadonlyArray<AppColumn>
  >(
    () => [],
    (section: SearchableSection) => {
      if (!activeAdd(section, model)) {
        return [];
      }
      const title = titleOfSection(section);
      return [
        {
          key: `add-${singularOf(section)}`,
          title: `Add ${title}`,
          close: some(
            hrefOf(
              printAppLayer(dropSelection(url), {
                kind: "searchOpen",
              }),
            ),
          ),
          body: [
            formView<Msg>({
              fields: formFields(section, model),
              submitLabel: `Register ${singularOf(
                section,
              )}`,
              submitting: false,
              onSubmit: formSubmit(section),
            }),
            slot(
              [attr("class", "pm-actions")],
              [
                a(
                  [
                    href(
                      hrefOf(
                        printAppLayer(
                          dropSelection(
                            scheduled.toUrl(
                              model.scheduled,
                            ),
                          ),
                          { kind: "searchOpen" },
                        ),
                      ),
                    ),
                    attr("class", "pm-btn"),
                    attr("aria-label", "Cancel"),
                  ],
                  [text("Cancel")],
                ),
              ],
            ),
          ],
        },
      ];
    },
  )(sectionOfUrl(url));
};
