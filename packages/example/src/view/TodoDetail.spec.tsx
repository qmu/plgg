// @vitest-environment happy-dom
import { test, expect } from "vitest";
import { isOk } from "plgg";
import { renderToString } from "plgg-server";
import { render } from "plgg-server/client";
import {
  TodoDetail,
  TodoNotFound,
} from "./TodoDetail";
import { asTodo } from "../models/Todo";

// One completed todo (completedAt Some) and one open todo (completedAt None),
// so both branches of the Option<Time> render path are exercised.
const RAW_DONE = {
  id: "t1",
  title: "Wire the pipeline",
  completed: true,
  createdAt: "2026-05-26T09:00:00Z",
  completedAt: "2026-05-27T18:30:00Z",
};
const RAW_OPEN = {
  id: "t2",
  title: "Ship the demo",
  completed: false,
  createdAt: "2026-05-28T09:00:00Z",
};

test("TodoDetail SSR renders the title, completed state, created + completedAt, and a back link", () => {
  const decoded = asTodo(RAW_DONE);
  expect(isOk(decoded)).toBe(true);
  if (isOk(decoded)) {
    const html = renderToString(
      TodoDetail({ todo: decoded.content }),
    );
    expect(html).toContain("Wire the pipeline");
    expect(html).toContain("Completed");
    expect(html).toContain(
      "created 2026-05-26T09:00:00",
    );
    expect(html).toContain(
      "completed 2026-05-27T18:30:00",
    );
    expect(html).toContain('href="/"');
  }
});

test("TodoDetail renders the open branch (not completed yet)", () => {
  const decoded = asTodo(RAW_OPEN);
  if (isOk(decoded)) {
    const html = renderToString(
      TodoDetail({ todo: decoded.content }),
    );
    expect(html).toContain("Open");
    expect(html).toContain("not completed yet");
  }
});

test("TodoDetail CSR renders into a happy-dom container", () => {
  const decoded = asTodo(RAW_OPEN);
  if (isOk(decoded)) {
    const root = document.createElement("div");
    render(
      TodoDetail({ todo: decoded.content }),
      root,
    );
    expect(root.innerHTML).toContain("Ship the demo");
  }
});

test("TodoNotFound renders a heading and a back link", () => {
  const html = renderToString(TodoNotFound());
  expect(html).toContain("Not found");
  expect(html).toContain('href="/"');
});
