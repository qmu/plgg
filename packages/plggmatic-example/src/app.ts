import {
  type SoftStr,
  type Option,
  some,
  none,
  matchOption,
  getOr,
} from "plgg";
import {
  type Html,
  div,
  slot,
  ul,
  li,
  a,
  span,
  text,
  attr,
  href,
  key,
  fadeIn,
} from "plgg-view";
import {
  type Application,
  type Url,
  type Cmd,
  cmdNone,
  makeUrl,
} from "plgg-view/client";
import {
  type NavItem,
  row,
  column,
  navPane,
  mainPane,
  asidePane,
  heading,
  prose,
  themeToggle,
  navTree,
  focusRing,
} from "plggmatic";
// Namespaced so the Tailwind-style names (`p`, `text`, …)
// coexist with the Html element builders imported above.
import * as sx from "plggmatic/style";
import {
  type Section,
  type Note,
  sections,
} from "./data.ts";

/**
 * The whole app state as one immutable value. The two
 * selections are both `Option`s because the columns are
 * a TRAVERSABLE STACK: no section means only the root
 * column is on screen; selecting a section PUSHES the
 * notes-list column; selecting a note pushes the reader.
 * `base` is the mount path (captured from the entry URL,
 * so the app works standalone at `/` and nested under
 * the docs site at `/example/`). The stack depth is
 * REFLECTED into the URL (`base` → `?s=…` → `?s=…&n=…`)
 * by `toUrl`, so every arrangement is a shareable,
 * back/forward-navigable address — the URL is the
 * serialized column stack.
 */
export type Model = Readonly<{
  base: SoftStr;
  section: Option<SoftStr>;
  note: Option<SoftStr>;
  scheme: sx.Scheme;
}>;

/** Everything that can happen, as data. */
export type Msg =
  | Readonly<{ kind: "urlChanged"; url: Url }>
  | Readonly<{ kind: "toggleScheme" }>;

const findSection = (
  id: SoftStr,
): Option<Section> => {
  const hit = sections.find((s) => s.id === id);
  return hit === undefined ? none() : some(hit);
};

const currentSection = (
  model: Model,
): Option<Section> =>
  matchOption<SoftStr, Option<Section>>(
    () => none(),
    findSection,
  )(model.section);

const currentNote = (
  model: Model,
): Option<Note> =>
  matchOption<Section, Option<Note>>(
    () => none(),
    (section) =>
      matchOption<SoftStr, Option<Note>>(
        () => none(),
        (noteId) => {
          const hit = section.notes.find(
            (n) => n.id === noteId,
          );
          return hit === undefined
            ? none()
            : some(hit);
        },
      )(model.note),
  )(currentSection(model));

// --- URL <-> Model (the pure codec) ---------------

/** Canonical href for the root (sections only). */
export const rootHref = (
  base: SoftStr,
): SoftStr => base;

/** Canonical href for a section (pushes the list). */
export const sectionHref = (
  base: SoftStr,
  id: SoftStr,
): SoftStr =>
  `${base}?s=${encodeURIComponent(id)}`;

/** Canonical href for a note (pushes the reader). */
export const noteHref = (
  base: SoftStr,
  sectionId: SoftStr,
  noteId: SoftStr,
): SoftStr =>
  `${base}?s=${encodeURIComponent(sectionId)}&n=${encodeURIComponent(noteId)}`;

/**
 * Parses a Url into the stack depth, validating both ids
 * against the dataset (an unknown id truncates the stack
 * there rather than erroring — a URL is user input).
 * Total: any string yields a Model slice.
 */
