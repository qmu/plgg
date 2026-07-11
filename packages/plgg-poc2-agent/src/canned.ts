/**
 * The proof constants both the program (app.ts) and the
 * page (view.ts) read — their own module so the pair
 * never forms a circular value import.
 */
import { type SoftStr } from "plgg";

/** Chunks retrieved per question (grounding evidence). */
export const EVIDENCE_COUNT = 5;

/**
 * The canned proof set: PoC 1's ten guide questions,
 * rephrased as the natural-language questions a reader
 * would actually ask an agent. Running all ten renders
 * every answer next to its retrieved evidence — the
 * mission's "citations + canned set" confidence signal.
 */
export const CANNED_QUESTIONS: ReadonlyArray<SoftStr> =
  [
    "How do I handle errors without throwing exceptions?",
    "What should I use instead of null or undefined?",
    "What is proc, and what error type flows through its channel?",
    "How do I define a branded type with a caster?",
    "How do route parameters work in the router?",
    "What are the test coverage requirements?",
    "How do I bundle a package for the browser?",
    "How does markdown rendering handle code highlighting?",
    "What is the request/response model of the HTTP server?",
    "How does backtracking work in the parser combinators?",
    // Japanese questions ground against the vendored
    // qmu.co.jp policy corpus (segmenter index) —
    // PoC 1 Ticket B's measured queries, phrased as a
    // reader would ask them.
    "ドキュメンテーションについての方針を教えてください",
    "型駆動設計とエスケープハッチの考え方は?",
    "情報セキュリティについて何をコミットしていますか?",
  ];
