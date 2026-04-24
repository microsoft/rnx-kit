import { deepEqual, equal, ok, throws } from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  compareValues,
  createJSONValidator,
  getJSONPathSegments,
  isJSONValidator,
  setDefaultValidationOptions,
} from "../src/json.ts";
import type { JSONValue } from "../src/types.ts";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tools-pkgs-json-"));
}

describe("compareValues", () => {
  it("compares primitives by value", () => {
    equal(compareValues(1, 1), true);
    equal(compareValues("a", "a"), true);
    equal(compareValues(null, null), true);
    equal(compareValues(true, true), true);
    equal(compareValues(true, false), false);
    equal(compareValues(1, "1"), false);
    equal(compareValues(null, undefined), false);
  });

  it("returns false when mixing object and primitive", () => {
    equal(compareValues({}, null), false);
    equal(compareValues([], null), false);
    equal(compareValues({}, []), false);
    equal(compareValues({ a: 1 }, "a"), false);
  });

  it("compares arrays elementwise", () => {
    equal(compareValues([1, 2, 3], [1, 2, 3]), true);
    equal(compareValues([], []), true);
    equal(compareValues([1, 2], [1, 2, 3]), false);
    equal(compareValues([1, 2, 3], [3, 2, 1]), false);
    equal(compareValues([{ a: 1 }], [{ a: 1 }]), true);
  });

  it("compares objects with key order significance", () => {
    equal(compareValues({ a: 1, b: 2 }, { a: 1, b: 2 }), true);
    equal(compareValues({ a: 1, b: 2 }, { b: 2, a: 1 }), false);
    equal(compareValues({ a: 1 }, { a: 1, b: 2 }), false);
    equal(compareValues({ a: 1, b: 2 }, { a: 1 }), false);
  });

  it("recurses into nested structures", () => {
    equal(compareValues({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }), true);
    equal(compareValues({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] }), false);
    equal(compareValues({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } }), true);
  });

  it("treats identical references as equal", () => {
    const obj = { a: 1 };
    equal(compareValues(obj, obj), true);
  });
});

