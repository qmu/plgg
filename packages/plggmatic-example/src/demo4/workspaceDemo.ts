import {
  type SoftStr,
  type Option,
  some,
  none,
  fromNullable,
  matchOption,
} from "plgg";
import {
  type Html,
  slot,
  a,
  p as para,
  span,
  button,
  text,
  attr,
  href,
  onClick,
  onEvent,
} from "plgg-view";
import {
  type Application,
  type Url,
  type Cmd,
  cmdNone,
  cmdEffect,
  makeUrl,
  windowEvent,
} from "plgg-view/client";
import {
  type Trail,
  type TrailResolver,
  type TrailColumn,
  type NavGroup,
  resolveTrail,
  settledTrail,
  foldTrail,
  stepFrom,
  trailParam,
  decodeTrail,
  trailQuery,
  stripMetrics,
  stripGeometry,
  workspaceWith,
  pinnedPanel,
  browser,
  menuColumn,
  widthColumn,
  colHead,
  sidebarNav,
  revealColumn,
  revealOptions,
  readPreference,
  savePreference,
  workspaceClass,
  pinnedClass,
  colClass,
} from "plggmatic";

/**
 * Demo 4 — the WORKSPACE, every piece of it the
 * framework's: a panel pinned on the left, a menu that
 * folds to a rail, and a strip of columns walked by a
 * trail in `?x=`.
 *
 * What is this app's own is small on purpose: the records,
 * and what each column offers (the resolver). The trail's
 * rules, the address, the widths, the reveal glide, the
 * remembered rail and the whole stylesheet are plggmatic's
 * — which is the claim this demo exists to make visible.
 */

// --- the records (the product's own) ---

type Rec = Readonly<{
  id: SoftStr;
  name: SoftStr;
  note: SoftStr;
  // steps this record's detail offers, with their labels
  leads: ReadonlyArray<
    readonly [step: SoftStr, label: SoftStr]
  >;
}>;

const lists: ReadonlyArray<
  readonly [
    step: SoftStr,
    title: SoftStr,
    ids: ReadonlyArray<SoftStr>,
  ]
> = [
  ["Lclients", "Clients", ["acme", "beacon"]],
  [
    "Lprojects",
    "Projects",
    ["storefront", "portal", "audit"],
  ],
  ["Lmembers", "Members", ["aoki", "sato"]],
];

const recs: ReadonlyArray<Rec> = [
  {
    id: "acme",
    name: "ACME Retail K.K.",
    note: "Prime account; contract renews yearly.",
    leads: [
      ["Rprojects", "Projects of this client"],
    ],
  },
  {
    id: "beacon",
    name: "Beacon Logistics",
    note: "New this year. One audit so far.",
    leads: [
      ["Rprojects", "Projects of this client"],
    ],
  },
  {
    id: "storefront",
    name: "ACME storefront rebuild",
    note: "Fixed-price, in progress, 2026-04 to 2026-09.",
    leads: [
      ["Sacme", "Client: ACME Retail K.K."],
      ["Saoki", "Lead: Aoki"],
    ],
  },
  {
    id: "portal",
    name: "ACME partner portal",
    note: "Time and materials, starting 2026-10.",
    leads: [
      ["Sacme", "Client: ACME Retail K.K."],
      ["Ssato", "Lead: Sato"],
    ],
  },
  {
    id: "audit",
    name: "Beacon security audit",
    note: "Two weeks, delivered.",
    leads: [
      ["Sbeacon", "Client: Beacon Logistics"],
      ["Saoki", "Lead: Aoki"],
    ],
  },
  {
    id: "aoki",
    name: "Aoki",
    note: "Tech lead.",
    leads: [["Rprojects", "Projects led"]],
  },
  {
    id: "sato",
    name: "Sato",
    note: "Engineer.",
    leads: [["Rprojects", "Projects led"]],
  },
];

const recOf = (id: SoftStr): Option<Rec> =>
  fromNullable(recs.find((r) => r.id === id));

// --- a column, and what it offers ---

type Row = Readonly<{
  step: SoftStr;
  label: SoftStr;
}>;
type Col = Readonly<{
  title: SoftStr;
  note: Option<SoftStr>;
  subject: Option<Rec>;
  rows: ReadonlyArray<Row>;
}>;

const rowsOf = (
  ids: ReadonlyArray<SoftStr>,
): ReadonlyArray<Row> =>
  ids.flatMap((id) =>
    matchOption<Rec, ReadonlyArray<Row>>(
      () => [],
      (r: Rec) => [
        { step: "S" + r.id, label: r.name },
      ],
    )(recOf(id)),
  );

const menuCol: Col = {
  title: "Menu",
  note: none(),
  subject: none(),
  rows: lists.map(([step, title]) => ({
    step,
    label: title,
  })),
};

// The steps that lead back to `subject` from other records.
const related = (subject: Rec): Col => ({
  title: "Projects",
  note: none(),
  subject: none(),
  rows: rowsOf(
    recs
      .filter((r) =>
        r.leads.some(
          ([step]) => step === "S" + subject.id,
        ),
      )
      .map((r) => r.id),
  ),
});

