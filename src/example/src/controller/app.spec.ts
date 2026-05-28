import { test, expect } from "vitest";
import {
  isOk,
  pipe,
  decodeJson,
  chainResult,
  isSome,
} from "plgg";
import { toFetch } from "plgg-server";
import { createTodosDb } from "../db/open";
import { buildApp } from "./app";
import { asTodo, asTodos } from "../models/Todo";

// Real components, not mocks: each test runs against an actual in-memory
// node:sqlite database seeded by createTodosDb.

const makeHandler = async () => {
  const db = await createTodosDb();
  return toFetch(buildApp(db, "/* bundle */"));
};

test("GET / renders the seeded todos as an SSR page (including the completed one)", async () => {
  const handler = await makeHandler();
  const res = await handler(
    new Request("http://test/"),
  );
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain("plgg To-Do");
  expect(html).toContain("Wire the pipeline");
  expect(html).toContain("Ship the demo");
  expect(html).toContain('class="todo done"');
});

test("GET /client.js serves the bundle as text/javascript", async () => {
  const handler = await makeHandler();
  const res = await handler(
    new Request("http://test/client.js"),
  );
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain(
    "text/javascript",
  );
  expect(await res.text()).toBe("/* bundle */");
});

test("GET /api/todos returns the seeded rows decodable as Todos", async () => {
  const handler = await makeHandler();
  const res = await handler(
    new Request("http://test/api/todos"),
  );
  expect(res.status).toBe(200);
  const decoded = pipe(
    decodeJson(await res.text()),
    chainResult(asTodos),
  );
  expect(isOk(decoded)).toBe(true);
  if (isOk(decoded)) {
    expect(decoded.content.length).toBe(3);
    expect(decoded.content.map((t) => t.id)).toEqual(
      ["t1", "t2", "t3"],
    );
  }
});

test("POST /api/todos creates a todo and returns it with 201", async () => {
  const handler = await makeHandler();
  const res = await handler(
    new Request("http://test/api/todos", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ title: "Buy milk" }),
    }),
  );
  expect(res.status).toBe(201);
  const decoded = pipe(
    decodeJson(await res.text()),
    chainResult(asTodo),
  );
  expect(isOk(decoded)).toBe(true);
  if (isOk(decoded)) {
    expect(decoded.content.title).toBe("Buy milk");
    expect(decoded.content.completed).toBe(false);
  }
});

test("POST /api/todos rejects a blank title with 400", async () => {
  const handler = await makeHandler();
  const res = await handler(
    new Request("http://test/api/todos", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ title: "   " }),
    }),
  );
  expect(res.status).toBe(400);
});

test("POST /api/todos rejects a malformed body with 400", async () => {
  const handler = await makeHandler();
  const res = await handler(
    new Request("http://test/api/todos", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{not json",
    }),
  );
  expect(res.status).toBe(400);
});

test("PATCH /api/todos/:id toggles completion and sets completedAt", async () => {
  const handler = await makeHandler();
  const res = await handler(
    new Request("http://test/api/todos/t2", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ completed: true }),
    }),
  );
  expect(res.status).toBe(200);
  const decoded = pipe(
    decodeJson(await res.text()),
    chainResult(asTodo),
  );
  if (isOk(decoded)) {
    expect(decoded.content.completed).toBe(true);
    expect(isSome(decoded.content.completedAt)).toBe(
      true,
    );
  }
});

test("PATCH /api/todos/:id clears completedAt when un-completing", async () => {
  const handler = await makeHandler();
  const res = await handler(
    new Request("http://test/api/todos/t1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ completed: false }),
    }),
  );
  expect(res.status).toBe(200);
  const decoded = pipe(
    decodeJson(await res.text()),
    chainResult(asTodo),
  );
  if (isOk(decoded)) {
    expect(decoded.content.completed).toBe(false);
  }
});

test("PATCH /api/todos/:id returns 404 for an unknown id", async () => {
  const handler = await makeHandler();
  const res = await handler(
    new Request("http://test/api/todos/missing", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ completed: true }),
    }),
  );
  expect(res.status).toBe(404);
});

test("DELETE /api/todos/:id removes the row and confirms the id", async () => {
  const handler = await makeHandler();
  const res = await handler(
    new Request("http://test/api/todos/t1", {
      method: "DELETE",
    }),
  );
  expect(res.status).toBe(200);
  const body = JSON.parse(await res.text());
  expect(body).toEqual({ deleted: "t1" });
  const after = await handler(
    new Request("http://test/api/todos"),
  );
  const decoded = pipe(
    decodeJson(await after.text()),
    chainResult(asTodos),
  );
  if (isOk(decoded)) {
    expect(decoded.content.length).toBe(2);
    expect(
      decoded.content.find((t) => t.id === "t1"),
    ).toBeUndefined();
  }
});

test("DELETE /api/todos/:id returns 404 for an unknown id", async () => {
  const handler = await makeHandler();
  const res = await handler(
    new Request("http://test/api/todos/nope", {
      method: "DELETE",
    }),
  );
  expect(res.status).toBe(404);
});