describe("createJSONValidator: enforce semantics", () => {
  it("setting an existing matching value is a no-op", () => {
    const json: Record<string, JSONValue> = { name: "foo" };
    const errors: string[] = [];
    const v = createJSONValidator(json, {
      reportError: (m) => errors.push(m),
    });
    v.enforce("name", "foo");
    deepEqual(v.finish(), { changes: false, errors: false });
    deepEqual(errors, []);
  });

  it("non-fix mode reports error and does not mutate", () => {
    const json: Record<string, JSONValue> = { name: "foo" };
    const errors: string[] = [];
    const v = createJSONValidator(json, {
      reportError: (m) => errors.push(m),
    });
    v.enforce("name", "bar");
    deepEqual(json, { name: "foo" });
    const result = v.finish();
    equal(result.errors, true);
    equal(result.changes, false);
    equal(errors.length, 1);
  });

  it("fix mode mutates and reports changes", () => {
    const json: Record<string, JSONValue> = { name: "foo" };
    const v = createJSONValidator(json, { fix: true });
    v.enforce("name", "bar");
    equal(json.name, "bar");
    deepEqual(v.finish(), { changes: true, errors: false });
  });

  it("splits dotted string paths into segments", () => {
    const json: Record<string, JSONValue> = { dependencies: { react: "18" } };
    const v = createJSONValidator(json, { fix: true });
    v.enforce("dependencies.react", "19");
    equal((json.dependencies as Record<string, string>).react, "19");
  });

  it("array path lets keys contain dots", () => {
    const json: Record<string, JSONValue> = {};
    const v = createJSONValidator(json, { fix: true });
    v.enforce(["a.b", "c"], 1);
    deepEqual(json, { "a.b": { c: 1 } });
  });

  it("creates intermediate objects in fix mode", () => {
    const json: Record<string, JSONValue> = {};
    const v = createJSONValidator(json, { fix: true });
    v.enforce(["a", "b", "c"], 1);
    deepEqual(json, { a: { b: { c: 1 } } });
    deepEqual(v.finish(), { changes: true, errors: false });
  });

  it("reports error and does NOT create intermediates in non-fix mode", () => {
    const json: Record<string, JSONValue> = {};
    const errors: string[] = [];
    const v = createJSONValidator(json, {
      reportError: (m) => errors.push(m),
    });
    v.enforce(["a", "b", "c"], 1);
    deepEqual(json, {});
    equal(errors.length, 1);
    deepEqual(v.finish(), { changes: false, errors: true });
  });

  it("undefined value removes property in fix mode", () => {
    const json: Record<string, JSONValue> = { a: { b: 1, c: 2 } };
    const v = createJSONValidator(json, { fix: true });
    v.enforce(["a", "b"], undefined);
    deepEqual(json, { a: { c: 2 } });
    deepEqual(v.finish(), { changes: true, errors: false });
  });

  it("undefined value reports error in non-fix mode", () => {
    const json: Record<string, JSONValue> = { a: { b: 1 } };
    const errors: string[] = [];
    const v = createJSONValidator(json, {
      reportError: (m) => errors.push(m),
    });
    v.enforce(["a", "b"], undefined);
    deepEqual(json, { a: { b: 1 } });
    equal(errors.length, 1);
    deepEqual(v.finish(), { changes: false, errors: true });
  });

  it("undefined for missing path is silent no-op", () => {
    const json: Record<string, JSONValue> = {};
    const errors: string[] = [];
    const v = createJSONValidator(json, {
      reportError: (m) => errors.push(m),
    });
    v.enforce(["a", "b"], undefined);
    deepEqual(errors, []);
    deepEqual(v.finish(), { changes: false, errors: false });
  });

  it("multiple enforce calls accumulate flags", () => {
    const json: Record<string, JSONValue> = { a: 1, b: 2 };
    const errors: string[] = [];
    const v = createJSONValidator(json, {
      reportError: (m) => errors.push(m),
    });
    v.enforce("a", 1); // no-op
    v.enforce("b", 99); // mismatch -> error
    v.enforce("c", 3); // missing -> error
    deepEqual(v.finish(), { changes: false, errors: true });
    equal(errors.length, 2);
  });

  it("throws on prototype-pollution paths and does not mutate", () => {
    const json: Record<string, JSONValue> = {};
    const v = createJSONValidator(json, { fix: true });
    throws(() => v.enforce("__proto__.polluted", "yes"));
    throws(() => v.enforce(["constructor", "prototype", "x"], 1));
    throws(() => v.enforce(["a", "__proto__"], 1));
    throws(() => v.enforce("__proto__", undefined));
    deepEqual(json, {});
    deepEqual(v.finish(), { changes: false, errors: false });
  });
});

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

describe("createJSONValidator: reporter and result accessors", () => {
  it("reportPrefix is prepended to error messages", () => {
    const json: Record<string, JSONValue> = { a: 1 };
    const errors: string[] = [];
    const v = createJSONValidator(json, {
      reportError: (m) => errors.push(m),
      reportPrefix: "[pkg-foo] ",
    });
    v.enforce("a", 2);
    ok(errors[0].startsWith("[pkg-foo] "));
  });

  it("error() flips errors flag in result", () => {
    const errors: string[] = [];
    const v = createJSONValidator({}, { reportError: (m) => errors.push(m) });
    v.error("custom error");
    deepEqual(v.finish(), { changes: false, errors: true });
    deepEqual(errors, ["custom error"]);
  });

  it("changed() flips changes flag in result", () => {
    const v = createJSONValidator({}, { fix: true });
    v.changed();
    deepEqual(v.finish(), { changes: true, errors: false });
  });
});