const detail = (r: Rec): Col => ({
  title: r.name,
  note: some(r.note),
  subject: some(r),
  rows: r.leads.map(([step, label]) => ({
    step,
    label,
  })),
});

const opened = (
  previous: Col,
  step: SoftStr,
): Option<Col> =>
  step.startsWith("L")
    ? matchOption<
        (typeof lists)[number],
        Option<Col>
      >(
        () => none(),
        ([, title, ids]) =>
          some({
            title,
            note: none(),
            subject: none(),
            rows: rowsOf(ids),
          }),
      )(
        fromNullable(
          lists.find(([s]) => s === step),
        ),
      )
    : step.startsWith("S")
      ? matchOption<Rec, Option<Col>>(
          () => none(),
          (r: Rec) => some(detail(r)),
        )(recOf(step.slice(1)))
      : matchOption<Rec, Option<Col>>(
          () => none(),
          (r: Rec) => some(related(r)),
        )(previous.subject);

/** The whole of this app's navigation: what a column offers. */
export const resolver: TrailResolver<Col> = {
  root: () => menuCol,
  resolve: (previous: Col, step: SoftStr) =>
    previous.rows.some((r) => r.step === step)
      ? opened(previous, step)
      : none(),
};

// --- the program ---

export const RAIL_KEY = "plggmatic-demo4:rail";

export type Model = Readonly<{
  path: SoftStr;
  trail: Trail;
  viewport: number;
  scroll: number;
  compact: boolean;
}>;

export type Msg =
  | Readonly<{ kind: "UrlChanged"; url: Url }>
  | Readonly<{ kind: "Resized"; width: number }>
  | Readonly<{ kind: "Scrolled"; left: number }>
  | Readonly<{ kind: "ToggleRail" }>
  | Readonly<{ kind: "Done" }>;

const scrolled = (left: number): Msg => ({
  kind: "Scrolled",
  left,
});
const resized = (width: number): Msg => ({
  kind: "Resized",
  width,
});

const columnsOf = (
  trail: Trail,
): ReadonlyArray<TrailColumn<Col>> =>
  resolveTrail(resolver)(trail);

/** The trail a URL names, folded to what still resolves. */
export const trailOfUrl = (url: Url): Trail =>
  settledTrail(
    columnsOf(
      decodeTrail(
        fromNullable(
          new URLSearchParams(url.search).get(
            trailParam,
          ),
        ),
      ),
    ),
  );

const viewportNow = (): number =>
  typeof window === "undefined"
    ? 1280
    : window.innerWidth;

export const init = (
  url: Url,
): readonly [Model, Cmd<Msg>] => [
  {
    path: url.path,
    trail: trailOfUrl(url),
    viewport: viewportNow(),
    scroll: 0,
    compact:
      typeof window !== "undefined" &&
      readPreference(RAIL_KEY),
  },
  cmdNone(),
];

export const update = (
  msg: Msg,
  model: Model,
): readonly [Model, Cmd<Msg>] => {
  switch (msg.kind) {
    case "UrlChanged":
      return [
        {
          ...model,
          path: msg.url.path,
          trail: trailOfUrl(msg.url),
        },
        cmdNone(),
      ];
    case "Resized":
      return [
        { ...model, viewport: msg.width },
        cmdNone(),
      ];
    case "Scrolled":
      return [
        { ...model, scroll: msg.left },
        cmdNone(),
      ];
    case "ToggleRail":
      return [
        { ...model, compact: !model.compact },
        cmdEffect(() => {
          savePreference(
            RAIL_KEY,
            !model.compact,
          );
          return Promise.resolve<Msg>({
            kind: "Done",
          });
        }),
      ];
    case "Done":
      return [model, cmdNone()];
  }
};

const hrefOf = (
  model: Model,
  trail: Trail,
): SoftStr => model.path + trailQuery(trail);

const RAIL = 64;

const geometryOf = (model: Model) =>
  stripGeometry(stripMetrics)(
    model.viewport,
    model.scroll,
    model.compact &&
      model.viewport >= stripMetrics.phone
      ? RAIL
      : "open",
  );

const menuGroups: ReadonlyArray<NavGroup> = [
  {
    label: "Menu",
    items: menuCol.rows.map((row) => ({
      label: row.label,
      href: some(row.step),
      children: [],
    })),
  },
];