export const parseUrl = (
  url: Url,
): Readonly<{
  section: Option<SoftStr>;
  note: Option<SoftStr>;
}> => {
  const params = new URLSearchParams(url.search);
  const rawSection = params.get("s");
  const section: Option<SoftStr> =
    rawSection === null
      ? none()
      : matchOption<Section, Option<SoftStr>>(
          () => none(),
          (s) => some(s.id),
        )(findSection(rawSection));
  const rawNote = params.get("n");
  const note: Option<SoftStr> =
    rawNote === null
      ? none()
      : matchOption<SoftStr, Option<SoftStr>>(
          () => none(),
          (sectionId) =>
            matchOption<Section, Option<SoftStr>>(
              () => none(),
              (s) =>
                s.notes.some(
                  (n) => n.id === rawNote,
                )
                  ? some(rawNote)
                  : none(),
            )(findSection(sectionId)),
        )(section);
  return { section, note };
};

/**
 * The model→URL projection (inverse of {@link parseUrl}).
 * Canonical: equal models serialize to byte-equal URLs,
 * which is what lets the runtime gate history writes on
 * a string diff.
 */
export const toUrl = (model: Model): Url =>
  makeUrl(
    model.base,
    matchOption<SoftStr, SoftStr>(
      () => "",
      (sectionId) =>
        matchOption<SoftStr, SoftStr>(
          () =>
            `?s=${encodeURIComponent(sectionId)}`,
          (noteId) =>
            `?s=${encodeURIComponent(sectionId)}&n=${encodeURIComponent(noteId)}`,
        )(model.note),
    )(model.section),
  );

// --- The Elm program ------------------------------

export const init = (
  url: Url,
): readonly [Model, Cmd<Msg>] => [
  {
    base: url.path,
    ...parseUrl(url),
    scheme: "light",
  },
  cmdNone(),
];

// The workbench has no effects — every branch pairs the next model with
// `cmdNone()`, the same shape an effectful app fills with real commands.
export const update = (
  msg: Msg,
  model: Model,
): readonly [Model, Cmd<Msg>] => {
  switch (msg.kind) {
    case "urlChanged":
      return [
        {
          ...model,
          ...parseUrl(msg.url),
        },
        cmdNone(),
      ];
    case "toggleScheme":
      return [
        {
          ...model,
          scheme:
            model.scheme === "light"
              ? "dark"
              : "light",
        },
        cmdNone(),
      ];
  }
};

// --- View ------------------------------------------

/**
 * A column's sticky header chrome: the title, and (for
 * pushed columns) a close link back to the truncating
 * URL — leaving a column is the same gesture as entering
 * one, a link. Styled by the app stylesheet
 * (`.ex-colhead`), sticky over the column's own scroll.
 */
const colHead = (
  title: SoftStr,
  close: Option<SoftStr>,
): Html<Msg> =>
  slot(
    [attr("class", "ex-colhead")],
    [
      span(
        [attr("class", "ex-colhead-title")],
        [text(title)],
      ),
      ...matchOption<
        SoftStr,
        ReadonlyArray<Html<Msg>>
      >(
        () => [],
        (to) => [
          a(
            [
              href(to),
              attr(
                "aria-label",
                `Close ${title}`,
              ),
              // the class hook rides style_ (the sole
              // class authority): a separate class attr
              // would be clobbered by the atomic classes
              sx.style_("ex-close", focusRing),
            ],
            [text("×")],
          ),
        ],
      )(close),
    ],
  );

/**
 * The root column: the section menu. Always on screen —
 * the anchor of the stack.
 */
const sectionsColumn = (
  model: Model,
): Html<Msg> => {
  const navItems: ReadonlyArray<NavItem> =
    sections.map((s) => ({
      label: s.label,
      href: some(sectionHref(model.base, s.id)),
      children: [],
    }));
  const active = matchOption<SoftStr, SoftStr>(
    () => "",
    (id) => sectionHref(model.base, id),
  )(model.section);
  return column(
    [sx.basis("220px")],
    [
      navPane(
        [],
        [
          colHead("Sections", none()),
          div(
            [sx.style_(sx.p(2))],
            [navTree(navItems, active)],
          ),
        ],
      ),
    ],
  );
};

