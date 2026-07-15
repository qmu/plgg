/**
 * The single reuse seam onto PoC 4b's PROVEN core — on
 * the same relative-import pattern as {@link ./poc1.ts}
 * (the one spelling tsc, node type-stripping, plgg-test
 * and plgg-bundle's inliner all resolve identically).
 *
 * This PoC re-opens exactly ONE question — does the
 * animated in-place edit survive on the REAL rendered
 * site? — so everything 4b already settled is imported,
 * never re-derived:
 *
 * - the granular edit model (`EditOp`, the exactly-once
 *   span locator, the applier, the ordered kept/changed
 *   diff segments, and `refineChange`, which narrows a
 *   wide `find` to its truly-different middle). 4b proved
 *   it offline at 100% coverage; re-deriving a second
 *   diff here would be the clone-garbage anti-pattern AND
 *   would let the preview and the disk disagree.
 * - the path authorization guard (`resolveEditPath`).
 * - the wire casters for the session + edit seams.
 * - the Realtime loop's pure half: the event decoder (the
 *   granular `edit_doc` tool, not PoC 4's whole-file
 *   `edit_file`), the BM25 search executor, and the
 *   session instructions — which already tell the model
 *   its edits "appear ON that document as the writer
 *   watches", which is precisely 4c's claim too.
 *
 * What 4c ADDS is the mapping from that markdown edit onto
 * the real rendered DOM ({@link ./spanMap.ts}) and the
 * reconciliation with the dev server's hot reload
 * ({@link ./reloadPolicy.ts}) — the genuinely new,
 * separately-tested surface.
 */
export {
  type EditOp,
  type EditError,
  type DocSegment,
  type RefinedChange,
  locateEdits,
  applyEdits,
  diffSegments,
  wholeDocSegments,
  keptSegment,
  changedSegment,
  refineChange,
  EDIT_TOOL,
} from "../../plgg-poc4b-coedit/src/edit.ts";
export {
  type EditPathError,
  resolveEditPath,
} from "../../plgg-poc4b-coedit/src/editPath.ts";
export {
  type SessionGrant,
  type EditRequest,
  type EditReply,
  asSessionGrant,
  asEditRequest,
  asEditReply,
} from "../../plgg-poc4b-coedit/src/protocol.ts";
export {
  type Line,
  type ToolHit,
  type ToolTrail,
  type EditTrail,
  type ToolResult,
  type AgentEvent,
  runSearchTool,
  docFiles,
  instructionsOf,
  eventOf,
  REALTIME_MODEL,
  SEARCH_TOOL,
} from "../../plgg-poc4b-coedit/src/agent.ts";
