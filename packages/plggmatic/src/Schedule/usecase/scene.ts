import {
  type SoftStr,
  type Option,
  none,
  some,
  isSome,
  fromNullable,
  matchOption,
  match,
} from "plgg";
import { type Row } from "plggmatic/Declare/model/Row";
import {
  type Action,
  isDestructive,
} from "plggmatic/Declare/model/Action";
import {
  type Query,
  matchesQuery,
} from "plggmatic/Declare/model/Query";
import { type Collection } from "plggmatic/Declare/model/Collection";
import { type Declaration } from "plggmatic/Declare/model/Declaration";
import {
  type Model,
  type Slot,
  type PendingAction,
  slotOf,
  idle$,
  loading$,
  loadedSlot$,
  failedSlot$,
} from "plggmatic/Schedule/model/Model";
import {
  type Scene,
  type Level,
  type ActionButton,
  menuLevel,
  listLevel,
  detailLevel,
} from "plggmatic/Schedule/model/Scene";
import { hrefFor } from "plggmatic/Schedule/usecase/codec";
import {
  chainCollections,
  ancestorPath,
} from "plggmatic/Schedule/usecase/chain";

/** A slot read down to its display parts (total fold). */
type SlotView = Readonly<{
  rows: ReadonlyArray<Row>;
  loading: boolean;
  error: Option<SoftStr>;
}>;

const readSlot = (slot: Slot): SlotView =>
  match(slot)(
    [
      idle$(),
      (): SlotView => ({
        rows: [],
        loading: false,
        error: none(),
      }),
    ],
    [
      loading$(),
      (): SlotView => ({
        rows: [],
        loading: true,
        error: none(),
      }),
    ],
    [
      loadedSlot$(),
      ({ content }): SlotView => ({
        rows: content,
        loading: false,
        error: none(),
      }),
    ],
    [
      failedSlot$(),
      ({ content }): SlotView => ({
        rows: [],
        loading: false,
        error: some(content),
      }),
    ],
  );

/** Projects an action into a renderer button. */
const projectAction = (
  a: Action,
): ActionButton => ({
  id: a.id,
  label: a.label,
  verb: a.verb,
  destructive: isDestructive(a.confirm),
});

/** The href drilling a row selection at a given level. */
const drillHref = (
  model: Model,
  level: number,
  id: SoftStr,
): SoftStr =>
  hrefFor(model.base, {
    root: model.root,
    path: [
      ...ancestorPath(model.path, level),
      id,
    ],
    query: "",
  });

/** The href truncating the path to `n` selections. */
const truncateHref = (
  model: Model,
  n: number,
): SoftStr =>
  hrefFor(model.base, {
    root: model.root,
    path: ancestorPath(model.path, n),
    query: "",
  });

/** Builds a `ListLevel` for a collection at a flow depth. */
const buildListLevel = (
  model: Model,
  collection: Collection,
  index: number,
  activeListIndex: number,
): Level => {
  const view = readSlot(
    slotOf(model, collection.id),
  );
  const isActive = index === activeListIndex;
  const filtered =
    isActive && isSome(collection.query)
      ? view.rows.filter((r: Row) =>
          matchesQuery(model.query, r.label),
        )
      : view.rows;
  const selectedId = fromNullable(
    model.path[index],
  );
  return listLevel({
    collection: collection.id,
    title: collection.title,
    back:
      index === 0
        ? none()
        : some(truncateHref(model, index - 1)),
    query:
      isActive
        ? matchOption<Query, Option<Readonly<{
            placeholder: SoftStr;
            text: SoftStr;
          }>>>(
            () => none(),
            (q: Query) =>
              some({
                placeholder: q.placeholder,
                text: model.query,
              }),
          )(collection.query)
        : none(),
    rows: filtered.map((r: Row) => ({
      row: r,
      href: drillHref(model, index, r.id),
      active: matchOption<SoftStr, boolean>(
        () => false,
        (sid: SoftStr) => sid === r.id,
      )(selectedId),
    })),
    loading: view.loading,
    error: view.error,
    actions: collection.actions
      .filter((a: Action) => a.verb === "create")
      .map((a: Action) => projectAction(a)),
  });
};

/**
 * The `DetailLevel`, if the deepest selection reveals one
 * — i.e. the last selected collection has no `child` (so
 * selecting a row shows its detail, not a drilled list).
 * A `Some` child means the selection drilled into a list
 * instead, so no detail.
 */
const buildDetail = (
  model: Model,
  chain: ReadonlyArray<Collection>,
): ReadonlyArray<Level> =>
  model.path.length === 0
    ? []
    : matchOption<Collection, ReadonlyArray<Level>>(
        () => [],
        (c: Collection) =>
          isSome(c.child)
            ? []
            : detailFor(model, c),
      )(
        fromNullable(
          chain[model.path.length - 1],
        ),
      );

const detailFor = (
  model: Model,
  c: Collection,
): ReadonlyArray<Level> =>
  matchOption<SoftStr, ReadonlyArray<Level>>(
    () => [],
    (rowId: SoftStr) => {
      const found = fromNullable(
        readSlot(slotOf(model, c.id)).rows.find(
          (r: Row) => r.id === rowId,
        ),
      );
      return [
        detailLevel({
          collection: c.id,
          // the item's OWN label — what you're viewing —
          // so the detail identifies the selection (the
          // oracle's reader showed the note title, not the
          // collection); falls back to the collection
          // title when the row is not yet loaded / gone.
          title: matchOption<Row, SoftStr>(
            () => c.title,
            (r: Row) => r.label,
          )(found),
          back: some(
            truncateHref(
              model,
              model.path.length - 1,
            ),
          ),
          row: found,
          actions: c.actions
            .filter(
              (a: Action) => a.verb !== "create",
            )
            .map((a: Action) => projectAction(a)),
        }),
      ];
    },
  )(fromNullable(model.path[model.path.length - 1]));

/**
 * Derives the {@link Scene} — the typed, mode-agnostic
 * renderer seam — from a model. The `MenuLevel`, then a
 * `ListLevel` per revealed flow depth (root list plus
 * every drilled-into child list), then a `DetailLevel`
 * when the deepest childless selection shows an item, and
 * any pending confirmation. Renderers 10/11 draw this
 * without re-deriving from the model or the declaration.
 */
export const makeScene =
  (declaration: Declaration) =>
  (model: Model): Scene => {
    const chain = chainCollections(
      declaration,
      model.root,
    );
    const activeListIndex =
      chain.length === 0
        ? -1
        : Math.min(
            model.path.length,
            chain.length - 1,
          );
    return {
      title: declaration.title,
      levels: [
        menuLevel(
          declaration.title,
          declaration.menu.entries.map((e) => ({
            label: e.label,
            href: hrefFor(model.base, {
              root: some(e.collection),
              path: [],
              query: "",
            }),
            active: matchOption<SoftStr, boolean>(
              () => false,
              (r: SoftStr) =>
                r === e.collection,
            )(model.root),
          })),
        ),
        ...chain
          .map((collection, index) => ({
            collection,
            index,
          }))
          .filter(
            (e) => e.index <= model.path.length,
          )
          .map((e) =>
            buildListLevel(
              model,
              e.collection,
              e.index,
              activeListIndex,
            ),
          ),
        ...buildDetail(model, chain),
      ],
      confirm: matchOption<
        PendingAction,
        Option<
          Readonly<{
            prompt: SoftStr;
            destructive: boolean;
          }>
        >
      >(
        () => none(),
        (p: PendingAction) =>
          some({
            prompt: p.prompt,
            destructive: p.destructive,
          }),
      )(model.pending),
    };
  };
