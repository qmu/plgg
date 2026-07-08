import {
  type SoftStr,
  type Option,
  none,
  some,
  match,
  matchOption,
  matchResult,
} from "plgg";
import {
  type Cmd,
  cmdNone,
  cmdBatch,
  cmdEffect,
} from "plgg-view/client";
import { type Row } from "plgg-ui/Declare/model/Row";
import {
  type Collection,
  collectionById,
  actionById,
} from "plgg-ui/Declare/model/Collection";
import {
  type Action,
  immediate$,
  confirm$,
} from "plgg-ui/Declare/model/Action";
import {
  sync$,
  async$,
  dynamic$,
} from "plgg-ui/Declare/model/Source";
import { type Declaration } from "plgg-ui/Declare/model/Declaration";
import {
  type Model,
  type PendingAction,
  emptyModel,
  loading,
  loadedSlot,
  failedSlot,
  setSlot,
} from "plgg-ui/Schedule/model/Model";
import {
  type SchedulerMsg,
  loaded,
  failed,
  urlChanged$,
  openMenu$,
  select$,
  queryInput$,
  requestAction$,
  confirmAction$,
  cancelAction$,
  loaded$,
  failed$,
} from "plgg-ui/Schedule/model/Msg";
import { parseUrl } from "plgg-ui/Schedule/usecase/codec";
import {
  chainCollections,
  ancestorPath,
} from "plgg-ui/Schedule/usecase/chain";

type Step = readonly [Model, Cmd<SchedulerMsg>];

/**
 * Reads one collection into its slot against an ancestor
 * `path`. `Sync` resolves immediately into `Loaded`;
 * `Async` parks `Loading` and returns a `cmdEffect` the
 * runtime runs after paint — the deferred read folded to
 * a `Loaded`/`Failed` message INSIDE the thunk, so the
 * effect always resolves to a message and `update` never
 * awaits (effects are data — design tenet b).
 */
const readInto = (
  model: Model,
  collection: Collection,
  path: ReadonlyArray<SoftStr>,
): Step =>
  match(collection.source)(
    [
      sync$(),
      ({ content }): Step => [
        setSlot(
          model,
          collection.id,
          loadedSlot(content(path)),
        ),
        cmdNone(),
      ],
    ],
    [
      async$(),
      ({ content }): Step => [
        setSlot(
          model,
          collection.id,
          loading(),
        ),
        cmdEffect(() =>
          content(path).then(
            matchResult<
              ReadonlyArray<Row>,
              Error,
              SchedulerMsg
            >(
              (e: Error) =>
                failed(collection.id, e.message),
              (rows: ReadonlyArray<Row>) =>
                loaded(collection.id, rows),
            ),
          ),
        ),
      ],
    ],
    // Dynamic: consumer-owned rows. The re-read PRESERVES
    // the existing slot (the consumer set it from data its
    // Model owns via `withRows`) rather than reading a
    // fixed thunk — so a runtime-created record survives
    // navigation without a module-global store, and
    // `update` stays pure.
    [
      dynamic$(),
      (): Step => [model, cmdNone()],
    ],
  );

/**
 * Reads every collection revealed by the current
 * `root`/`path` — the chain up to the deepest selected
 * level (index ≤ `path.length`) — folding each read into
 * the model and batching its command. Reading fresh on
 * every navigation keeps a child list correct when its
 * parent selection changes (the notes reload for the new
 * section) without a slot-invalidation dance.
 */
const ensureChain =
  (declaration: Declaration) =>
  (model: Model): Step => {
    const chain = chainCollections(
      declaration,
      model.root,
    );
    const [next, cmds] = chain
      .map((collection, index) => ({
        collection,
        index,
      }))
      .filter(
        (e) => e.index <= model.path.length,
      )
      .reduce<
        readonly [
          Model,
          ReadonlyArray<Cmd<SchedulerMsg>>,
        ]
      >(
        ([m, acc], e) => {
          const [m2, cmd] = readInto(
            m,
            e.collection,
            ancestorPath(model.path, e.index),
          );
          return [m2, [...acc, cmd]];
        },
        [model, []],
      );
    return [next, cmdBatch(cmds)];
  };

