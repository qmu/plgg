import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { some, none, getOr } from "plgg";
import { makeUrl } from "plgg-view/client";
import { renderToString } from "plgg-view";
import {
  type Model,
  init,
  update,
  view,
  toUrl,
  parseUrl,
  noteHref,
  schemeClassCss,
} from "./app.ts";

const root: Model = init(makeUrl("/", ""));

const count = (
  hay: string,
  needle: string,
): number => hay.split(needle).length - 1;

test("init at the root has an empty stack", () =>
  all([
    check(getOr("-")(root.section), toBe("-")),
    check(getOr("-")(root.note), toBe("-")),
    check(root.scheme, toBe("light")),
  ]));

test("url depth round-trips through parse and toUrl", () => {
  const model: Model = {
    base: "/",
    section: some("geology"),
    note: some("strata"),
    scheme: "light",
  };
  const url = toUrl(model);
  const parsed = parseUrl(url);
  return all([
    check(
      url.search,
      toBe("?s=geology&n=strata"),
    ),
    check(
      getOr("-")(parsed.section),
      toBe("geology"),
    ),
    check(
      getOr("-")(parsed.note),
      toBe("strata"),
    ),
    // canonical: same model, same string
    check(toUrl(model).search, toBe(url.search)),
    // root depth serializes to an empty search
    check(toUrl(root).search, toBe("")),
  ]);
});

test("a nested mount keeps its base in links and toUrl", () => {
  const nested = init(
    makeUrl("/example/", "?s=geology"),
  );
  const projected = toUrl({
    ...nested,
    note: some("strata"),
  });
  return all([
    check(nested.base, toBe("/example/")),
    check(projected.path, toBe("/example/")),
    check(
      renderToString(view(nested)).includes(
        'href="/example/?s=geology"',
      ),
      toBe(true),
    ),
  ]);
});

test("unknown ids truncate the stack instead of erroring", () => {
  const badSection = parseUrl(
    makeUrl("/", "?s=nope&n=ghost"),
  );
  const badNote = parseUrl(
    makeUrl("/", "?s=botany&n=ghost"),
  );
  return all([
    check(
      getOr("-")(badSection.section),
      toBe("-"),
    ),
    check(getOr("-")(badSection.note), toBe("-")),
    check(
      getOr("-")(badNote.section),
      toBe("botany"),
    ),
    check(getOr("-")(badNote.note), toBe("-")),
  ]);
});

test("update folds url changes and scheme toggles", () => {
  const navigated = update(
    {
      kind: "urlChanged",
      url: makeUrl("/", "?s=weather&n=fog"),
    },
    root,
  );
  const toggled = update(
    { kind: "toggleScheme" },
    navigated,
  );
  return all([
    check(
      getOr("-")(navigated.section),
      toBe("weather"),
    ),
    check(
      getOr("-")(navigated.note),
      toBe("fog"),
    ),
    check(toggled.scheme, toBe("dark")),
    // navigation state untouched by the toggle
    check(
      getOr("-")(toggled.section),
      toBe("weather"),
    ),
    // update is pure: the root model is unchanged
    check(getOr("-")(root.section), toBe("-")),
  ]);
});

// --- The stack renders by depth --------------------

const atRoot = renderToString(view(root));
const atList = renderToString(
  view({
    base: "/",
    section: some("botany"),
    note: none(),
    scheme: "light",
  }),
);
const atReader = renderToString(
  view({
    base: "/",
    section: some("botany"),
    note: some("moss"),
    scheme: "light",
  }),
);

test("the stack pushes columns as the depth grows", () =>
  all([
    // root: only the nav column
    check(
      count(atRoot, 'class="pm-col'),
      toBe(1),
    ),
    check(count(atRoot, "<nav"), toBe(1)),
    check(atRoot.includes("<aside"), toBe(false)),
    check(atRoot.includes("<main"), toBe(false)),
    // + section: the list column appears
    check(
      count(atList, 'class="pm-col'),
      toBe(2),
    ),
    check(count(atList, "<aside"), toBe(1)),
    // + note: the reader column appears
    check(
      count(atReader, 'class="pm-col'),
      toBe(3),
    ),
    check(count(atReader, "<main"), toBe(1)),
  ]));

test("pushed columns close by link (truncation is navigation)", () =>
  all([
    // list column closes to the root
    check(
      atList.includes(
        'aria-label="Close Botany"',
      ),
      toBe(true),
    ),
    // reader closes to its section
    check(
      atReader.includes(
        'aria-label="Close Moss on the north face"',
      ),
      toBe(true),
    ),
    check(
      atReader.includes(
        'href="/?s=botany" aria-label="Close Moss on the north face"',
      ),
      toBe(true),
    ),
  ]));

test("the breadcrumb mirrors the stack", () =>
  all([
    check(
      count(atReader, "ex-crumb-sep"),
      toBe(2),
    ),
    check(
      atReader.includes("ex-crumb-here"),
      toBe(true),
    ),
    // parent crumbs are links to their truncating URLs
    check(
      atReader.includes(
        'href="/" class="ex-crumb-link',
      ),
      toBe(true),
    ),
    check(
      atReader.includes(
        'href="/?s=botany" class="ex-crumb-link',
      ),
      toBe(true),
    ),
  ]));

test("the selected note is marked and displayed", () =>
  all([
    // SSR escapes the query's & to &amp; in attributes
    check(
      atReader.includes(
        `href="${noteHref("/", "botany", "moss").replace("&", "&amp;")}" aria-current="page"`,
      ),
      toBe(true),
    ),
    check(
      atReader.includes("Moss on the north face"),
      toBe(true),
    ),
  ]));

test("the scheme class follows the model", () =>
  all([
    check(
      atRoot.includes("ex-light"),
      toBe(true),
    ),
    check(
      renderToString(
        view({ ...root, scheme: "dark" }),
      ).includes("ex-dark"),
      toBe(true),
    ),
  ]));

test("scheme css carries both variable sets", () =>
  all([
    check(
      schemeClassCss.includes(
        ".ex-light{--pm-surface:",
      ),
      toBe(true),
    ),
    check(
      schemeClassCss.includes(
        ".ex-dark{--pm-surface:",
      ),
      toBe(true),
    ),
  ]));