/**
 * The list column, pushed when a section is selected.
 * Keyed by the section id so switching sections remounts
 * it fresh (and replays the entrance fade).
 */
const listColumn = (
  model: Model,
  section: Section,
): Html<Msg> => {
  const selected = getOr("")(model.note);
  const noteLink = (
    note: Note,
  ): Html<Msg, "li"> =>
    li(
      [],
      [
        a(
          [
            href(
              noteHref(
                model.base,
                section.id,
                note.id,
              ),
            ),
            ...(selected === note.id
              ? [attr("aria-current", "page")]
              : []),
            sx.style_(
              sx.block,
              sx.textColor("text"),
              sx.px(2),
              sx.py(1),
              sx.rounded("sm"),
              focusRing,
            ),
          ],
          [text(note.title)],
        ),
      ],
    );
  return column(
    [sx.basis("300px")],
    [
      asidePane(
        [],
        [
          slot(
            [
              key(`list-${section.id}`),
              fadeIn(150),
            ],
            [
              colHead(
                section.label,
                some(rootHref(model.base)),
              ),
              ul(
                [
                  sx.style_(
                    sx.listNone,
                    sx.m(0),
                    sx.p(2),
                  ),
                ],
                section.notes.map(noteLink),
              ),
            ],
          ),
        ],
      ),
    ],
  );
};

/**
 * The reader column, pushed when a note is selected.
 * Keyed by the note id: choosing another note remounts
 * the reader (fresh scroll position, entrance fade).
 */
