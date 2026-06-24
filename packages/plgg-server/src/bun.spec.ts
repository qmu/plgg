import {
  test,
  check,
  all,
  toBe,
  toHaveLength,
  toBeUndefined,
} from "plgg-test";
import { pipe } from "plgg";
import {
  createAdapter,
  type BunServer,
  type BunServeImpl,
} from "plgg-server/bun";
import { type Fetch } from "plgg-server/index";

const fakeServer: BunServer = { stop: () => {} };
const handler: Fetch = async () =>
  new Response("ok");

test("bun adapter forwards port and handler to the impl", () => {
  const calls: Array<Parameters<BunServeImpl>[0]> =
    [];
  const impl: BunServeImpl = (options) => {
    calls.push(options);
    return fakeServer;
  };
  const server = pipe(
    handler,
    createAdapter(impl)({ port: 3000 }),
  );
  return all([
    check(server, toBe(fakeServer)),
    check(calls, toHaveLength(1)),
    check(calls[0]?.port, toBe(3000)),
    check(calls[0]?.hostname, toBeUndefined()),
    check(calls[0]?.fetch, toBe(handler)),
  ]);
});

test("bun adapter forwards an explicit hostname", () => {
  const calls: Array<Parameters<BunServeImpl>[0]> =
    [];
  const impl: BunServeImpl = (options) => {
    calls.push(options);
    return fakeServer;
  };
  createAdapter(impl)({
    port: 3000,
    hostname: "127.0.0.1",
  })(handler);
  return check(
    calls[0]?.hostname,
    toBe("127.0.0.1"),
  );
});

test("bun adapter invokes onListen after the server starts", () => {
  let listened = 0;
  const impl: BunServeImpl = () => fakeServer;
  createAdapter(impl)({ port: 0 }, () => {
    listened++;
  })(handler);
  return check(listened, toBe(1));
});

test("bun adapter omits onListen when not provided", () => {
  const impl: BunServeImpl = () => fakeServer;
  let threw = false;
  try {
    createAdapter(impl)({ port: 0 })(handler);
  } catch {
    threw = true;
  }
  return check(threw, toBe(false));
});
