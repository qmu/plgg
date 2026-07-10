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
 * are taken by other qmu.dev workloads). The cloudflared
 * ingress mapping is developer-applied — see the package
 * README for the exact `~/.cloudflared/config.yml` lines.
 */
import { none } from "plgg";
import type { Poc } from "./Poc.ts";

export const PORTAL_HOSTNAME =
  "plgg-poc.qmu.dev";
export const PORTAL_PORT = 5183;

export const POCS: ReadonlyArray<Poc> = [
  {
    id: "poc1",
    name: "Browser search core",
    question:
      "Indexed full-text search or vector-DB RAG — which browser-side search over the plgg guide corpus is affordable and good enough?",
    confidenceSignal:
      "A metrics table (index size, build time, query latency p50/p95) plus ~10 canned queries side-by-side on the full corpus, judged by the developer; verdict includes the vector arm's from-scratch cost estimate.",
    status: "building",
    verdict: none(),
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
    status: "planned",
    verdict: none(),
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
    status: "planned",
    verdict: none(),
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
    status: "planned",
    verdict: none(),
    hostname: "plgg-poc4.qmu.dev",
    port: 5187,
  },
  {
    id: "poc5",
    name: "Central configuration generation",
    question:
      "Can the writer's agent maintain the site's central configuration — front-matter tag classification (name/color/emoji/description), path exclusions, layout and sizing themes — as generated data?",
    confidenceSignal:
      "Asking the agent to reclassify tags, exclude a path, and switch among prefixed sizing themes produces a valid configuration the site renders, with ~5–10 sizing themes expressible.",
    status: "planned",
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
    status: "planned",
    verdict: none(),
    hostname: "plgg-poc6.qmu.dev",
    port: 5189,
  },
];
