import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  isErr,
  none,
} from "plgg";
import { openIndex } from "plgg-content/Schema/usecase/openIndex";
import { searchIndex } from "plgg-content/Query/usecase/searchIndex";
import { openStakeholderStore } from "plgg-content/Stakeholder/usecase/openStakeholderStore";
import { ingest } from "plgg-content/Stakeholder/usecase/ingest";
import {
  ingestMessage,
  newConversation,
} from "plgg-content/Stakeholder/model/Ingestion";
import { projectStakeholderFeed } from "plgg-content/Stakeholder/usecase/projectFeed";

const NOW = 1_700_000_000;

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const submit = (
  body: string,
  visibility: "public" | "private",
) =>
  ingestMessage({
    conversationRef: newConversation({
      contentPath: none(),
      kind: "comment",
      visibility,
    }),
    body,
    authorKind: "guest",
    authorSubject: none(),
    source: "web",
  });

test("projectStakeholderFeed indexes ONLY public conversations (visibility-gated)", async () => {
  const sdb = must(
    await openStakeholderStore(":memory:"),
  );
  const idx = must(await openIndex(":memory:"));
  must(
    await ingest(sdb, () => NOW)(
      submit(
        "photosynthesis powers the leaf",
        "public",
      ),
    ),
  );
  must(
    await ingest(sdb, () => NOW)(
      submit(
        "cryptography keeps it secret",
        "private",
      ),
    ),
  );

  const count = must(
    await projectStakeholderFeed(sdb, idx),
  );
  const pub = must(
    await searchIndex(idx)("photosynthesis", 10),
  );
  const priv = must(
    await searchIndex(idx)("cryptography", 10),
  );
  return all([
    // only the public conversation was projected
    check(count, toBe(1)),
    check(pub.length, toBe(1)),
    // the private conversation never reached the index
    check(priv.length, toBe(0)),
  ]);
});

test("projecting an empty store indexes nothing", async () => {
  const sdb = must(
    await openStakeholderStore(":memory:"),
  );
  const idx = must(await openIndex(":memory:"));
  return check(
    must(await projectStakeholderFeed(sdb, idx)),
    toBe(0),
  );
});
