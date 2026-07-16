/**
 * The PoC fleet as data — the portal's single source of
 * truth, and the durable record the mission
 * `plggpress-technical-confidence-poc-portal` reads its
 * acceptance progress from. Each concluding PoC ticket
 * edits exactly its own entry here (status + verdict);
 * nothing else in the portal changes.
 *
 * Port/hostname allocation: 5183–5190 is the reserved
 * block for this fleet (5173, 5181, 5182, and 5191–5196
 * are taken by other qmu.dev workloads), and it is FULL —
 * the portal at 5183 plus seven PoCs at 5184–5190, with no
 * gap. An eighth PoC therefore needs a port past the block;
 * `poc4c` briefly held 5198 on that basis (the developer's
 * call, 2026-07-15: a PoC fleet is disposable, so a
 * contiguous block is not worth defending) and was
 * dismissed on 2026-07-16, returning the fleet to seven.
 * The invariant in `Poc.spec.ts` follows this comment, not
 * the other way around — widen it deliberately when you
 * allocate again.
 *
 * The cloudflared ingress mapping is developer-applied —
 * see each PoC package's README for the exact
 * `~/.cloudflared/config.yml` lines. Note that 4c's route
 * was never applied, which is part of why it was never
 * judged.
 */
import { none, some } from "plgg";
import type { Poc } from "./Poc.ts";

export const PORTAL_HOSTNAME = "plgg-poc.qmu.dev";
export const PORTAL_PORT = 5183;