const stripColumn = (
  model: Model,
  placed: TrailColumn<Col>,
  index: number,
  count: number,
): Html<Msg> => {
  const depth = placed.prefix.length;
  const chosen = fromNullable(model.trail[depth]);
  return widthColumn<Msg>(
    matchOption<SoftStr, "fit" | "read">(
      () => "fit",
      () => "read",
    )(placed.column.note),
    [],
    [
      colHead<Msg>({
        title: placed.column.title,
        // a column with something to its right folds
        // the strip back to itself; the last does not
        // link to where the reader already is
        close:
          index < count - 1
            ? some(
                hrefOf(
                  model,
                  foldTrail(model.trail, depth),
                ),
              )
            : none(),
        links: [],
      }),
      ...matchOption<
        SoftStr,
        ReadonlyArray<Html<Msg>>
      >(
        () => [],
        (note: SoftStr) => [
          para(
            [attr("class", "w4-note")],
            [text(note)],
          ),
        ],
      )(placed.column.note),
      ...placed.column.rows.map((row) =>
        a<Msg>(
          [
            href(
              hrefOf(
                model,
                stepFrom(
                  model.trail,
                  depth,
                  row.step,
                ),
              ),
            ),
            attr("class", "w4-row"),
            ...matchOption<
              SoftStr,
              ReadonlyArray<
                ReturnType<typeof attr>
              >
            >(
              () => [],
              (step: SoftStr) =>
                step === row.step
                  ? [attr("aria-current", "true")]
                  : [],
            )(chosen),
          ],
          [text(row.label)],
        ),
      ),
    ],
  );
};

export const view = (model: Model): Html<Msg> => {
  const columns = columnsOf(model.trail).slice(1);
  const g = geometryOf(model);
  return workspaceWith<Msg>(
    [
      onEvent<Msg>(
        "scroll",
        (event: Event): Option<Msg> =>
          event.currentTarget instanceof
          HTMLElement
            ? some(
                scrolled(
                  event.currentTarget.scrollLeft,
                ),
              )
            : none(),
      ),
    ],
    {
      geometry: g,
      menuOpen: true,
      menuCompact: model.compact,
      phone: model.viewport < stripMetrics.phone,
    },
    [],
    [
      pinnedPanel<Msg>(
        [],
        [
          slot(
            [attr("class", "w4-panel")],
            [
              span(
                [attr("class", "w4-brand")],
                [text("plggmatic workspace")],
              ),
              para(
                [],
                [
                  text(
                    "This panel is pinned. Open a menu entry, then a row, then what the row leads to: the strip scrolls under the panel and the panel gives up width down to its floor.",
                  ),
                ],
              ),
              para(
                [attr("class", "w4-facts")],
                [
                  text(
                    `window ${model.viewport}px · scroll ${Math.round(model.scroll)}px · panel ${Math.round(g.width)}px · menu ${Math.round(g.menu)}px · column ${Math.round(g.column)}px`,
                  ),
                ],
              ),
              para(
                [attr("class", "w4-facts")],
                [
                  text(
                    "trail: " +
                      (model.trail.length === 0
                        ? "(root)"
                        : model.trail.join(
                            " . ",
                          )),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      browser<Msg>(
        [],
        [
          menuColumn<Msg>(
            [],
            [
              button<Msg>(
                [
                  attr("type", "button"),
                  attr("class", "w4-rail"),
                  attr(
                    "aria-pressed",
                    model.compact
                      ? "true"
                      : "false",
                  ),
                  attr(
                    "aria-label",
                    "Fold the menu to a rail",
                  ),
                  onClick<Msg>({
                    kind: "ToggleRail",
                  }),
                ],
                [text(model.compact ? "»" : "«")],
              ),
              sidebarNav({
                groups: menuGroups,
                resolve: (step: SoftStr) =>
                  hrefOf(model, [step]),
                current: (step: SoftStr) =>
                  model.trail[0] === step,
                toggle: false,
                numbered: false,
                label: "Menu",
              }),
            ],
          ),
          ...columns.map((placed, index) =>
            stripColumn(
              model,
              placed,
              index,
              columns.length,
            ),
          ),
        ],
      ),
    ],
  );
};

/**
 * After a paint that changed the trail, bring the newest
 * column into view — a glide the reader can interrupt, or a
 * jump for a reader who asked for less motion.
 */
export const afterRender = (
  root: Element,
  previous: Option<Model>,
  current: Model,
): void => {
  const moved = matchOption<Model, boolean>(
    () => true,
    (before: Model) =>
      before.trail.join(".") !==
      current.trail.join("."),
  )(previous);
  const frame = root.querySelector(
    "." + workspaceClass,
  );
  const cols = root.querySelectorAll(
    "." + colClass,
  );
  const last = cols[cols.length - 1];
  if (
    !moved ||
    !(frame instanceof HTMLElement) ||
    last === undefined
  )
    return;
  revealColumn(frame, last, {
    ...revealOptions,
    // the panel is what stands over the strip here
    sticky: root.querySelector("." + pinnedClass),
    behavior: window.matchMedia(
      "(prefers-reduced-motion:reduce)",
    ).matches
      ? "auto"
      : "smooth",
  });
};

export const app: Application<Model, Msg> = {
  init,
  update,
  view,
  afterRender,
  onUrlChange: (url: Url): Msg => ({
    kind: "UrlChanged",
    url,
  }),
  // a stale address is rewritten to the trail it settled to
  toUrl: (model: Model): Url =>
    makeUrl(model.path, trailQuery(model.trail)),
  subscriptions: () =>
    windowEvent<Msg>(
      "resize",
      "resize",
      (): Option<Msg> =>
        some(resized(viewportNow())),
    ),
};
