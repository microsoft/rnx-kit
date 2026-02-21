import { deepEqual, equal, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { parseJSON, serializeJSON, stripBOM } from "../src/index.ts";

describe("stripBOM()", () => {
  it("strips UTF-8 BOM from string", () => {
    const bom = "\uFEFF";
    equal(stripBOM(bom + '{"key":"value"}'), '{"key":"value"}');
  });

  it("returns string unchanged when no BOM present", () => {
    const content = '{"key":"value"}';
    equal(stripBOM(content), content);
  });

  it("handles empty string", () => {
    equal(stripBOM(""), "");
  });

  it("strips BOM but preserves other content", () => {
    equal(stripBOM("\uFEFFhello world"), "hello world");
  });
});

describe("parseJSON()", () => {
  it("parses valid JSON", () => {
    deepEqual(parseJSON('{"key":"value"}'), { key: "value" });
  });

  it("parses JSON with BOM", () => {
    deepEqual(parseJSON('\uFEFF{"key":"value"}'), { key: "value" });
  });

  it("parses array JSON", () => {
    deepEqual(parseJSON("[1, 2, 3]"), [1, 2, 3]);
  });

  it("throws on invalid JSON", () => {
    throws(() => parseJSON("not json"));
  });
});

describe("serializeJSON()", () => {
  it("serializes with default 2-space indentation and trailing newline", () => {
    const data = { key: "value" };
    equal(serializeJSON(data), JSON.stringify(data, null, 2) + "\n");
  });

  it("serializes with custom spacing", () => {
    const data = { key: "value" };
    equal(serializeJSON(data, 4), JSON.stringify(data, null, 4) + "\n");
  });

  it("serializes with no indentation", () => {
    const data = { key: "value" };
    equal(serializeJSON(data, 0), JSON.stringify(data) + "\n");
  });

  it("serializes with string spacing", () => {
    const data = { key: "value" };
    equal(serializeJSON(data, "\t"), JSON.stringify(data, null, "\t") + "\n");
  });
});