/**
 * Runs an action's `Cmd` factory against a target, or a
 * no-op when it cannot be resolved — the shared tail of
 * the immediate and confirmed action paths.
 */
const runAction = (
  action: Action,
  target: Option<SoftStr>,
): Cmd<SchedulerMsg> => action.run(target);

/**
 * Resolves a requested action and either runs it
 * immediately or parks a confirmation, per its
 * `Confirm` data. An unknown collection/action is a
 * no-op (total).
 */
const requestActionStep = (
  declaration: Declaration,
  model: Model,
  collection: SoftStr,
  actionId: SoftStr,
  target: Option<SoftStr>,
): Step =>
  matchOption<Collection, Step>(
    () => [model, cmdNone()],
    (c: Collection) =>
      matchOption<Action, Step>(
        () => [model, cmdNone()],
        (a: Action) =>
          match(a.confirm)(
            [
              immediate$(),
              (): Step => [
                model,
                runAction(a, target),
              ],
            ],
            [
              confirm$(),
              ({ content }): Step => [
                {
                  ...model,
                  pending: some({
                    collection,
                    action: a,
                    target,
                    prompt: content.prompt,
                    destructive:
                      content.destructive,
                  }),
                },
                cmdNone(),
              ],
            ],
          ),
      )(actionById(c, actionId)),
  )(collectionById(declaration.collections, collection));

/**
 * Derives the pure, pair-shaped `update` from a
 * declaration. Exhaustive `match` over every `Msg`;
 * touches no `window`/`document` and executes no effect —
 * async reads and action verbs are RETURNED as `Cmd`
 * data. Navigation messages set the `root`/`path`/`query`
 * slice then re-read the revealed chain.
 */
export const makeUpdate =
  (declaration: Declaration) =>
  (msg: SchedulerMsg, model: Model): Step =>
    match(msg)(
      [
        urlChanged$(),
        ({ content }): Step => {
          const slice = parseUrl(content);
          return ensureChain(declaration)({
            ...model,
            root: slice.root,
            path: slice.path,
            query: slice.query,
            pending: none(),
          });
        },
      ],
      [
        openMenu$(),
        ({ content }): Step =>
          ensureChain(declaration)({
            ...model,
            root: some(content),
            path: [],
            query: "",
            pending: none(),
          }),
      ],
      [
        select$(),
        ({ content }): Step =>
          ensureChain(declaration)({
            ...model,
            path: [
              ...ancestorPath(
                model.path,
                content.level,
              ),
              content.id,
            ],
            query: "",
            pending: none(),
          }),
      ],
      [
        queryInput$(),
        ({ content }): Step => [
          { ...model, query: content },
          cmdNone(),
        ],
      ],
      [
        requestAction$(),
        ({ content }): Step =>
          requestActionStep(
            declaration,
            model,
            content.collection,
            content.action,
            content.target,
          ),
      ],
      [
        confirmAction$(),
        (): Step =>
          matchOption<PendingAction, Step>(
            () => [model, cmdNone()],
            (p: PendingAction) => [
              { ...model, pending: none() },
              runAction(p.action, p.target),
            ],
          )(model.pending),
      ],
      [
        cancelAction$(),
        (): Step => [
          { ...model, pending: none() },
          cmdNone(),
        ],
      ],
      [
        loaded$(),
        ({ content }): Step => [
          setSlot(
            model,
            content.collection,
            loadedSlot(content.rows),
          ),
          cmdNone(),
        ],
      ],
      [
        failed$(),
        ({ content }): Step => [
          setSlot(
            model,
            content.collection,
            failedSlot(content.error),
          ),
          cmdNone(),
        ],
      ],
    );

/**
 * The initial `[Model, Cmd]` for an entry URL — the empty
 * model seeded from the URL's slice, then the revealed
 * chain read. `init` for the derived program.
 */
export const makeInit =
  (declaration: Declaration) =>
  (base: SoftStr) =>
  (slice: {
    root: Option<SoftStr>;
    path: ReadonlyArray<SoftStr>;
    query: SoftStr;
  }): Step =>
    ensureChain(declaration)({
      ...emptyModel(base),
      root: slice.root,
      path: slice.path,
      query: slice.query,
    });