const readerColumn = (
  model: Model,
  section: Section,
  note: Note,
): Html<Msg> =>
  column(
    ["ex-reader", sx.fluid],
    [
      mainPane(
        [],
        [
          slot(
            [
              key(`reader-${note.id}`),
              fadeIn(150),
            ],
            [
              colHead(
                note.title,
                some(
                  sectionHref(
                    model.base,
                    section.id,
                  ),
                ),
              ),
              slot(
                [
                  sx.style_(
                    sx.p(4),
                    sx.maxW(176),
                  ),
                ],
                [
                  heading(1, note.title),
                  prose(
                    note.body.map((paragraph) =>
                      div(
                        [sx.style_(sx.mb(3))],
                        [text(paragraph)],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );

/**
 * The workbench as a TRAVERSABLE COLUMN STACK — the
 * dynamic reading of column-oriented layout, written
 * compositionally: the stack is a `row` of `column`s
 * derived from the depth. The root sections column is
 * always present, the list column is pushed by a section
 * selection, the reader by a note selection. Truncation
 * is a link too (each pushed column's × links to the
 * shallower URL), so the whole stack stays modeless and
 * back/forward-navigable. No layout config object — the
 * geometry is the composed atoms.
 */
export const stack = (
  model: Model,
): Html<Msg> => {
  const pushed: ReadonlyArray<Html<Msg>> =
    matchOption<
      Section,
      ReadonlyArray<Html<Msg>>
    >(
      () => [],
      (section) => [
        listColumn(model, section),
        ...matchOption<
          Note,
          ReadonlyArray<Html<Msg>>
        >(
          () => [],
          (note) => [
            readerColumn(model, section, note),
          ],
        )(currentNote(model)),
      ],
    )(currentSection(model));
  return row(
    [],
    [sectionsColumn(model), ...pushed],
  );
};

/**
 * The breadcrumb trail in the top bar: one crumb per
 * column on the stack. Every crumb except the last is a
 * link to the URL that truncates the stack there —
 * navigation, not a mode switch. Mirrors the column
 * headers so the trail stays legible when columns scroll
 * off on narrow screens.
 */
const breadcrumb = (model: Model): Html<Msg> => {
  const sectionCrumb = matchOption<
    Section,
    ReadonlyArray<
      Readonly<{
        label: SoftStr;
        to: Option<SoftStr>;
      }>
    >
  >(
    () => [],
    (section) => [
      {
        label: section.label,
        to: some(
          sectionHref(model.base, section.id),
        ),
      },
    ],
  )(currentSection(model));
  const noteCrumb = matchOption<
    Note,
    ReadonlyArray<
      Readonly<{
        label: SoftStr;
        to: Option<SoftStr>;
      }>
    >
  >(
    () => [],
    (note) => [{ label: note.title, to: none() }],
  )(currentNote(model));
  const crumbs = [
    {
      label: "Sections",
      to: some(rootHref(model.base)),
    },
    ...sectionCrumb,
    ...noteCrumb,
  ];
  const last = crumbs.length - 1;
  return slot(
    [
      attr("class", "ex-crumbs"),
      attr("aria-label", "You are here"),
    ],
    crumbs.flatMap((crumb, i) => {
      const label =
        i === last
          ? span(
              [attr("class", "ex-crumb-here")],
              [text(crumb.label)],
            )
          : matchOption<SoftStr, Html<Msg>>(
              () => span([], [text(crumb.label)]),
              (to) =>
                a(
                  [
                    href(to),
                    sx.style_(
                      "ex-crumb-link",
                      focusRing,
                    ),
                  ],
                  [text(crumb.label)],
                ),
            )(crumb.to);
      return i === 0
        ? [label]
        : [
            span(
              [
                attr("class", "ex-crumb-sep"),
                attr("aria-hidden", "true"),
              ],
              [text("›")],
            ),
            label,
          ];
    }),
  );
};

/**
 * The top bar: wordmark, the breadcrumb trail, and the
 * scheme toggle. Sits above the column strip; the app
 * stylesheet trims the strip's viewport height to match.
 */
const topBar = (model: Model): Html<Msg> =>
  slot(
    [attr("class", "ex-header")],
    [
      span(
        [attr("class", "ex-brand")],
        [text("Field Notes")],
      ),
      breadcrumb(model),
      span([attr("class", "ex-spacer")], []),
      themeToggle<Msg>({
        scheme: model.scheme,
        toggle: { kind: "toggleScheme" },
      }),
    ],
  );

/**
 * The view: top bar + column strip, wrapped in a scheme
 * class carrier. The framework's contract leaves
 * applying the scheme to the consuming app; this app
 * carries the `--pm-*` variable sets on
 * `.ex-light`/`.ex-dark` (see {@link schemeClassCss})
 * and swaps the class from pure state — no DOM mutation
 * anywhere.
 */
export const view = (model: Model): Html<Msg> =>
  slot(
    [attr("class", `ex-root ex-${model.scheme}`)],
    [topBar(model), stack(model)],
  );

// --- Static CSS ------------------------------------

/**
 * The `--pm-*` variable sets scoped to the app root's
 * scheme classes, generated from the framework's own
 * palette (`colorHex`) — values stay in one place
 * upstream; this app only re-scopes them so the scheme
 * can be swapped by pure re-render instead of a
 * document-level class mutation.
 */
export const schemeClassCss: SoftStr = sx.schemes
  .map(
    (scheme) =>
      `.ex-${scheme}{${sx.colors
        .map(
          (c) =>
            `--pm-${c}:${sx.hex(sx.colorHex(scheme, c))};`,
        )
        .join("")}}`,
  )
  .join("");

// The top bar reuses the chrome-rail thickness (the
// `rail` shell metric, 48px) via its custom property; the
// column strip fills the rest of the viewport (see the
// media override below). Sourced from the token so no bare
// `48px` literal remains.
const HEADER_H = sx.metricVar("rail");

/**
 * The app's own chrome on top of the framework
 * geometry: the top bar, the sticky column headers, the
 * inverted-pill active state (one rule serves the nav
 * tree and the note list — anything marked
 * `aria-current`), column panel surfaces, the strip's
 * viewport height (minus the top bar) with per-column
 * scroll on wide screens, and the below-breakpoint
 * horizontal snap strip. All geometry beyond the
 * composed atoms lives here, targeting the combinators'
 * `pm-row`/`pm-col`/`pm-pane` hooks.
 */
const chromeCss: SoftStr =
  `.ex-header{display:flex;align-items:center;gap:0.75rem;height:${HEADER_H};padding:0 1rem;background:var(--pm-surface);border-bottom:1px solid var(--pm-border);}` +
  `.ex-brand{font-weight:600;white-space:nowrap;}` +
  `.ex-crumbs{display:flex;align-items:center;gap:0.4rem;min-width:0;overflow:hidden;white-space:nowrap;font-size:0.85rem;color:var(--pm-muted);}` +
  `.ex-crumbs a{color:var(--pm-muted);text-decoration:none;padding:0.15rem 0.4rem;border-radius:0.25rem;}` +
  `.ex-crumbs a:hover{background:var(--pm-primary-base);color:var(--pm-primary-text);}` +
  `.ex-crumb-here{color:var(--pm-text);font-weight:500;overflow:hidden;text-overflow:ellipsis;}` +
  `.ex-crumb-sep{color:var(--pm-border);}` +
  `.ex-spacer{flex:1 1 auto;}` +
  `.pm-row{background:var(--pm-surface-2);}` +
  `.pm-col{background:var(--pm-surface);border-right:1px solid var(--pm-border);}` +
  `.ex-colhead{position:sticky;top:0;z-index:${sx.zValue("content")};display:flex;align-items:center;justify-content:space-between;gap:0.5rem;height:40px;padding:0 0.75rem;background:var(--pm-surface-2);border-bottom:1px solid var(--pm-border);}` +
  `.ex-colhead-title{font-size:0.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}` +
  `.ex-close{color:var(--pm-muted);text-decoration:none;line-height:1;padding:0.25rem 0.4rem;border-radius:0.25rem;}` +
  `.ex-close:hover{background:var(--pm-primary-base);color:var(--pm-primary-text);}` +
  `.pm-pane a[aria-current="page"]{background:var(--pm-primary-base);color:var(--pm-primary-text);}` +
  `@media ${sx.minWidth("snap")}{.pm-row{height:calc(100vh - ${HEADER_H});overflow:hidden;}.pm-col{height:calc(100vh - ${HEADER_H});overflow-y:auto;}}` +
  `@media ${sx.maxWidth("snap")}{.pm-row{overflow-x:auto;scroll-snap-type:x proximity;}.pm-col{scroll-snap-align:start;}.ex-reader{min-width:88vw;}}`;

/**
 * The app's whole static stylesheet: baseline reset, the
 * framework's scheme-independent shell metrics
 * (`sx.metricCss` — so the `rail` height and the `prose`
 * `measure` custom properties resolve), the scheme
 * variables, and the app chrome. The composed atoms
 * (basis/fluid, spacing, colors) travel WITH the elements
 * through the runtime's own sheet — the static layer holds
 * only what atoms cannot express (the `@media`
 * responsiveness and the app chrome). Injected once at
 * boot by the client entry.
 */
export const appCss: SoftStr =
  `body{margin:0;font-family:system-ui,sans-serif;line-height:1.6;}` +
  `.ex-root{background:var(--pm-surface);color:var(--pm-text);min-height:100vh;}` +
  `.ex-root a{text-decoration:none;}` +
  sx.metricCss +
  schemeClassCss +
  chromeCss;

/** The wired program the client entry mounts. */
export const app: Application<Model, Msg> = {
  init,
  update,
  view,
  onUrlChange: (url) => ({
    kind: "urlChanged",
    url,
  }),
  toUrl,
  historyMode: (prev, next) =>
    getOr("")(prev.section) !==
      getOr("")(next.section) ||
    getOr("")(prev.note) !== getOr("")(next.note)
      ? "push"
      : "none",
};
