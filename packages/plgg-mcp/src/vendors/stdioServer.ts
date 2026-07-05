import { createInterface } from "node:readline";
import { matchOption } from "plgg";
import {
  type ToolRegistry,
  type ServerInfo,
} from "plgg-mcp/Mcp/model/Tool";
import { dispatchMcp } from "plgg-mcp/Mcp/usecase/dispatchMcp";
import { handleFrame } from "plgg-mcp/Transport/handleFrame";

/**
 * Run the MCP server over the stdio transport (D15) — the ONLY
 * IO seam, coverage-excluded. Each newline-delimited frame on
 * `stdin` is run through the pure {@link handleFrame} pipeline
 * (parse → {@link dispatchMcp} → serialize) and, when it
 * produces a reply (i.e. not a notification), written back to
 * `stdout` with a trailing newline. `stderr` is left for logs so
 * it never corrupts the protocol stream. Never throws out of a
 * frame — a bad line answers with an error frame and the loop
 * continues.
 */
export const runStdioServer = (
  tools: ToolRegistry,
  serverInfo: ServerInfo,
): void => {
  const handle = handleFrame(
    dispatchMcp(tools, serverInfo),
  );
  const rl = createInterface({
    input: process.stdin,
    terminal: false,
  });
  rl.on("line", (line: string) => {
    handle(line).then(
      matchOption<string, void>(
        () => undefined,
        (frame: string) => {
          process.stdout.write(`${frame}\n`);
        },
      ),
    );
  });
};