export const POCS: ReadonlyArray<Poc> = [
  {
    id: "poc1",
    name: "Browser search core",
    question:
      "Indexed full-text search or vector-DB RAG — which browser-side search over the plgg guide corpus is affordable and good enough?",
    confidenceSignal:
      "A metrics table (index size, build time, query latency p50/p95) plus ~10 canned queries side-by-side on the full corpus, judged by the developer; verdict includes the vector arm's from-scratch cost estimate.",
    status: "proven",
    verdict: some(
      "Proven — indexed full-text search. BM25 quality is comparable to vector RAG on the real guide corpus at ~1/5 the payload (fts.json 252 KB vs embeddings.json 1.4 MB) and none of the model tax; the vector arm's from-scratch cost is dominated by the un-scratchable embedding model (~25 MB CDN runtime + WASM init on every cold visit), which fails the plggpress vision's affordability bar. Re-evaluate only if PoC 2's agent grounding shows a concrete quality gap. Known cost on the FTS path: the from-scratch tokenizer is English-only ([a-z0-9]+ runs) — CJK corpora need n-gram/segmenter tokenization (Ticket B).",
    ),
    hostname: "plgg-poc1.qmu.dev",
    port: 5184,
  },
  {
    id: "poc2",
    name: "Reader-side embedded browser agent",
    question:
      "Can a generated static site embed a browser agent that answers reader questions grounded in the shipped document index?",
    confidenceSignal:
      "On a statically generated site, the embedded agent answers questions about the corpus with citations into the pages, with no server round-trip beyond the model call.",
    status: "proven",
    verdict: some(
      "Proven — the embedded agent answers reader questions grounded in the shipped index, every answer judged side-by-side with its retrieved evidence, citations linking into the live pages, in English (guide) and Japanese (script-routed segmenter index over the full qmu.co.jp articles). The LLM key stays behind one tiny server session seam: honest 404 + upfront banner with no key, nothing provider-shaped in the bundle. Measured limit, accepted by design: exact-term BM25 misses vocabulary-mismatched phrasings (ドキュメンテーション vs the corpus's 文書化); production resolves it by letting the agent DRIVE the search — repeated FTS tool calls with model-generated keyword variations — which is precisely the loop PoC 3 exercises over the Realtime API.",
    ),
    hostname: "plgg-poc2.qmu.dev",
    port: 5185,
  },
  {
    id: "poc3",
    name: "Writer-side voice assistant",
    question:
      "Does an OpenAI Realtime API voice session give the writer an 'on the same page' discussion partner over the open document?",
    confidenceSignal:
      "A voice conversation about the currently open document works end-to-end in the browser against the dev server's minted session, with the document content in the assistant's context.",
    status: "proven",
    verdict: some(
      "Proven — a live microphone conversation in the browser (judged by the developer at plgg-poc3.qmu.dev) discusses the open document in Japanese over the GA Realtime API: WebRTC audio both ways, the picked document carried in the session instructions, and every factual answer grounded by the model DRIVING the search_docs tool — the on-page trail shows model-generated keyword variations until the corpus vocabulary matches (the PoC 2 verdict's accepted design, here exercised over voice; the same loop was also reproduced headless over the GA WebSocket, where the model generated 「文書化 基準」 unprompted). Key confinement held: the standing OPENAI_API_KEY stays in the serve process behind POST /api/session (honest 404 without it), and the browser only ever holds the short-lived client_secrets grant.",
    ),
    hostname: "plgg-poc3.qmu.dev",
    port: 5186,
  },
  {
    id: "poc4",
    name: "Agent file edits with live hot reload",
    question:
      "Can a browser agent's tool calls edit local files through the dev server while hot reload refreshes the page WITHOUT dropping the realtime websocket?",
    confidenceSignal:
      "An agent-initiated edit lands on disk, the edited page hot-reloads, and the same realtime session continues the conversation uninterrupted.",
    status: "proven",
    verdict: some(
      'Proven — the MECHANICS hold. Judged live by the developer at plgg-poc4.qmu.dev (2026-07-14) on the fixed build: asking the assistant to change the open document landed an agent-initiated edit on disk and the page hot-reloaded with the change visible (the guide index\'s "Web development as one typed pipeline" became a "Web + AI development" phrasing), while the SAME Realtime session kept talking uninterrupted across the reload — the confidence signal met word for word. Both bugs the earlier live judging surfaced are fixed: the language lock-in is gone (the assistant conversed in Japanese while the open English document\'s edit stayed in English — default-to-document-language for edits WITH the conversational switch honored, exactly the intent), and the edit round-tripped cleanly (no corruption observed; the raw-read seam GET /api/doc was probe-verified to return raw markdown with zero index.md>index.md reconstruction artifacts, and to reject traversal with 400). The enabling fix over the first judging round: the lossy chunk reconstruction inherited from PoC 3\'s read-only path was retired, so the model is now fed the exact bytes it will overwrite — an editing agent must always see the real file it writes back. Carried, NOT a miss against this PoC\'s question: the edit surfaces only as a reloaded page, not as the watchable in-place diff PoC 4b proved ("we can actually see the HTML, but when it is edited, it should show the diff like v4b shows") — that PoC 4 × PoC 4b synthesis has its own ticket.',
    ),
    hostname: "plgg-poc4.qmu.dev",
    port: 5187,
  },
  {
    id: "poc4b",
    name: "Live co-editing preview",
    question:
      "Does the AI's edit happening ON the preview — a granular change animated in place, no reload — make co-editing feel like the same whiteboard, and which visualization (micro-animation vs before/after diff) delivers it?",
    confidenceSignal:
      "Speaking or typing to change the open document makes the edited span appear ON the live preview surface, in place, legibly — the span animates (erase → write) and/or shows an old-vs-new diff — with NO full-page reload while the same Realtime session keeps talking; the developer judges which mode feels like co-presence on a real corpus page.",
    status: "proven",
    verdict: some(
      "Proven — the co-editing EXPERIENCE feels real. Judged live by the developer at plgg-poc4b.qmu.dev: asking the assistant (voice or typed) to change the open document lands a granular edit_doc find/replace ON the live preview, in place, with NO full-page reload while the same Realtime session keeps talking — and of the two compared visualizations the MICRO-ANIMATION mode wins (\"Animation wins — feels like co-editing\"): the edited span erasing and the new text writing in with a highlight delivers the 'same whiteboard, editing together' co-presence the before/after diff does not. Both modes are driven by the one pure diff; the animation is the one that makes co-editing feel like co-editing. The enabling change over PoC 4: whole-file edit_file → granular {find,replace} ops (applier/span-locator/diff-builder proven offline at 100% coverage, headless-smoke-verified) and the reloading iframe → a client-patched live preview (plgg-view's WAAPI transition seam + keyed reconciliation), so the change is small, addressable, and watchable rather than a batch swap.",
    ),
    hostname: "plgg-poc4b.qmu.dev",
    port: 5190,
  },
  {
    id: "poc5",
    name: "Central configuration generation",
    question:
      "Can the writer's agent maintain the site's central configuration — front-matter tag classification (name/color/emoji/description), path exclusions, layout and sizing themes — as generated data?",
    confidenceSignal:
      "Asking the agent to reclassify tags, exclude a path, and switch among prefixed sizing themes produces a valid configuration the site renders, with ~5–10 sizing themes expressible.",
    status: "building",
    verdict: none(),
    hostname: "plgg-poc5.qmu.dev",
    port: 5188,
  },
  {
    id: "poc6",
    name: "Non-tree file classification",
    question:
      "Does tag/link-based grouping over the tree-shaped file system yield a multi-dimensional search UX that both humans and browser agents can operate?",
    confidenceSignal:
      "Prototype variants of tag/link navigation over one corpus are comparable side-by-side, and an agent can drive each variant's search deterministically.",
    status: "building",
    verdict: none(),
    hostname: "plgg-poc6.qmu.dev",
    port: 5189,
  },
];
