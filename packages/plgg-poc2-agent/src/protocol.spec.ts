import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
} from "plgg-test";
import { isErr } from "plgg";
import {
  asAnswerRequest,
  asGroundedAnswer,
} from "./protocol.ts";

const CHUNK = {
  id: 3,
  file: "concepts/option.md",
  headingPath: "concepts/option.md > Option",
  text: "absence is Option, not null",
};

test("asAnswerRequest round-trips a valid payload", () =>
  check(
    asAnswerRequest({
      question: "what replaces null?",
      chunks: [CHUNK],
    }),
    okThen((r) =>
      all([
        toBe("what replaces null?")(r.question),
        toEqual([CHUNK])(r.chunks),
      ]),
    ),
  ));

test("asAnswerRequest rejects a chunk missing its id", () =>
  check(
    isErr(
      asAnswerRequest({
        question: "q",
        chunks: [
          {
            file: "a.md",
            headingPath: "a.md",
            text: "t",
          },
        ],
      }),
    ),
    toBe(true),
  ));

test("asGroundedAnswer decodes answer + citations", () =>
  check(
    asGroundedAnswer({
      answer: "Use Option.",
      citations: [3],
    }),
    okThen((a) =>
      all([
        toBe("Use Option.")(a.answer),
        toEqual([3])(a.citations),
      ]),
    ),
  ));

test("asGroundedAnswer rejects a missing citations array", () =>
  check(
    isErr(asGroundedAnswer({ answer: "only" })),
    toBe(true),
  ));
