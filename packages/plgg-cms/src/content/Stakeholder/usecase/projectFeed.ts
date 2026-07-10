import {
  type Num,
  type PromisedResult,
  type InvalidError,
  type Defect,
  ok,
  some,
  none,
  proc,
} from "plgg";
import {
  type Db,
  type SqlError,
} from "plgg-sql";
import { para } from "plgg-md";
import {
  type IndexInput,
  indexDocument,
} from "plgg-cms/content/Ingest/usecase/indexDocument";
import { registerCollection } from "plgg-cms/content/Query/usecase/registerCollection";
import { collectionSchema } from "plgg-cms/content/Query/model/CollectionSchema";
import { type Conversation } from "plgg-cms/content/Stakeholder/model/Conversation";
import { type Message } from "plgg-cms/content/Stakeholder/model/Message";
import { feedsRag } from "plgg-cms/content/Stakeholder/model/Visibility";
import { type StakeholderStore } from "plgg-cms/content/Stakeholder/model/StakeholderStore";
import { sqlStakeholderStore } from "plgg-cms/content/Stakeholder/Sql/stakeholderStore";

type FeedError = SqlError | InvalidError | Defect;

const FEED_COLLECTION = "conversations";

/** Project one public conversation + its messages into an index document. */
const toIndexInput = (
  conv: Conversation,
  msgs: ReadonlyArray<Message>,
): IndexInput => ({
  collection: FEED_COLLECTION,
  path: `conversations/${conv.id}`,
  title: some(`${conv.kind} #${conv.id}`),
  attributesJson: JSON.stringify({
    status: conv.status,
    kind: conv.kind,
  }),
  blocks: msgs.map((m: Message) => para(m.body)),
  contentHash: `${conv.id}-${conv.updatedAt}-${msgs.length}`,
  updatedAt: `${conv.updatedAt}`,
});

/** Index each public conversation in turn (sequential, so writes never race). */
const indexEach = (
  indexDb: Db,
  store: StakeholderStore,
  convs: ReadonlyArray<Conversation>,
): PromisedResult<null, FeedError> =>
  convs.reduce(
    (
      acc: PromisedResult<null, FeedError>,
      conv: Conversation,
    ) =>
      proc(acc, () =>
        proc(
          store.listMessages(conv.id),
          (msgs: ReadonlyArray<Message>) =>
            proc(
              indexDocument(indexDb)(
                toIndexInput(conv, msgs),
              ),
              () => ok(null),
            ),
        ),
      ),
    Promise.resolve(ok(null)),
  );

/**
 * The visibility-gated RAG feed (D4): project ONLY `public`
 * conversations (`feedsRag`) from the durable store into
 * ticket 16's derived content index as searchable documents —
 * private conversations stay durable-only and never reach the
 * index. This reads the primary store and writes the DERIVED
 * index; it NEVER writes back to the store, so it is safe to
 * re-run (a rebuild re-projects from the durable source of
 * truth). Returns how many conversations were projected.
 */
export const projectStakeholderFeed = (
  stakeholderDb: Db,
  indexDb: Db,
): PromisedResult<Num, FeedError> => {
  const store = sqlStakeholderStore(stakeholderDb);
  return proc(
    registerCollection(indexDb)(
      collectionSchema(FEED_COLLECTION, []),
    ),
    () =>
      store.listConversations({
        status: none(),
        contentPath: none(),
      }),
    (convs: ReadonlyArray<Conversation>) => {
      const feed = convs.filter(
        (c: Conversation) =>
          feedsRag(c.visibility),
      );
      return proc(
        indexEach(indexDb, store, feed),
        () => ok(feed.length),
      );
    },
  );
};
