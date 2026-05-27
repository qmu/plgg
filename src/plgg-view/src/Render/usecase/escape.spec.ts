import { test, expect } from "vitest";
import {
  escapeText,
  escapeAttr,
  isSafeAttrName,
} from "plgg-view/index";

test("escapeText neutralizes markup characters, & first", () => {
  expect(escapeText("a & b < c > d")).toBe(
    "a &amp; b &lt; c &gt; d",
  );
  // an already-entity-looking string is escaped once, not double-escaped
  expect(escapeText("&amp;")).toBe("&amp;amp;");
  expect(
    escapeText("<script>alert(1)</script>"),
  ).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("escapeAttr also escapes the quote characters", () => {
  expect(escapeText('"x"')).toBe('"x"');
  expect(escapeAttr('" onmouseover="evil()')).toBe(
    "&quot; onmouseover=&quot;evil()",
  );
  expect(escapeAttr("a'b")).toBe("a&#39;b");
});

test("isSafeAttrName accepts HTML names and rejects forgery attempts", () => {
  expect(isSafeAttrName("href")).toBe(true);
  expect(isSafeAttrName("data-id")).toBe(true);
  expect(isSafeAttrName("aria:label")).toBe(true);
  expect(isSafeAttrName("x.y")).toBe(true);
  expect(isSafeAttrName("")).toBe(false);
  expect(isSafeAttrName("a b")).toBe(false);
  expect(isSafeAttrName('a"=x')).toBe(false);
  expect(isSafeAttrName("1abc")).toBe(false);
});
