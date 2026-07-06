import {
  type SoftStr,
  type PromisedResult,
  type Defect,
} from "plgg";

/**
 * An MCP tool result — a list of content blocks (only `text`
 * here) plus an `isError` flag the client surfaces. A tool
 * NEVER throws; a domain failure returns `isError: true` with a
 * message block.
 */
export type ToolResult = Readonly<{
  content: ReadonlyArray<
    Readonly<{ type: "text"; text: SoftStr }>
  >;
  isError: boolean;
}>;

/**
 * One registered MCP tool. `inputSchema` is the JSON-Schema the
 * client validates against and `tools/list` echoes; `call`
 * takes the raw `arguments` and decodes them against that
 * schema ITSELF (fail-closed) — the dispatcher never trusts the
 * shape. `Result`, never a throw.
 */
export type Tool = Readonly<{
  name: SoftStr;
  description: SoftStr;
  inputSchema: unknown;
  call: (
    args: unknown,
  ) => PromisedResult<ToolResult, Defect>;
}>;

/** The set of tools a server exposes. */
export type ToolRegistry = ReadonlyArray<Tool>;

/** Identity + version a server reports at `initialize`. */
export type ServerInfo = Readonly<{
  name: SoftStr;
  version: SoftStr;
}>;

/** A plain-text tool result (the common case). */
export const textResult = (
  text: SoftStr,
): ToolResult => ({
  content: [{ type: "text", text }],
  isError: false,
});

/** An error tool result — a message the client shows as a failure. */
export const errorResult = (
  message: SoftStr,
): ToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});
