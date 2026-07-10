import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isSome, isNone } from "plgg";
import {
  extractBearer,
  isWriteCall,
  guardWrite,
} from "plgg-cms/mcp/mcpAuth";

const WRITE = ["delete_article"];

test("extractBearer reads a Bearer token case-insensitively, else None", () =>
  all([
    check(
      isSome(
        extractBearer({
          authorization: "Bearer abc.def",
        }),
      ),
      toBe(true),
    ),
    check(
      isSome(
        extractBearer({
          authorization: "bearer xyz",
        }),
      ),
      toBe(true),
    ),
    check(
      isNone(
        extractBearer({
          authorization: "Basic zzz",
        }),
      ),
      toBe(true),
    ),
    check(
      isNone(extractBearer({})),
      toBe(true),
    ),
  ]));

test("isWriteCall detects a call to a write tool only", () =>
  all([
    check(
      isWriteCall(
        '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"delete_article"}}',
        WRITE,
      ),
      toBe(true),
    ),
    check(
      isWriteCall(
        '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_content"}}',
        WRITE,
      ),
      toBe(false),
    ),
    check(
      isWriteCall(
        '{"jsonrpc":"2.0","id":1,"method":"tools/list"}',
        WRITE,
      ),
      toBe(false),
    ),
    check(isWriteCall("garbage", WRITE), toBe(false)),
    check(
      isWriteCall(
        '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":5}',
        WRITE,
      ),
      toBe(false),
    ),
  ]));

test("guardWrite refuses an unauthorized write, allows everything else", () =>
  all([
    // write call, no scope → rejected
    check(
      isSome(
        guardWrite(
          '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"delete_article"}}',
          WRITE,
          false,
        ),
      ),
      toBe(true),
    ),
    // write call, with scope → allowed
    check(
      isNone(
        guardWrite(
          '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"delete_article"}}',
          WRITE,
          true,
        ),
      ),
      toBe(true),
    ),
    // read call, no scope → allowed
    check(
      isNone(
        guardWrite(
          '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_content"}}',
          WRITE,
          false,
        ),
      ),
      toBe(true),
    ),
  ]));
