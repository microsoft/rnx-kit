import { deepEqual, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { getJSONPathSegments } from "../src/utilities.ts";

describe("getJSONPathSegments", () => {
  it("returns array paths as-is", () => {
    deepEqual(getJSONPathSegments(["a", "b", "c"]), ["a", "b", "c"]);
  });

  it("preserves literal dots in array segments", () => {
    deepEqual(getJSONPathSegments(["exports", ".", "import"]), [
      "exports",
      ".",
      "import",
    ]);
  });

  it("splits dotted strings into segments", () => {
    deepEqual(getJSONPathSegments("a.b.c"), ["a", "b", "c"]);
    deepEqual(getJSONPathSegments("name"), ["name"]);
  });

  it("blocks __proto__ in either form", () => {
    throws(() => getJSONPathSegments("a.__proto__.b"));
    throws(() => getJSONPathSegments(["a", "__proto__", "b"]));
    throws(() => getJSONPathSegments("__proto__"));
  });

  it("blocks constructor", () => {
    throws(() => getJSONPathSegments("a.constructor.prototype"));
    throws(() => getJSONPathSegments(["constructor"]));
  });

  it("blocks prototype", () => {
    throws(() => getJSONPathSegments("a.prototype"));
    throws(() => getJSONPathSegments(["prototype"]));
  });

  it("does not mutate the supplied array on success", () => {
    const input = ["a", "b"];
    const out = getJSONPathSegments(input);
    deepEqual(input, ["a", "b"]);
    deepEqual(out, ["a", "b"]);
  });

  it("error message names the offending segment", () => {
    try {
      getJSONPathSegments("dependencies.__proto__.foo");
      ok(false, "expected throw");
    } catch (e) {
      ok(e instanceof Error);
      ok(
        e.message.includes("__proto__"),
        `expected message to include '__proto__', got: ${e.message}`
      );
    }
  });
});