describe("createJSONValidator: file writing", () => {
  it("writes JSON file in fix mode when jsonFilePath is provided", () => {
    const dir = makeTempDir();
    const filePath = path.join(dir, "out.json");
    try {
      const json: Record<string, JSONValue> = { a: 1 };
      const v = createJSONValidator(json, {
        fix: true,
        jsonFilePath: filePath,
      });
      v.enforce("a", 2);
      v.finish();
      const written = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      deepEqual(written, { a: 2 });
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("does not write file when no changes occurred", () => {
    const dir = makeTempDir();
    const filePath = path.join(dir, "out.json");
    try {
      const json: Record<string, JSONValue> = { a: 1 };
      const v = createJSONValidator(json, {
        fix: true,
        jsonFilePath: filePath,
      });
      v.enforce("a", 1);
      v.finish();
      equal(fs.existsSync(filePath), false);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("does not write file when fix is false", () => {
    const dir = makeTempDir();
    const filePath = path.join(dir, "out.json");
    try {
      const json: Record<string, JSONValue> = { a: 1 };
      const v = createJSONValidator(json, {
        fix: false,
        jsonFilePath: filePath,
        reportError: () => undefined,
      });
      v.enforce("a", 2);
      v.finish();
      equal(fs.existsSync(filePath), false);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("does not write file when fix is true but no jsonFilePath provided", () => {
    const json: Record<string, JSONValue> = { a: 1 };
    const v = createJSONValidator(json, { fix: true });
    v.enforce("a", 2);
    const result = v.finish();
    equal(result.changes, true);
    equal(json.a, 2);
  });
});

describe("createJSONValidator: baseObj mixing", () => {
  it("mixes validator methods onto the provided base object", () => {
    type Base = { name: string; root: string };
    const base: Base = { name: "foo", root: "/tmp" };
    const json: Record<string, JSONValue> = { a: 1 };
    const v = createJSONValidator(json, { fix: true }, base);
    equal(v.name, "foo");
    equal(v.root, "/tmp");
    equal(typeof v.enforce, "function");
  });

  it("returned object is the same instance as the provided base", () => {
    const base = { name: "x", root: "/" };
    const v = createJSONValidator({}, {}, base);
    equal(v as object, base as object);
  });
});

describe("isJSONValidator", () => {
  it("returns true for created validators", () => {
    const v = createJSONValidator({}, { reportError: () => undefined });
    equal(isJSONValidator(v), true);
  });

  it("returns false for plain objects with the same shape", () => {
    const fake = {
      enforce: () => undefined,
      error: () => undefined,
      changed: () => undefined,
      finish: () => ({ changes: false, errors: false }),
    };
    equal(isJSONValidator(fake), false);
  });

  it("returns false for non-objects", () => {
    equal(isJSONValidator(undefined), false);
    equal(isJSONValidator(null), false);
    equal(isJSONValidator(42), false);
    equal(isJSONValidator("x"), false);
    equal(isJSONValidator([]), false);
  });

  it("recognizes a validator mixed onto a base object", () => {
    const base = { name: "foo" };
    const v = createJSONValidator({}, { reportError: () => undefined }, base);
    equal(isJSONValidator(v), true);
    equal(isJSONValidator(base), true);
  });
});

describe("setDefaultValidationOptions", () => {
  afterEach(() => {
    setDefaultValidationOptions({
      fix: false,
      reportError: console.error,
      reportPrefix: undefined,
    });
  });

  it("default fix flag is applied when options omit fix", () => {
    setDefaultValidationOptions({ fix: true });
    const json: Record<string, JSONValue> = { a: 1 };
    const v = createJSONValidator(json);
    v.enforce("a", 2);
    equal(json.a, 2);
    deepEqual(v.finish(), { changes: true, errors: false });
  });

  it("explicit option overrides default", () => {
    setDefaultValidationOptions({ fix: true });
    const json: Record<string, JSONValue> = { a: 1 };
    const errors: string[] = [];
    const v = createJSONValidator(json, {
      fix: false,
      reportError: (m) => errors.push(m),
    });
    v.enforce("a", 2);
    equal(json.a, 1);
    equal(errors.length, 1);
  });

  it("default reportError is applied when omitted", () => {
    const captured: string[] = [];
    setDefaultValidationOptions({ reportError: (m) => captured.push(m) });
    const json: Record<string, JSONValue> = { a: 1 };
    const v = createJSONValidator(json);
    v.enforce("a", 2);
    equal(captured.length, 1);
  });

  it("default reportPrefix is applied when omitted", () => {
    const captured: string[] = [];
    setDefaultValidationOptions({
      reportError: (m) => captured.push(m),
      reportPrefix: "[default] ",
    });
    const v = createJSONValidator({ a: 1 });
    v.enforce("a", 2);
    ok(captured[0].startsWith("[default] "));
  });
});
