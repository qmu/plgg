import {
  test,
  check,
  toBe,
} from "plgg-test";
import { isNone, isSome, some, none } from "plgg";
import { embedderFromConfig } from "plgg-content/Rag/usecase/embedderConfig";

test("no API key → None (search stays FTS5-only, graceful degradation)", () =>
  check(
    isNone(
      embedderFromConfig({
        apiKey: none(),
        endpoint: "https://api.example/embeddings",
        model: "text-embedding-3-small",
      }),
    ),
    toBe(true),
  ));

test("an API key → Some(embedder)", () =>
  check(
    isSome(
      embedderFromConfig({
        apiKey: some("sk-test"),
        endpoint: "https://api.example/embeddings",
        model: "text-embedding-3-small",
      }),
    ),
    toBe(true),
  ));
