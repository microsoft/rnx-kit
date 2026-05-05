import { deepEqual, equal, ok, throws } from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { createJSONValidator } from "../src/index.ts";
import type { JSONValue } from "../src/types.ts";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lint-json-"));
}

function makeTempJSONFile(json: object): { dir: string; filePath: string } {
  const dir = makeTempDir();
  const filePath = path.join(dir, "out.json");
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
  return { dir, filePath };
}

describe("createJSONValidator: enforce semantics", () => {
  it("enforce is a no-op when the value already matches", () => {
    const json: Record<string, JSONValue> = { name: "foo" };
    const errors: string[] = [];
    const v = createJSONValidator("ignored.json", json, {
      reportError: (m) => errors.push(m),
    });
    equal(typeof v.enforce, "function");
    v.enforce("name", "foo");
    equal(v.finish(), 0);
    deepEqual(errors, []);
  });

  it("non-fix mode reports error and does not mutate", () => {
    const json: Record<string, JSONValue> = { name: "foo" };
    const errors: string[] = [];
    const v = createJSONValidator("ignored.json", json, {
      reportError: (m) => errors.push(m),
    });
    v.enforce("name", "bar");
    deepEqual(json, { name: "foo" });
    equal(v.finish(), 1);
    equal(errors.length, 1);
  });

  it("fix mode mutates and returns 0 from finish", () => {
    const { dir, filePath } = makeTempJSONFile({ name: "foo" });
    try {
      const json: Record<string, JSONValue> = { name: "foo" };
      const v = createJSONValidator(filePath, json, { fix: true });
      v.enforce("name", "bar");
      equal(json.name, "bar");
      equal(v.finish(), 0);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("splits dotted string paths into segments", () => {
    const json: Record<string, JSONValue> = { dependencies: { react: "18" } };
    const { filePath, dir } = makeTempJSONFile(json);
    try {
      const v = createJSONValidator(filePath, json, { fix: true });
      v.enforce("dependencies.react", "19");
      equal((json.dependencies as Record<string, string>).react, "19");
      equal(v.finish(), 0);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("array path lets keys contain dots", () => {
    const json: Record<string, JSONValue> = {};
    const { filePath, dir } = makeTempJSONFile(json);
    try {
      const v = createJSONValidator(filePath, json, { fix: true });
      v.enforce(["a.b", "c"], 1);
      deepEqual(json, { "a.b": { c: 1 } });
      equal(v.finish(), 0);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("creates intermediate objects in fix mode", () => {
    const json: Record<string, JSONValue> = {};
    const { filePath, dir } = makeTempJSONFile(json);
    try {
      const v = createJSONValidator(filePath, json, { fix: true });
      v.enforce(["a", "b", "c"], 1);
      deepEqual(json, { a: { b: { c: 1 } } });
      equal(v.finish(), 0);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("reports error and does NOT create intermediates in non-fix mode", () => {
    const json: Record<string, JSONValue> = {};
    const errors: string[] = [];
    const v = createJSONValidator("ignored.json", json, {
      reportError: (m) => errors.push(m),
    });
    v.enforce(["a", "b", "c"], 1);
    deepEqual(json, {});
    equal(v.finish(), 1);
    equal(errors.length, 1);
  });

  it("undefined value removes property in fix mode", () => {
    const json: Record<string, JSONValue> = { a: { b: 1, c: 2 } };
    const { filePath, dir } = makeTempJSONFile(json);
    try {
      const v = createJSONValidator(filePath, json, { fix: true });
      v.enforce(["a", "b"], undefined);
      deepEqual(json, { a: { c: 2 } });
      equal(v.finish(), 0);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("undefined value reports error in non-fix mode", () => {
    const json: Record<string, JSONValue> = { a: { b: 1 } };
    const errors: string[] = [];
    const v = createJSONValidator("ignored.json", json, {
      reportError: (m) => errors.push(m),
    });
    v.enforce(["a", "b"], undefined);
    deepEqual(json, { a: { b: 1 } });
    equal(v.finish(), 1);
    equal(errors.length, 1);
  });

  it("undefined for missing path is silent no-op", () => {
    const json: Record<string, JSONValue> = {};
    const errors: string[] = [];
    const v = createJSONValidator("ignored.json", json, {
      reportError: (m) => errors.push(m),
    });
    v.enforce(["a", "b"], undefined);
    deepEqual(errors, []);
    equal(v.finish(), 0);
  });

  it("multiple enforce failures collapse into a single tree-formatted report", () => {
    const json: Record<string, JSONValue> = { a: 1, b: 2 };
    const errors: string[] = [];
    const v = createJSONValidator("ignored.json", json, {
      reportError: (m) => errors.push(m),
    });
    v.enforce("a", 1); // no-op
    v.enforce("b", 99); // mismatch -> error
    v.enforce("c", 3); // missing -> error
    equal(v.finish(), 1);
    // reportError is invoked once with the combined tree output
    equal(errors.length, 1);
    ok(errors[0].includes("b"));
    ok(errors[0].includes("c"));
  });

  it("throws on prototype-pollution paths and does not mutate", () => {
    const json: Record<string, JSONValue> = {};
    const v = createJSONValidator("ignored.json", json, { fix: true });
    throws(() => v.enforce("__proto__.polluted", "yes"));
    throws(() => v.enforce(["constructor", "prototype", "x"], 1));
    throws(() => v.enforce(["a", "__proto__"], 1));
    throws(() => v.enforce("__proto__", undefined));
    deepEqual(json, {});
    equal(v.finish(), 0);
  });
});

describe("createJSONValidator: error and finish reporting", () => {
  it("error() flips finish() to 1 and is included in report", () => {
    const errors: string[] = [];
    const v = createJSONValidator(
      "ignored.json",
      {},
      {
        reportError: (m) => errors.push(m),
      }
    );
    v.error("custom error");
    equal(v.finish(), 1);
    equal(errors.length, 1);
    ok(errors[0].includes("custom error"));
  });

  it("uses provided header at the top of the tree", () => {
    const errors: string[] = [];
    const v = createJSONValidator(
      "ignored.json",
      { a: 1 },
      {
        header: "MY-HEADER",
        reportError: (m) => errors.push(m),
      }
    );
    v.enforce("a", 2);
    v.finish();
    ok(
      errors[0].startsWith("MY-HEADER"),
      `expected report to start with header, got: ${errors[0]}`
    );
  });

  it("appends footer as the last row of the tree", () => {
    const errors: string[] = [];
    const v = createJSONValidator(
      "ignored.json",
      { a: 1 },
      {
        footer: "ZZZ-FOOTER",
        reportError: (m) => errors.push(m),
      }
    );
    v.enforce("a", 2);
    v.finish();
    ok(
      errors[0].includes("ZZZ-FOOTER"),
      `expected footer to appear in report, got: ${errors[0]}`
    );
  });

  it("does not invoke reportError when there are no errors", () => {
    const errors: string[] = [];
    const v = createJSONValidator(
      "ignored.json",
      { a: 1 },
      { reportError: (m) => errors.push(m) }
    );
    v.enforce("a", 1); // no-op
    equal(v.finish(), 0);
    equal(errors.length, 0);
  });
});

describe("createJSONValidator: file IO", () => {
  it("writes JSON file in fix mode when changes occurred", () => {
    const { dir, filePath } = makeTempJSONFile({ a: 1 });
    try {
      const v = createJSONValidator(filePath, { a: 1 }, { fix: true });
      v.enforce("a", 2);
      equal(v.finish(), 0);
      const written = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      deepEqual(written, { a: 2 });
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("does not modify file when no changes occurred", () => {
    const { dir, filePath } = makeTempJSONFile({ a: 1 });
    try {
      const v = createJSONValidator(filePath, { a: 1 }, { fix: true });
      v.enforce("a", 1);
      equal(v.finish(), 0);
      const written = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      deepEqual(written, { a: 1 });
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("does not write file when fix is false even with mismatches", () => {
    const { dir, filePath } = makeTempJSONFile({ a: 1 });
    try {
      const errors: string[] = [];
      const v = createJSONValidator(
        filePath,
        { a: 1 },
        { fix: false, reportError: (m) => errors.push(m) }
      );
      v.enforce("a", 2);
      equal(v.finish(), 1);
      const written = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      deepEqual(written, { a: 1 });
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("loads JSON from disk when not provided", () => {
    const { dir, filePath } = makeTempJSONFile({ a: 1, b: "hi" });
    try {
      const errors: string[] = [];
      const v = createJSONValidator(filePath, undefined, {
        reportError: (m) => errors.push(m),
      });
      v.enforce("a", 1); // matches loaded value -> no error
      v.enforce("b", "bye"); // mismatch -> error
      equal(v.finish(), 1);
      equal(errors.length, 1);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});
